const KP = ['nose','left_eye','right_eye','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle']

function get(p, name){ return p.find(k=>k.name===name) || {} }
function angle(a,b,c){ 
  if(!a||!b||!c||a.x==null||b.x==null||c.x==null) return 0
  const v1x=a.x-b.x,v1y=a.y-b.y,v2x=c.x-b.x,v2y=c.y-b.y
  const dot=v1x*v2x+v1y*v2y,m1=Math.hypot(v1x,v1y),m2=Math.hypot(v2x,v2y)
  if(!m1||!m2) return 0
  return Math.acos(Math.min(1,Math.max(-1,dot/(m1*m2))))*180/Math.PI 
}
function rotDeg(a,b){ 
  if(!a||!b||a.x==null||b.x==null) return 0
  return Math.atan2(a.y-b.y, a.x-b.x)*180/Math.PI 
}

export function emptyAnalysis(){ 
  return { 
    frames:[], 
    events:{address:null,top:null,impact:null}, 
    faults:[], 
    summary:{frames:0,fps:0,tempo:{backMs:0,downMs:0,ratio:0}, xFactorDeg:0} 
  } 
}

export function analyzeFrame(prev, pose, tMs){
  const p = pose?.keypoints || []
  if (p.length===0) return prev
  
  const lh=get(p,'left_hip'), rh=get(p,'right_hip'), ls=get(p,'left_shoulder'), rs=get(p,'right_shoulder')
  const lw=get(p,'left_wrist'), rw=get(p,'right_wrist'), lk=get(p,'left_knee'), rk=get(p,'right_knee')
  const la=get(p,'left_ankle'), ra=get(p,'right_ankle'), nose=get(p,'nose')

  const centerHipX=(lh.x+rh.x)/2, centerHipY=(lh.y+rh.y)/2
  const centerShX=(ls.x+rs.x)/2, centerShY=(ls.y+rs.y)/2
  const headX = nose?.x ?? centerShX, headY = nose?.y ?? centerShY
  const leadW = lw?.y!=null ? lw : rw, trailW = rw?.y!=null ? rw : lw

  const hipRot = rotDeg(lh, rh), shRot = rotDeg(ls, rs), xFactor = shRot - hipRot
  const lkAngle = angle(la, lk, lh), rkAngle = angle(ra, rk, rh)
  const spineAng = Math.atan2(centerShX-centerHipX, centerShY-centerHipY) * 180/Math.PI

  const frame = {
    tMs,
    centerHip: {x:centerHipX, y:centerHipY},
    centerSh: {x:centerShX, y:centerShY},
    head: {x:headX, y:headY},
    leadWrist: {x:leadW?.x, y:leadW?.y},
    trailWrist:{x:trailW?.x, y:trailW?.y},
    hipRot, shRot, xFactor,
    lkAngle, rkAngle,
    spineAng
  }
  return phaseDetect(prev, frame)
}

