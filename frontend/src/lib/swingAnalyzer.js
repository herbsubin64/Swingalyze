function get(p, name){ return p.find(k=>k.name===name) || {} }
function angle(a,b,c){ if(!a||!b||!c||a.x==null||b.x==null||c.x==null) return 0; const v1x=a.x-b.x,v1y=a.y-b.y,v2x=c.x-b.x,v2y=c.y-b.y; const dot=v1x*v2x+v1y*v2y,m1=Math.hypot(v1x,v1y),m2=Math.hypot(v2x,v2y); if(!m1||!m2) return 0; return Math.acos(Math.min(1,Math.max(-1,dot/(m1*m2))))*180/Math.PI }
function rotDeg(a,b){ if(!a||!b||a.x==null||b.x==null) return 0; return Math.atan2(a.y-b.y, a.x-b.x)*180/Math.PI }

export function emptyAnalysis(){ return { frames:[], events:{address:null,top:null,impact:null}, faults:[], summary:{frames:0,fps:0,tempo:{backMs:0,downMs:0,ratio:0}, xFactorDeg:0} } }

export function analyzeFrame(prev, pose, tMs){
  const p = pose?.keypoints || []
  if (!p.length) return prev
  const lh=get(p,'left_hip'), rh=get(p,'right_hip'), ls=get(p,'left_shoulder'), rs=get(p,'right_shoulder')
  const lw=get(p,'left_wrist'), rw=get(p,'right_wrist'), lk=get(p,'left_knee'), rk=get(p,'right_knee'), la=get(p,'left_ankle'), ra=get(p,'right_ankle'), nose=get(p,'nose')
  const centerHipX=(lh.x+rh.x)/2, centerHipY=(lh.y+rh.y)/2
  const centerShX=(ls.x+rs.x)/2, centerShY=(ls.y+rs.y)/2
  const leadW = lw?.y!=null ? lw : rw
  const hipRot = rotDeg(lh, rh), shRot = rotDeg(ls, rs), xFactor = shRot - hipRot
  const lkAngle = angle(la, lk, lh), rkAngle = angle(ra, rk, rh)
  const spineAng = Math.atan2(centerShX-centerHipX, centerShY-centerHipY) * 180/Math.PI

  const frame = {
    tMs,
    centerHip: {x:centerHipX, y:centerHipY},
    centerSh: {x:centerShX, y:centerShY},
    head: {x:(nose?.x ?? centerShX), y:(nose?.y ?? centerShY)},
    leadWrist: {x:leadW?.x, y:leadW?.y},
    hipRot, shRot, xFactor, lkAngle, rkAngle, spineAng
  }
  return phaseDetect(prev, frame)
}

