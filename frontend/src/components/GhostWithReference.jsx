/* Enhanced: pushes frames into analyzer + bus. Keeps your existing upload/camera/ref controls & ghost overlays. */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as poseDetection from '@tensorflow-models/pose-detection'
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

export default function GhostWithReference(){
  const userVideo=useRef(null), userCanvas=useRef(null)
  const refVideo=useRef(null), refCanvas=useRef(null)
  const detectorRef=useRef(null), refDetectorRef=useRef(null)
  const rafRef=useRef(0)
  const [busy, setBusy] = useState(true)
  const [userColor, setUserColor] = useState('#00ff80')
  const [refColor, setRefColor] = useState('#ff7b7b')
  const [opacity, setOpacity] = useState(0.9)
  const [refOpacity, setRefOpacity] = useState(0.65)
  const [refUrl, setRefUrl] = useState('/pro.mp4')
  const [analysis, setAnalysis] = useState(emptyAnalysis())
  const { setState } = useInsightsBus()

  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      setBusy(true)
      const d=await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,{modelType:'SinglePose.Lightning'})
      const d2=await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,{modelType:'SinglePose.Lightning'})
      if (!cancelled){ detectorRef.current=d; refDetectorRef.current=d2; setBusy(false) }
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
    const v=userVideo.current, c=userCanvas.current, d=detectorRef.current
    const rv=refVideo.current, rc=refCanvas.current, rd=refDetectorRef.current
    if(!v||!c||!d||v.readyState<2){ rafRef.current=requestAnimationFrame(loop); return }
    fit(v,c); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height)

    let userPose=null
    try{ const poses=await d.estimatePoses(v); userPose=poses?.[0] }catch{}
    if(userPose){ drawSkeleton(ctx,c,userPose.keypoints,userColor,opacity) }

    if(rv&&rc&&rd&&rv.readyState>=2){
      fit(rv,rc); const rctx=rc.getContext('2d'); rctx.clearRect(0,0,rc.width,rc.height)
      try{ const poses=await rd.estimatePoses(rv); const refPose=poses?.[0]; if(refPose) drawSkeleton(rctx,rc,refPose.keypoints,refColor,refOpacity) }catch{}
    }

    // Push analysis (every ~5 frames for UI smoothness)
    if (userPose){
      const tMs = Math.round(v.currentTime*1000)
      const next = analyzeFrame(analysis, userPose, tMs)
      setAnalysis(next)
      if (next.frames.length % 5 === 0) setState(next)
    }

    rafRef.current=requestAnimationFrame(loop)
  },[userColor, refColor, opacity, refOpacity, analysis, setState])

  useEffect(()=>{
    const v=userVideo.current
    if(!v) return
    const onPlay=()=>{ cancelAnimationFrame(rafRef.current); rafRef.current=requestAnimationFrame(loop) }
    const onPause=()=>cancelAnimationFrame(rafRef.current)
    v.addEventListener('play',onPlay); v.addEventListener('pause',onPause); v.addEventListener('ended',onPause)
    return ()=>{ v.removeEventListener('play',onPlay); v.removeEventListener('pause',onPause); v.removeEventListener('ended',onPause); cancelAnimationFrame(rafRef.current) }
  },[loop])

  const onFile=e=>{ const f=e.target.files?.[0]; if(!f) return; const url=URL.createObjectURL(f); const v=userVideo.current; v.srcObject=null; v.src=url; v.muted=true; v.playsInline=true; setAnalysis(emptyAnalysis()); v.onloadedmetadata=()=>v.play().catch(()=>{}) }
  const startCamera=async()=>{ const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false}); const v=userVideo.current; v.src=''; v.srcObject=s; v.muted=true; v.playsInline=true; setAnalysis(emptyAnalysis()); v.play().catch(()=>{}) }
  const loadRef=()=>{ const rv=refVideo.current; rv.src=refUrl; rv.crossOrigin='anonymous'; rv.loop=true; rv.muted=true; rv.playsInline=true; rv.play().catch(()=>{}) }

  return (
    <div>
      <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:10}}>
        <label style={labelStyle}>Upload<input type="file" accept="video/*" onChange={onFile} style={{display:'none'}}/></label>
        <button style={btnStyle} onClick={startCamera} disabled={busy}>Camera</button>
        <span style={{fontSize:12, opacity:.75}}>{busy?'Loading model…':'Model ready'}</span>
      </div>

      <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', marginBottom:10}}>
        <label style={{...hintRow}}>User Color <input type="color" value={userColor} onChange={e=>setUserColor(e.target.value)}/></label>
        <label style={{...hintRow}}>User Opacity <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(parseFloat(e.target.value))}/></label>
        <label style={{...hintRow}}>Ref Color <input type="color" value={refColor} onChange={e=>setRefColor(e.target.value)}/></label>
        <label style={{...hintRow}}>Ref Opacity <input type="range" min="0.1" max="1" step="0.05" value={refOpacity} onChange={e=>setRefOpacity(parseFloat(e.target.value))}/></label>
      </div>

      <div style={{display:'flex', gap:10, alignItems:'center', marginBottom:10, flexWrap:'wrap'}}>
        <input
          placeholder="Reference video URL or /pro.mp4"
          value={refUrl} onChange={e=>setRefUrl(e.target.value)}
          style={{flex:'1 1 300px', padding:8, borderRadius:10, border:'1px solid #2a3442', background:'#0f1620', color:'#dfe9f7'}}
        />
        <button style={btnStyle} onClick={loadRef}>Load Ref</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        <div className="stage" style={stageStyle}>
          <video ref={userVideo} controls playsInline muted style={vidStyle}/>
          <canvas ref={userCanvas} style={canStyle}/>
        </div>
        <div className="stage" style={stageStyle}>
          <video ref={refVideo} controls playsInline muted style={vidStyle}/>
          <canvas ref={refCanvas} style={canStyle}/>
        </div>
      </div>
    </div>
  )
}

const btnStyle = { padding:'10px 14px', borderRadius:10, border:'1px solid #2a3442', background:'#16202c', color:'#e9eef4', cursor:'pointer' }
const labelStyle = { padding:'10px 14px', borderRadius:10, border:'1px solid #2a3442', background:'#101a26', color:'#e9eef4', cursor:'pointer' }
const hintRow = { display:'inline-flex', alignItems:'center', gap:8, fontSize:12, opacity:.85 }
const stageStyle = { position:'relative', width:'100%', aspectRatio:'16/9', background:'#000', border:'1px solid #1b2330', borderRadius:12, overflow:'hidden', boxShadow:'0 8px 30px rgba(0,0,0,.35)' }
const vidStyle = { position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain' }
const canStyle = { position:'absolute', inset:0, width:'100%', height:'100%' }