import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as poseDetection from '@tensorflow-models/pose-detection'
import { initTF } from '../lib/tf-init.js'
import { useInsightsBus } from '../lib/insightsBus.js'
import { analyzeFrame, emptyAnalysis } from '../lib/swingAnalyzer.js'

const EDGES = [
  ['left_eye','right_eye'], ['nose','left_eye'], ['nose','right_eye'],
  ['left_shoulder','right_shoulder'],
  ['left_shoulder','left_elbow'], ['left_elbow','left_wrist'],
  ['right_shoulder','right_elbow'], ['right_elbow','right_wrist'],
  ['left_shoulder','left_hip'], ['right_shoulder','right_hip'],
  ['left_hip','right_hip'],
  ['left_hip','left_knee'], ['left_knee','left_ankle'],
  ['right_hip','right_knee'], ['right_knee','right_ankle']
]

export default function OverlayGreenside(){
  const videoRef = useRef(null)
  const refVideoRef = useRef(null) // hidden reference
  const canvasRef = useRef(null)
  const detRef = useRef(null)
  const refDetRef = useRef(null)
  const rafRef = useRef(0)

  const [backend, setBackend] = useState('')
  const [busy, setBusy] = useState(true)
  const [userColor, setUserColor] = useState('#00ff80')
  const [refColor, setRefColor] = useState('#ff7b7b')
  const [opacity, setOpacity] = useState(0.9)
  const [refOpacity, setRefOpacity] = useState(0.6)
  const [mirror, setMirror] = useState(false)
  const [refUrl, setRefUrl] = useState('/pro.mp4')
  const [showRef, setShowRef] = useState(true)
  const [timeOffsetMs, setTimeOffsetMs] = useState(0)
  const [timeScale, setTimeScale] = useState(1)

  const [analysis, setAnalysis] = useState(emptyAnalysis())
  const { setState } = useInsightsBus()

  // init TF + detectors
  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      const b = await initTF('webgl').catch(()=>initTF('wasm'))
      if (cancelled) return
      setBackend(b||'')
      setBusy(true)
      const d = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,{modelType:'lightning'})
      const d2= await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,{modelType:'lightning'})
      if (cancelled) return
      detRef.current = d
      refDetRef.current = d2
      setBusy(false)
    })()
    return ()=>{ cancelled=true }
  },[])

  const fit = useCallback(()=>{
    const v=videoRef.current, c=canvasRef.current
    if(!v||!c||!v.videoWidth||!v.videoHeight) return
    if(c.width!==v.videoWidth||c.height!==v.videoHeight){ c.width=v.videoWidth; c.height=v.videoHeight }
  },[])

  const drawSkeleton=(ctx,c,kp,colorStr,alpha)=>{
    ctx.lineWidth=Math.max(3,c.width/640*4)
    ctx.strokeStyle=colorStr
    ctx.globalAlpha=alpha
    EDGES.forEach(([a,b])=>{
      const p1=kp.find(k=>k.name===a), p2=kp.find(k=>k.name===b)
      if(p1?.score>0.35 && p2?.score>0.35){ 
        ctx.beginPath(); 
        ctx.moveTo(p1.x,p1.y); 
        ctx.lineTo(p2.x,p2.y); 
        ctx.stroke() 
      }
    })
    // Draw key points
    ctx.fillStyle=colorStr
    kp.forEach(point=>{
      if(point.score>0.5){
        ctx.beginPath()
        ctx.arc(point.x, point.y, Math.max(2,c.width/640*3), 0, 2*Math.PI)
        ctx.fill()
      }
    })
    ctx.globalAlpha=1
  }

  const loop = useCallback(async ()=>{
    const v=videoRef.current, c=canvasRef.current, d=detRef.current
    if(!v||!c||!d||v.readyState<2){ rafRef.current=requestAnimationFrame(loop); return }
    fit()
    const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height)
    if (mirror){ ctx.save(); ctx.translate(c.width,0); ctx.scale(-1,1) }

    // user pose
    let pose=null
    try{ const poses=await d.estimatePoses(v,{flipHorizontal:mirror}); pose=poses?.[0] }catch{}
    if (pose) drawSkeleton(ctx,c,pose.keypoints,userColor,opacity)

    // reference ghost
    if (showRef && refDetRef.current && refVideoRef.current?.readyState>=2){
      const rv = refVideoRef.current
      const tUser = v.currentTime*1000
      const target = Math.max(0, Math.min(rv.duration*1000 - 30, (tUser * timeScale) + timeOffsetMs))
      if (Math.abs(rv.currentTime*1000 - target) > 40) rv.currentTime = target/1000 // soft sync
      try{ const r=await refDetRef.current.estimatePoses(rv,{flipHorizontal:false}); if(r?.[0]) drawSkeleton(ctx,c,r[0].keypoints,refColor,refOpacity) }catch{}
    }

    // analysis push
    if (pose){
      const tMs = Math.round(v.currentTime*1000)
      const next = analyzeFrame(analysis, pose, tMs)
      setAnalysis(next)
      if (next.frames.length % 3 === 0) setState(next) // Update insights every 3 frames
    }

    if (mirror) ctx.restore()
    rafRef.current = requestAnimationFrame(loop)
  },[fit, mirror, userColor, opacity, refColor, refOpacity, showRef, timeOffsetMs, timeScale, analysis, setState])

  useEffect(()=>{
    const v=videoRef.current
    if(!v) return
    const onPlay=()=>{ cancelAnimationFrame(rafRef.current); rafRef.current=requestAnimationFrame(loop) }
    const onPause=()=>cancelAnimationFrame(rafRef.current)
    v.addEventListener('play',onPlay); v.addEventListener('pause',onPause); v.addEventListener('ended',onPause)
    return ()=>{ v.removeEventListener('play',onPlay); v.removeEventListener('pause',onPause); v.removeEventListener('ended',onPause); cancelAnimationFrame(rafRef.current) }
  },[loop])

  const onFile = e => {
    const f = e.target.files?.[0]; if(!f) return
    const url = URL.createObjectURL(f)
    const v = videoRef.current
    v.srcObject = null; v.src = url; v.muted = true; v.playsInline = true
    setAnalysis(emptyAnalysis())
    v.onloadedmetadata = () => v.play().catch(()=>{})
  }
  const startCamera = async ()=>{
    const s = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false })
    const v = videoRef.current
    v.src=''; v.srcObject=s; v.muted=true; v.playsInline=true
    setAnalysis(emptyAnalysis())
    await v.play().catch(()=>{})
  }
  const loadReference = ()=>{
    const rv = refVideoRef.current
    rv.src = refUrl
    rv.crossOrigin = 'anonymous'
    rv.loop = true
    rv.muted = true
    rv.playsInline = true
    rv.play().catch(()=>{}) // ok if blocked
  }

  return (
    <div>
      <div className="row" style={{marginBottom:10}}>
        <label className="label">📁 Upload Video<input type="file" accept="video/*" onChange={onFile} style={{display:'none'}}/></label>
        <button className="btn" onClick={startCamera} disabled={busy}>📹 Live Camera</button>
        <label className="row hint"><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)}/> 🪞 Mirror</label>
        <span className="hint">{busy ? '🔄 Loading AI model…' : `✅ AI Ready (${backend})`}</span>
      </div>

      <div className="row" style={{marginBottom:8}}>
        <label className="row hint">User Color <input type="color" value={userColor} onChange={e=>setUserColor(e.target.value)}/></label>
        <label className="row hint">User Opacity <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(parseFloat(e.target.value))}/></label>
        <label className="row hint"><input type="checkbox" checked={showRef} onChange={e=>setShowRef(e.target.checked)}/> 👻 Ghost Overlay</label>
        <label className="row hint">Ghost Color <input type="color" value={refColor} onChange={e=>setRefColor(e.target.value)}/></label>
        <label className="row hint">Ghost Opacity <input type="range" min="0.1" max="1" step="0.05" value={refOpacity} onChange={e=>setRefOpacity(parseFloat(e.target.value))}/></label>
      </div>

      <div className="row" style={{marginBottom:10}}>
        <input style={{flex:'1 1 360px',padding:10,borderRadius:10,border:'1px solid #2a3442',background:'#0f1620',color:'#dfe9f7'}}
               placeholder="Reference swing video URL (https://...) or /pro.mp4"
               value={refUrl} onChange={e=>setRefUrl(e.target.value)} />
        <button className="btn" onClick={loadReference}>Load Ghost</button>
        <label className="row hint">Sync <input type="range" min="-1500" max="1500" step="50" value={timeOffsetMs} onChange={e=>setTimeOffsetMs(parseInt(e.target.value))}/><span className="hint">{timeOffsetMs}ms</span></label>
        <label className="row hint">Speed <input type="range" min="0.5" max="1.5" step="0.05" value={timeScale} onChange={e=>setTimeScale(parseFloat(e.target.value))}/><span className="hint">{timeScale.toFixed(2)}×</span></label>
      </div>

      <div className="stage">
        <video ref={videoRef} controls playsInline muted />
        <canvas ref={canvasRef} />
        <video ref={refVideoRef} style={{display:'none'}} playsInline muted />
      </div>
    </div>
  )
}