function phaseDetect(prev, f){
  const frames = prev.frames ? [...prev.frames, f] : [f]
  const t = f.tMs, dt = frames.length>1 ? (t - frames.at(-2).tMs) : 0

  let events = prev.events || { address:null, top:null, impact:null }
  
  // Address after ~200ms
  if (!events.address && (t - frames[0].tMs) > 200) {
    events.address = { tMs: t-200, idx: Math.max(0, frames.length-2) }
  }

  // Top: when lead wrist Y velocity flips from up to down and rose enough
  const baseLeadY = Math.min(...frames.slice(0,Math.min(frames.length,12)).map(fr=>fr.leadWrist.y||Infinity))
  const vy = frames.length>1 ? (frames.at(-1).leadWrist.y - frames.at(-2).leadWrist.y) / Math.max(1, dt) : 0
  if (!events.top && frames.length>6) {
    const rose = frames.some(fr => (fr.leadWrist.y||0) < baseLeadY - 15)
    if (rose && vy > 0) events.top = { tMs: t, idx: frames.length-1 }
  }

  // Impact: wrist near hips (local min) after top
  if (events.top && !events.impact && frames.length>8) {
    const hip = f.centerHip
    const d = Math.hypot((f.leadWrist.x-hip.x),(f.leadWrist.y-hip.y))
    const window = frames.slice(-8).map(fr => Math.hypot((fr.leadWrist.x-hip.x),(fr.leadWrist.y-hip.y)))
    if (d === Math.min(...window) && (t - events.top.tMs) > 120) {
      events.impact = { tMs: t, idx: frames.length-1 }
    }
  }

  // summary
  const summary = prev.summary || { frames:0, fps:0, tempo:{backMs:0,downMs:0,ratio:0}, xFactorDeg:0 }
  if (events.address && events.top) summary.tempo.backMs = Math.max(0, events.top.tMs - events.address.tMs)
  if (events.top && events.impact) {
    summary.tempo.downMs = Math.max(0, events.impact.tMs - events.top.tMs)
    summary.tempo.ratio = summary.tempo.backMs && summary.tempo.downMs ? (summary.tempo.backMs / summary.tempo.downMs) : 0
  }
  if (events.top) summary.xFactorDeg = frames[events.top.idx]?.xFactor ?? 0

  // faults analysis
  const faults = []
  
  // Early extension (knees straighten)
  if (events.top) {
    const kTop = frames[events.top.idx], kImp = events.impact ? frames[events.impact.idx] : frames.at(-1)
    if (kTop && kImp) {
      const dK = ((kImp.lkAngle+kImp.rkAngle)/2) - ((kTop.lkAngle+kTop.rkAngle)/2)
      if (dK > 12) faults.push({ 
        title:'Early Extension', 
        severity:'bad', 
        timeMs:kImp.tMs, 
        phase:'Downswing', 
        detail:`Knees straightened ~${Math.round(dK)}° from top → impact.` 
      })
    }
  }
  
  // Loss of posture (spine tilt change)
  if (events.address) {
    const sAddr = frames[events.address.idx]?.spineAng ?? 0
    const sImp = events.impact ? frames[events.impact.idx]?.spineAng ?? sAddr : frames.at(-1).spineAng
    if (Math.abs(sImp - sAddr) > 10) faults.push({ 
      title:'Loss of Posture', 
      severity:'warn', 
      timeMs: events.impact?.tMs ?? frames.at(-1).tMs, 
      phase:'Impact', 
      detail:`Spine tilt changed ~${Math.round(sImp - sAddr)}°.` 
    })
  }
  
  // Over-the-top proxy
  if (events.top && frames.length>events.top.idx+6) {
    const a = frames[events.top.idx], b = frames[Math.min(frames.length-1, events.top.idx+6)]
    const pathAng = Math.atan2(b.leadWrist.y-a.leadWrist.y, b.leadWrist.x-a.leadWrist.x)*180/Math.PI
    const shoulderLine = a.shRot
    if (Math.abs(pathAng - shoulderLine) > 35) faults.push({ 
      title:'Over-the-Top (proxy)', 
      severity:'warn', 
      timeMs:b.tMs, 
      phase:'Downswing', 
      detail:`Lead hand path deviates ~${Math.round(pathAng-shoulderLine)}° vs shoulder line.` 
    })
  }
  
  // X-factor range check
  if (events.top) {
    const xf = summary.xFactorDeg
    if (xf < 15) faults.push({ 
      title:'Limited X-Factor', 
      severity:'warn', 
      timeMs:events.top.tMs, 
      phase:'Top', 
      detail:`Separation only ${Math.round(xf)}° (power leak).` 
    })
    if (xf > 60) faults.push({ 
      title:'Over-torque (X-Factor)', 
      severity:'warn', 
      timeMs:events.top.tMs, 
      phase:'Top', 
      detail:`Separation ~${Math.round(xf)}°; may hurt consistency.` 
    })
  }

  const dedup = {}
  for (const f of faults){ 
    const prevF=dedup[f.title]
    if(!prevF || (prevF.severity==='warn'&&f.severity==='bad')) dedup[f.title]=f 
  }
  
  summary.frames = frames.length
  if (frames.length>10) { 
    const dur = frames.at(-1).tMs - frames.at(0).tMs
    summary.fps = dur>0 ? Math.round((frames.length/(dur/1000))*10)/10 : 0 
  }
  
  return { frames, events, faults:Object.values(dedup), summary }
}