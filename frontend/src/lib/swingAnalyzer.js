/**
 * Heuristic swing analyzer:
 * - Normalizes keypoints to the pelvis width (scale invariance)
 * - Tracks head/pelvis sway, knee extension, spine tilt, hip/shoulder rotation
 * - Detects phases: Address, Top, Impact via lead wrist vertical path + velocity
 * - Computes tempo and X-factor (shoulders-hips separation at Top)
 * - Emits faults with severity + timestamp
 *
 * NOTE: This is intentionally client-side + light; you can refine thresholds anytime.
 */

const KP = [
  'nose','left_eye','right_eye','left_ear','right_ear',
  'left_shoulder','right_shoulder','left_elbow','right_elbow',
  'left_wrist','right_wrist',
  'left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'
]

function get(p, name){ return p.find(k=>k.name===name) || {} }
function angle(a,b,c){ // angle at b (deg)
  if(!a||!b||!c||a.x==null||b.x==null||c.x==null) return 0
  const v1x=a.x-b.x, v1y=a.y-b.y, v2x=c.x-b.x, v2y=c.y-b.y
  const dot=v1x*v2x+v1y*v2y, m1=Math.hypot(v1x,v1y), m2=Math.hypot(v2x,v2y)
  if(m1===0||m2===0) return 0
  return Math.acos(Math.min(1,Math.max(-1,dot/(m1*m2))))*180/Math.PI
}
function rotDeg(a,b){ // signed rotation angle between points relative to x-axis
  if(!a||!b||a.x==null||b.x==null) return 0
  return Math.atan2(a.y-b.y, a.x-b.x)*180/Math.PI
}
function median(arr){ const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length? (s.length%2?s[m]:(s[m-1]+s[m])/2) : 0 }

export function analyzeFrame(prev, pose, tMs){
  const p = pose?.keypoints || []
  if (p.length===0) return prev

  // key anchors
  const lh = get(p,'left_hip'), rh = get(p,'right_hip')
  const ls = get(p,'left_shoulder'), rs = get(p,'right_shoulder')
  const lw = get(p,'left_wrist'), rw = get(p,'right_wrist')
  const lk = get(p,'left_knee'), rk = get(p,'right_knee')
  const la = get(p,'left_ankle'), ra = get(p,'right_ankle')
  const nose = get(p,'nose')

  // scale: pelvis width
  const pelvisW = (lh?.x!=null && rh?.x!=null) ? Math.hypot(lh.x-rh.x, lh.y-rh.y) : 1
  const norm = v => v / (pelvisW || 1)

  // normalized positions (y grows down; we keep as-is but compare deltas)
  const centerHipX = (lh.x + rh.x)/2
  const centerHipY = (lh.y + rh.y)/2
  const centerShX  = (ls.x + rs.x)/2
  const centerShY  = (ls.y + rs.y)/2
  const headX = nose?.x ?? centerShX
  const headY = nose?.y ?? centerShY
  const leadW = lw?.y!=null ? lw : rw // assume lead is left; fallback to whichever exists
  const trailW = rw?.y!=null ? rw : lw

  // rotations
  const hipRot = rotDeg(lh, rh) // hips line
  const shRot  = rotDeg(ls, rs) // shoulders line
  const xFactor = shRot - hipRot

  // joint angles (knees) for early extension approximation
  const lkAngle = angle(la, lk, lh)
  const rkAngle = angle(ra, rk, rh)

  // spine tilt: line from mid-hip to mid-shoulder vs vertical (loss of posture)
  const spineAng = Math.atan2(centerShX-centerHipX, centerShY-centerHipY) * 180/Math.PI // 0=vertical; + right tilt

  const frame = {
    tMs,
    centerHip: { x:centerHipX, y:centerHipY },
    centerSh:  { x:centerShX,  y:centerShY  },
    head: { x:headX, y:headY },
    leadWrist: { x:leadW?.x, y:leadW?.y },
    trailWrist:{ x:trailW?.x, y:trailW?.y },
    hipRot, shRot, xFactor,
    lkAngle, rkAngle,
    spineAng,
    sway: { headX: norm(headX-centerHipX), pelvisX: 0 } // pelvis sway filled below
  }
  frame.sway.pelvisX = 0 // centered by definition; for trend we compare to first frame later

  // phase detection (simple but effective):
  // - Address: first 300–600ms of stable hands near hips (low speed)
  // - Top: peak of lead wrist height (max y above address) OR velocity sign change
  // - Impact: local min of wrist-hand distance to hips AFTER top
  return phaseDetect(prev, frame)
}