function phaseDetect(prev, f){
  const frames = prev.frames ? [...prev.frames, f] : [f]
  const t = f.tMs
  let events = prev.events || { address:null, top:null, impact:null }

  if (!events.address && (t - frames[0].tMs) > 200) events.address = { tMs: t-200, idx: Math.max(0, frames.length-2) }

  if (!events.top && frames.length>6){
    const dt = frames.at(-1).tMs - frames.at(-2).tMs
    const vy = dt>0 ? (frames.at(-1).leadWrist.y - frames.at(-2).leadWrist.y)/dt : 0
    const minLeadY = Math.min(...frames.slice(0,Math.min(frames.length,12)).map(fr=>fr.leadWrist.y ?? 9e9))
    const rose = (frames.at(-1).leadWrist.y ?? 0) < (minLeadY - 15)
    if (rose && vy > 0) events.top = { tMs: t, idx: frames.length-1 }
  }

  if (events.top && !events.impact && frames.length>8){
    const hip = f.centerHip
    const d = Math.hypot((f.leadWrist.x-hip.x),(f.leadWrist.y-hip.y))
    const window = frames.slice(-8).map(fr => Math.hypot((fr.leadWrist.x-hip.x),(fr.leadWrist.y-hip.y)))
    if (d === Math.min(...window) && (t - events.top.tMs) > 120) events.impact = { tMs: t, idx: frames.length-1 }
  }

  const summary = prev.summary || { frames:0, fps:0, tempo:{backMs:0,downMs:0,ratio:0}, xFactorDeg:0 }
  if (events.address && events.top) summary.tempo.backMs = Math.max(0, events.top.tMs - events.address.tMs)
  if (events.top && events.impact){
    summary.tempo.downMs = Math.max(0, events.impact.tMs - events.top.tMs)
    summary.tempo.ratio = summary.tempo.backMs && summary.tempo.downMs ? (summary.tempo.backMs / summary.tempo.downMs) : 0
  }
  if (events.top) summary.xFactorDeg = frames[events.top.idx]?.xFactor ?? 0

  const faults = []
  // Early extension
  if (events.top){
    const kTop = frames[events.top.idx], kImp = events.impact ? frames[events.impact.idx] : frames.at(-1)
    if (kTop && kImp){
      const dK = ((kImp.lkAngle+kImp.rkAngle)/2) - ((kTop.lkAngle+kTop.rkAngle)/2)
      if (dK > 12) faults.push(fault('Early Extension','bad',kImp.tMs,'Downswing',`Knees straightened ~${Math.round(dK)}° from top → impact.`,drillsEarlyExtension()))
    }
  }
  // Loss of posture
  if (events.address){
    const sAddr = frames[events.address.idx]?.spineAng ?? 0
    const sImp  = events.impact ? frames[events.impact.idx]?.spineAng ?? sAddr : frames.at(-1).spineAng
    const dS = sImp - sAddr
    if (Math.abs(dS) > 10) faults.push(fault('Loss of Posture','warn',events.impact?.tMs ?? frames.at(-1).tMs,'Impact',`Spine tilt changed ~${Math.round(dS)}°.`,drillsPosture()))
  }
  // OTT proxy
  if (events.top && frames.length>events.top.idx+6){
    const a = frames[events.top.idx], b = frames[Math.min(frames.length-1, events.top.idx+6)]
    const pathAng = Math.atan2(b.leadWrist.y-a.leadWrist.y, b.leadWrist.x-a.leadWrist.x)*180/Math.PI
    const diff = pathAng - a.shRot
    if (Math.abs(diff) > 35) faults.push(fault('Over-the-Top (proxy)','warn',b.tMs,'Downswing',`Lead hand path deviates ~${Math.round(diff)}° vs shoulder line.`,drillsOTT()))
  }
  // X-factor
  if (events.top){
    const xf = summary.xFactorDeg
    if (xf < 15) faults.push(fault('Limited X-Factor','warn',events.top.tMs,'Top',`Separation only ${Math.round(xf)}° (power leak).`,drillsXFactorLow()))
    if (xf > 60) faults.push(fault('Over-torque (X-Factor)','warn',events.top.tMs,'Top',`Separation ~${Math.round(xf)}°; may hurt consistency.`,drillsXFactorHigh()))
  }
  // Head sway proxy
  if (frames.length>6){
    const xs = frames.map(fr=>fr.head.x), sway = Math.max(...xs)-Math.min(...xs)
    if (sway > 30) faults.push(fault('Excess Head Sway','warn',events.top?.tMs ?? frames.at(-1).tMs,'Backswing',`Head moved laterally ~${Math.round(sway)}px; keep it steadier.`,drillsHeadSway()))
  }

  const dedup = {}; for (const f of faults){ const cur=dedup[f.title]; if(!cur || (cur.severity==='warn' && f.severity==='bad')) dedup[f.title]=f }
  summary.frames = frames.length
  if (frames.length>10){ const dur = frames.at(-1).tMs - frames.at(0).tMs; summary.fps = dur>0 ? Math.round((frames.length/(dur/1000))*10)/10 : 0 }
  return { frames, events, faults:Object.values(dedup), summary }
}

function fault(title,severity,timeMs,phase,detail,drills){ return { title, severity, timeMs, phase, detail, drills } }
function drillsEarlyExtension(){ return [
  { name:'Chair/Wall Butt Drill', tip:'Keep your rear against a chair/wall from address through impact.' },
  { name:'Pump Drill (Half Swings)', tip:'Pause at top; make small pumps keeping knee flex, then swing.' }
]}
function drillsPosture(){ return [
  { name:'Club Across Chest Tilt', tip:'Lead shoulder down toward ball; maintain tilt into impact.' },
  { name:'Spine Rod Reference', tip:'Keep distance to "rod" consistent during the motion.' }
]}
function drillsOTT(){ return [
  { name:'Underhand Toss', tip:'From top, toss ball to right field (RH) to feel inside path.' },
  { name:'Headcover Outside Line', tip:'Place headcover outside the ball line; miss it on the downswing.' }
]}
function drillsXFactorLow(){ return [
  { name:'Shoulders Turn, Hips Quiet', tip:'Cross arms; turn shoulders to ~90° with quieter hips.' }
]}
function drillsXFactorHigh(){ return [
  { name:'Shorter Backswing', tip:'Stop when lead arm is parallel; keep tempo smooth.' }
]}
function drillsHeadSway(){ return [
  { name:'Feet Together Swings', tip:'Half swings feet together to promote centered turn.' }
]}