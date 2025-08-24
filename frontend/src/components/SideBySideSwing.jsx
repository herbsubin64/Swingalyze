import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as poseDetection from '@tensorflow-models/pose-detection'
import { initTF } from '../lib/tf-init.js'
import { useInsightsBus } from '../lib/insightsBus.js'
import { analyzeFrame, emptyAnalysis } from '../lib/swingAnalyzer.js'

const EDGES = [
  ['left_eye','right_eye'],['nose','left_eye'],['nose','right_eye'],
  ['left_shoulder','right_shoulder'],
  ['left_shoulder','left_elbow'],['left_elbow','left_wrist'],
  ['right_shoulder','right_elbow'],['right_elbow','right_wrist'],
  ['left_shoulder','left_hip'],['right_shoulder','right_hip'],
  ['left_hip','right_hip'],
  ['left_hip','left_knee'],['left_knee','left_ankle'],
  ['right_hip','right_knee'],['right_knee','right_ankle']
]

function drawSkeleton(ctx,c,kp,color,alpha){
  ctx.lineWidth=Math.max(3,c.width/640*4); 
  ctx.strokeStyle=color; 
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
  ctx.fillStyle=color
  kp.forEach(point=>{
    if(point.score>0.5){
      ctx.beginPath()
      ctx.arc(point.x, point.y, Math.max(2,c.width/640*3), 0, 2*Math.PI)
      ctx.fill()
    }
  })
  ctx.globalAlpha=1
}