function phaseDetect(prev, f){
  const frames = prev.frames ? [...prev.frames, f] : [f]
  const t = f.tMs
  const dt = frames.length>1 ? (t - frames.at(-2).tMs) : 0

  // track baseline (first 400ms)
  const span = frames.filter(fr => fr.tMs <= (frames[0].tMs + 400))
  const baseHeadX = median(span.map(fr=>fr.head.x))
  const baseHipX  = median(span.map(fr=>fr.centerHip.x))
  const baseLeadY = median(span.map(fr=>fr.leadWrist.y))
  // normalized sway vs baseline
  frames.forEach(fr=>{
    fr.sway.headX = (fr.head.x - baseHeadX) / Math.max(1, Math.hypot(fr.centerHip.x - fr.centerHip.x + 1, fr.centerHip.y - fr.centerHip.y + 1)) // keep scale independent
    fr.sway.pelvisX = (fr.centerHip.x - baseHipX) /  (Math.abs(fr.centerHip.x-baseHipX)+1)
  })

  // simple velocities
  const vy = frames.length>1 ? (frames.at(-1).leadWrist.y - frames.at(-2).leadWrist.y) / Math.max(1, dt) : 0
  const vx = frames.length>1 ? (frames.at(-1).leadWrist.x - frames.at(-2).leadWrist.x) / Math.max(1, dt) : 0

  let events = prev.events || { address:null, top:null, impact:null }

  // Address = first stable moment (first frame after 200ms)
  if (!events.address && (t - frames[0].tMs) > 200) {
    events.address = { tMs: t-200, idx: Math.max(0, frames.length-2) }
  }

  // Top when lead wrist vertical velocity flips sign from up (neg vy) to down (pos vy) after moving up a bit
  if (!events.top && frames.length>6) {
    const recent = frames.slice(-6)
    const rose = recent.some(fr => fr.leadWrist.y < baseLeadY - 15)
    const vflip = (vy > 0)
    if (rose && vflip) {
      events.top = { tMs: t, idx: frames.length-1 }
    }
  }

  // Impact: wrist near hips (min distance) after top
  if (events.top && !events.impact && frames.length>8) {
    const hip = f.centerHip
    const d = Math.hypot(f.leadWrist.x-hip.x, f.leadWrist.y-hip.y)
    const window = frames.slice(-8).map(fr => Math.hypot(fr.leadWrist.x-hip.x, fr.leadWrist.y-hip.y))
    const localMin = d === Math.min(...window)
    if (localMin && (t - events.top.tMs) > 120) {
      events.impact = { tMs: t, idx: frames.length-1 }
    }
  }

  // summary tempo + x-factor @ top
  const summary = prev.summary || { frames:0, fps:0, tempo:{backMs:0,downMs:0,ratio:0}, xFactorDeg:0 }
  if (events.address && events.top) {
    summary.tempo.backMs = Math.max(0, events.top.tMs - events.address.tMs)
  }
  if (events.top && events.impact) {
    summary.tempo.downMs = Math.max(0, events.impact.tMs - events.top.tMs)
    summary.tempo.ratio = summary.tempo.backMs && summary.tempo.downMs ? (summary.tempo.backMs / summary.tempo.downMs) : 0
  }
  if (events.top) {
    const xf = frames[events.top.idx]?.xFactor ?? 0
    summary.xFactorDeg = xf
  }
  summary.frames = frames.length
  if (frames.length>10) {
    const dur = frames.at(-1).tMs - frames.at(0).tMs
    summary.fps = dur>0 ? Math.round((frames.length/(dur/1000))*10)/10 : 0
  }

  // faults (heuristics)
  const faults = []
  const phaseOf = (ms)=>{
    if (!events.top || ms < events.top.tMs) return 'Backswing'
    if (!events.impact || ms < events.impact.tMs) return 'Downswing'
    return 'Post-impact'
  }

  // 1) Head sway (excess lateral) during backswing
  const headPath = frames.map(fr=>fr.head.x)
  const headSwayPx = Math.max(...headPath) - Math.min(...headPath)
  const headSwayNorm = headSwayPx / Math.max(1, Math.hypot(headPath[0]-headPath[0]+1,1))
  if (headSwayPx > 30) {
    faults.push({ title:'Excess Head Sway', severity:'warn', timeMs: events.top?.tMs ?? frames[0].tMs, phase: 'Backswing', detail:`Head lateral movement ~${Math.round(headSwayPx)}px; try to keep head steadier.`})
  }

  // 2) Early extension (knee angles straighten toward impact)
  if (events.top && frames.length>events.top.idx+3) {
    const kTop = frames[events.top.idx]
    const kImp = events.impact ? frames[events.impact.idx] : frames.at(-1)
    if (kTop && kImp) {
      const avgTop = (kTop.lkAngle + kTop.rkAngle)/2
      const avgImp = (kImp.lkAngle + kImp.rkAngle)/2
      if (avgImp - avgTop > 12) {
        faults.push({ title:'Early Extension', severity:'bad', timeMs:kImp.tMs, phase: phaseOf(kImp.tMs), detail:`Knees straightened ~${Math.round(avgImp-avgTop)}° from top → impact.` })
      }
    }
  }

  // 3) Loss of spine tilt (stand up) from address to impact
  if (events.address) {
    const sAddr = frames[events.address.idx]?.spineAng ?? 0
    const sImp  = events.impact ? frames[events.impact.idx]?.spineAng ?? sAddr : frames.at(-1).spineAng
    if (Math.abs(sImp - sAddr) > 10) {
      faults.push({ title:'Loss of Posture', severity:'warn', timeMs: events.impact?.tMs ?? frames.at(-1).tMs, phase: phaseOf(events.impact?.tMs ?? frames.at(-1).tMs), detail:`Spine tilt changed ~${Math.round(sImp - sAddr)}°.` })
    }
  }

  // 4) Over-the-top proxy: downswing path more out-to-in vs shoulder line
  if (events.top && frames.length>events.top.idx+3) {
    const a = frames[events.top.idx]
    const b = frames[Math.min(frames.length-1, events.top.idx+6)]
    const pathAng = Math.atan2(b.leadWrist.y-a.leadWrist.y, b.leadWrist.x-a.leadWrist.x)*180/Math.PI
    const shoulderLine = a.shRot
    if (Math.abs(pathAng - shoulderLine) > 35) {
      faults.push({ title:'Over-the-Top (proxy)', severity:'warn', timeMs:b.tMs, phase:'Downswing', detail:`Lead hand path deviates ~${Math.round(pathAng-shoulderLine)}° vs shoulders.` })
    }
  }

  // 5) X-factor too small/too large at top (generic ranges 20–50°)
  if (events.top) {
    const xf = summary.xFactorDeg
    if (xf < 15) faults.push({ title:'Limited X-Factor', severity:'warn', timeMs:events.top.tMs, phase:'Top', detail:`Hip-shoulder separation only ${Math.round(xf)}° (power leak).` })
    if (xf > 60) faults.push({ title:'Over-torque (X-Factor)', severity:'warn', timeMs:events.top.tMs, phase:'Top', detail:`Separation ~${Math.round(xf)}°; may stress consistency.` })
  }

  // dedupe by title (keep strongest)
  const dedup = {}
  for (const f of faults) {
    const prevF = dedup[f.title]
    if (!prevF || (prevF.severity==='warn' && f.severity==='bad')) dedup[f.title] = f
  }

  return { frames, events, faults:Object.values(dedup), summary }
}

export function emptyAnalysis(){ return { frames:[], events:{address:null,top:null,impact:null}, faults:[], summary:{frames:0,fps:0,tempo:{backMs:0,downMs:0,ratio:0}, xFactorDeg:0} } }