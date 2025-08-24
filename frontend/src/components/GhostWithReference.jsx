import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as poseDetection from '@tensorflow-models/pose-detection'
import { initTF } from '../lib/tf-init.js'
import DiagnosticsHUD from './DiagnosticsHUD.jsx'

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

export default function GhostWithReference(){
  const userVideo=useRef(null), userCanvas=useRef(null)
  const refVideo=useRef(null), refCanvas=useRef(null)
  const detUser=useRef(null), detRef=useRef(null)
  const rafRef=useRef(0)
  const [status,setStatus]=useState('Initializing…')
  const [backend,setBackend]=useState('')
  const [fps,setFps]=useState(0)
  const [poseFps,setPoseFps]=useState(0)

  // UI
  const [userColor,setUserColor]=useState('#00ff80')
  const [refColor,setRefColor]=useState('#ff7b7b')
  const [opacity,setOpacity]=useState(0.9)
  const [refOpacity,setRefOpacity]=useState(0.65)
  const [refUrl,setRefUrl]=useState('/pro.mp4')

  // Init TF + detectors (with fallback)
  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      try{
        setStatus('Selecting TF backend…')
        const b = await initTF({ prefer:'webgl' })
        if (cancelled) return
        setBackend(b)
        setStatus('Loading MoveNet (user/ref)…')
        const d1 = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,{modelType:'SinglePose.Lightning'})
        const d2 = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,{modelType:'SinglePose.Lightning'})
        if (cancelled) return
        detUser.current = d1
        detRef.current = d2
        setStatus('Model ready ✓')
      } catch (e){
        console.error(e)
        setStatus('TF init failed — see console')
      }
    })()
    return ()=>{ cancelled=true }
  },[])

  const fit=(v,c)=>{ if(!v||!c||!v.videoWidth||!v.videoHeight) return; if(c.width!==v.videoWidth||c.height!==v.videoHeight){ c.width=v.videoWidth; c.height=v.videoHeight } }

  const drawSkeleton=(ctx,c,kp,color,alpha)=>{
    ctx.lineWidth=Math.max(2,c.width/640*3); ctx.strokeStyle=color; ctx.globalAlpha=alpha
    EDGES.forEach(([a,b])=>{
      const p1=kp.find(k=>k.name===a), p2=kp.find(k=>k.name===b)
      if(p1?.score>0.35 && p2?.score>0.35){ ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke() }
    })
    ctx.globalAlpha=1
  }

  const loop=useCallback(async()=>{
    const t0=performance.now()
    const v=userVideo.current, c=userCanvas.current, d=detUser.current
    const rv=refVideo.current, rc=refCanvas.current, dr=detRef.current
    if(!v||!c||!d||v.readyState<2){ rafRef.current=requestAnimationFrame(loop); return }
    fit(v,c); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height)

    let p0=null, p1=null
    try{ const poses=await d.estimatePoses(v); p0=poses?.[0] }catch(e){ console.warn('user estimatePoses',e); setStatus('Pose failed (user)') }
    if(p0){ drawSkeleton(ctx,c,p0.keypoints,userColor,opacity) }

    if(rv&&rc&&dr&&rv.readyState>=2){
      fit(rv,rc); const rctx=rc.getContext('2d'); rctx.clearRect(0,0,rc.width,rc.height)
      try{ const poses=await dr.estimatePoses(rv); p1=poses?.[0] }catch(e){ console.warn('ref estimatePoses',e) }
      if(p1){ drawSkeleton(rctx,rc,p1.keypoints,refColor,refOpacity) }
    }

    // update rates
    const t1=performance.now()
    setFps(prev=>0.9*prev + 0.1*(1000/(t1-t0)))
    const hadPose = (p0||p1) ? 1 : 0
    setPoseFps(prev=>0.9*prev + 0.1*(hadPose ? (1000/(t1-t0)) : 0))

    rafRef.current=requestAnimationFrame(loop)
  },[userColor,refColor,opacity,refOpacity])

  useEffect(()=>{
    const v=userVideo.current
    if(!v) return
    const onPlay=()=>{ cancelAnimationFrame(rafRef.current); setStatus('Analyzing…'); rafRef.current=requestAnimationFrame(loop) }
    const onPause=()=>{ cancelAnimationFrame(rafRef.current); setStatus('Paused') }
    v.addEventListener('play',onPlay); v.addEventListener('pause',onPause); v.addEventListener('ended',onPause)
    return ()=>{ v.removeEventListener('play',onPlay); v.removeEventListener('pause',onPause); v.removeEventListener('ended',onPause); cancelAnimationFrame(rafRef.current) }
  },[loop])

  const onFile=e=>{
    const f=e.target.files?.[0]; if(!f) return
    const url=URL.createObjectURL(f)
    const v=userVideo.current; v.srcObject=null; v.src=url; v.muted=true; v.playsInline=true
    v.onloadedmetadata=()=>v.play().catch(()=>setStatus('Press ▶ to play'))
  }
  const startCamera=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false})
      const v=userVideo.current; v.src=''; v.srcObject=s; v.muted=true; v.playsInline=true; await v.play()
    }catch(e){ console.error('camera error',e); setStatus('Allow camera permissions') }
  }
  const loadRef=()=>{
    const rv=refVideo.current; if(!rv) return
    rv.src=refUrl; rv.crossOrigin='anonymous'; rv.loop=true; rv.muted=true; rv.playsInline=true
    rv.play().catch(()=>{}) // ok if blocked; we still can seek/grab frames
  }

  return (
    <div>
      <div className="row" style={{marginBottom:10}}>
        <label className="label">Upload<input type="file" accept="video/*" onChange={onFile} style={{display:'none'}}/></label>
        <button className="btn" onClick={startCamera}>Camera</button>
        <span className="hint">{status}</span>
      </div>
      <div className="row" style={{marginBottom:10}}>
        <label className="row hint">User Color <input type="color" value={userColor} onChange={e=>setUserColor(e.target.value)}/></label>
        <label className="row hint">User Opacity <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(parseFloat(e.target.value))}/></label>
        <label className="row hint">Ref Color <input type="color" value={refColor} onChange={e=>setRefColor(e.target.value)}/></label>
        <label className="row hint">Ref Opacity <input type="range" min="0.1" max="1" step="0.05" value={refOpacity} onChange={e=>setRefOpacity(parseFloat(e.target.value))}/></label>
      </div>
      <div className="row" style={{marginBottom:10}}>
        <input style={{flex:'1 1 300px',padding:'8px',borderRadius:10,border:'1px solid #2a3442',background:'#0f1620',color:'#dfe9f7'}}
               placeholder="Reference video URL or /pro.mp4"
               value={refUrl} onChange={e=>setRefUrl(e.target.value)} />
        <button className="btn" onClick={loadRef}>Load Ref</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        <div className="stage"><video ref={userVideo} controls playsInline muted/><canvas ref={userCanvas}/></div>
        <div className="stage"><video ref={refVideo} controls playsInline muted/><canvas ref={refCanvas}/></div>
      </div>
      <DiagnosticsHUD status={status} fps={fps} poseFps={poseFps} backend={backend}/>
    </div>
  )
}