export default function SideBySideSwing(){
  const uVid=useRef(null), uCan=useRef(null)
  const rVid=useRef(null), rCan=useRef(null)
  const detU=useRef(null), detR=useRef(null)
  const rafRef=useRef(0)
  const [busy,setBusy]=useState(true)
  const [uColor,setUColor]=useState('#00ff80')
  const [rColor,setRColor]=useState('#ff7b7b')
  const [uAlpha,setUAlpha]=useState(0.9)
  const [rAlpha,setRAlpha]=useState(0.7)
  const [refUrl,setRefUrl]=useState('/pro.mp4')
  const [analysis,setAnalysis]=useState(emptyAnalysis())
  const { setState } = useInsightsBus()

  useEffect(()=>{ 
    let cancelled=false; 
    (async()=>{
      await initTF().catch(()=>initTF('wasm')); 
      const d1=await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,{modelType:'lightning'}); 
      const d2=await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,{modelType:'lightning'}); 
      if(!cancelled){ 
        detU.current=d1; 
        detR.current=d2; 
        setBusy(false) 
      }
    })(); 
    return()=>{ cancelled=true } 
  },[])

  const fit=(v,c)=>{ 
    if(!v||!c||!v.videoWidth||!v.videoHeight) return; 
    if(c.width!==v.videoWidth||c.height!==v.videoHeight){ 
      c.width=v.videoWidth; 
      c.height=v.videoHeight 
    } 
  }

  const loop=useCallback(async()=>{
    const v=uVid.current, c=uCan.current, d=detU.current
    const rv=rVid.current, rc=rCan.current, dr=detR.current
    if(!v||!c||!d||v.readyState<2){ rafRef.current=requestAnimationFrame(loop); return }
    fit(v,c); 
    const ctx=c.getContext('2d'); 
    ctx.clearRect(0,0,c.width,c.height)
    
    try{ 
      const poses=await d.estimatePoses(v); 
      if(poses?.[0]){ 
        drawSkeleton(ctx,c,poses[0].keypoints,uColor,uAlpha); 
        const tMs=Math.round(v.currentTime*1000); 
        const next=analyzeFrame(analysis,poses[0],tMs); 
        if(next.frames.length%3===0) setState(next); 
        setAnalysis(next) 
      } 
    }catch{}

    if(rv&&rc&&dr&&rv.readyState>=2){ 
      fit(rv,rc); 
      const rctx=rc.getContext('2d'); 
      rctx.clearRect(0,0,rc.width,rc.height); 
      try{ 
        const poses=await dr.estimatePoses(rv); 
        if(poses?.[0]) drawSkeleton(rctx,rc,poses[0].keypoints,rColor,rAlpha) 
      }catch{} 
    }
    rafRef.current=requestAnimationFrame(loop)
  },[uColor,rColor,uAlpha,rAlpha,analysis,setState])

  useEffect(()=>{ 
    const v=uVid.current; 
    if(!v) return; 
    const onPlay=()=>{ 
      cancelAnimationFrame(rafRef.current); 
      rafRef.current=requestAnimationFrame(loop) 
    }; 
    const onPause=()=>cancelAnimationFrame(rafRef.current); 
    v.addEventListener('play',onPlay); 
    v.addEventListener('pause',onPause); 
    v.addEventListener('ended',onPause); 
    return()=>{ 
      v.removeEventListener('play',onPlay); 
      v.removeEventListener('pause',onPause); 
      v.removeEventListener('ended',onPause); 
      cancelAnimationFrame(rafRef.current) 
    } 
  },[loop])

  const onFile=e=>{ 
    const f=e.target.files?.[0]; 
    if(!f) return; 
    const url=URL.createObjectURL(f); 
    const v=uVid.current; 
    v.srcObject=null; 
    v.src=url; 
    v.muted=true; 
    v.playsInline=true; 
    setAnalysis(emptyAnalysis()); 
    v.onloadedmetadata=()=>v.play().catch(()=>{}) 
  }
  
  const startCamera=async()=>{ 
    const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false}); 
    const v=uVid.current; 
    v.src=''; 
    v.srcObject=s; 
    v.muted=true; 
    v.playsInline=true; 
    setAnalysis(emptyAnalysis()); 
    v.play().catch(()=>{}) 
  }
  
  const loadRef=()=>{ 
    const rv=rVid.current; 
    rv.src=refUrl; 
    rv.crossOrigin='anonymous'; 
    rv.loop=true; 
    rv.muted=true; 
    rv.playsInline=true; 
    rv.play().catch(()=>{}) 
  }

  return (
    <div>
      <div className="row" style={{marginBottom:10}}>
        <label className="label">📁 Upload Video<input type="file" accept="video/*" onChange={onFile} style={{display:'none'}}/></label>
        <button className="btn" onClick={startCamera} disabled={busy}>📹 Live Camera</button>
        <span className="hint">{busy?'🔄 Loading AI model…':'✅ AI Model Ready'}</span>
      </div>
      <div className="row" style={{marginBottom:8}}>
        <label className="row hint">Your Color <input type="color" value={uColor} onChange={e=>setUColor(e.target.value)}/></label>
        <label className="row hint">Your Opacity <input type="range" min="0.2" max="1" step="0.05" value={uAlpha} onChange={e=>setUAlpha(parseFloat(e.target.value))}/></label>
        <label className="row hint">Pro Color <input type="color" value={rColor} onChange={e=>setRColor(e.target.value)}/></label>
        <label className="row hint">Pro Opacity <input type="range" min="0.1" max="1" step="0.05" value={rAlpha} onChange={e=>setRAlpha(parseFloat(e.target.value))}/></label>
      </div>
      <div className="row" style={{marginBottom:10}}>
        <input style={{flex:'1 1 320px',padding:10,borderRadius:10,border:'1px solid #2a3442',background:'#0f1620',color:'#dfe9f7'}}
               placeholder="Pro reference video URL or /pro.mp4"
               value={refUrl} onChange={e=>setRefUrl(e.target.value)} />
        <button className="btn" onClick={loadRef}>Load Pro Swing</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div className="stage" style={{position:'relative'}}>
          <div style={{position:'absolute',top:8,left:8,zIndex:10,padding:'4px 8px',background:'rgba(0,0,0,0.7)',color:'var(--accent)',borderRadius:6,fontSize:12,fontWeight:'bold'}}>
            🎯 YOUR SWING
          </div>
          <video ref={uVid} controls playsInline muted/>
          <canvas ref={uCan}/>
        </div>
        <div className="stage" style={{position:'relative'}}>
          <div style={{position:'absolute',top:8,left:8,zIndex:10,padding:'4px 8px',background:'rgba(0,0,0,0.7)',color:'var(--accent2)',borderRadius:6,fontSize:12,fontWeight:'bold'}}>
            🏌️ PRO REFERENCE
          </div>
          <video ref={rVid} controls playsInline muted/>
          <canvas ref={rCan}/>
        </div>
      </div>
    </div>
  )
}