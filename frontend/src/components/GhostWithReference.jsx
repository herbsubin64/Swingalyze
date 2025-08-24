import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as poseDetection from '@tensorflow-models/pose-detection'
import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-cpu'
import { useInsightsBus } from '../lib/insightsBus.jsx'
import { analyzeFrame, emptyAnalysis } from '../lib/swingAnalyzer.jsx'

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
  const videoRef = useRef(null)            // user video (or camera)
  const refVideoRef = useRef(null)         // reference (pro) video (hidden)
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const detectorRef = useRef(null)
  const refDetectorRef = useRef(null)
  const [busy, setBusy] = useState(true)
  const [mirror, setMirror] = useState(false)
  const [lineWidth, setLineWidth] = useState(3)
  const [opacity, setOpacity] = useState(0.9)
  const [color, setColor] = useState('#00ff80')
  const [showJoints, setShowJoints] = useState(true)
  const [analysis, setAnalysis] = useState(emptyAnalysis())
  const { setState } = useInsightsBus()

  // Reference ghost controls
  const [showRef, setShowRef] = useState(false)
  const [refOpacity, setRefOpacity] = useState(0.65)
  const [refColor, setRefColor] = useState('#ff7b7b')
  const [refUrl, setRefUrl] = useState('/pro.mp4')   // place pro.mp4 in /public OR paste full https URL
  const [timeOffsetMs, setTimeOffsetMs] = useState(0) // align ghost (positive = delay ref)
  const [timeScale, setTimeScale] = useState(1)       // normalize tempo (ref speed)

  // Initialize TensorFlow and models
  useEffect(()=>{
    let cancelled=false
    ;(async()=>{
      try {
        setBusy(true)
        // Try different backends in order of preference
        let backendSet = false
        
        try {
          await tf.setBackend('webgl')
          await tf.ready()
          backendSet = true
          console.log('WebGL backend initialized successfully')
        } catch (e) {
          console.log('WebGL failed, trying CPU backend:', e)
          try {
            await tf.setBackend('cpu')
            await tf.ready()
            backendSet = true
            console.log('CPU backend initialized successfully')
          } catch (e2) {
            console.error('All backends failed:', e2)
          }
        }

        if (!backendSet) {
          setBusy(false)
          return
        }

        const d = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType:'SinglePose.Lightning' }
        )
        const d2 = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType:'SinglePose.Lightning' }
        )
        if (!cancelled){ 
          detectorRef.current=d
          refDetectorRef.current=d2
          setBusy(false)
          console.log('Pose detectors initialized successfully')
        }
      } catch (e) {
        console.error('TF init failed', e)
        setBusy(false)
      }
    })()
    return ()=>{ cancelled=true }
  },[])

  // Canvas fitting
  const fitCanvas = useCallback(()=>{
    const v=videoRef.current, c=canvasRef.current
    if(!v||!c||!v.videoWidth||!v.videoHeight) return
    if(c.width!==v.videoWidth || c.height!==v.videoHeight){ 
      c.width=v.videoWidth
      c.height=v.videoHeight 
    }
  },[])

  // Skeleton drawing function
  const drawSkeleton=(ctx, c, kp, colorStr, alpha)=>{
    ctx.lineWidth=Math.max(2, c.width/640*lineWidth)
    ctx.strokeStyle=colorStr
    ctx.globalAlpha=alpha
    
    EDGES.forEach(([a,b])=>{
      const p1=kp.find(k=>k.name===a), p2=kp.find(k=>k.name===b)
      if(p1?.score>0.35 && p2?.score>0.35){ 
        ctx.beginPath()
        ctx.moveTo(p1.x,p1.y)
        ctx.lineTo(p2.x,p2.y)
        ctx.stroke() 
      }
    })
    
    if (showJoints){
      ctx.fillStyle='rgba(0,255,255,0.85)'
      const r=Math.max(2,c.width/640*4)
      kp.forEach(p=>{ 
        if(p.score>0.45){ 
          ctx.beginPath()
          ctx.arc(p.x,p.y,r,0,Math.PI*2)
          ctx.fill() 
        } 
      })
    }
    ctx.globalAlpha=1
  }

  const loop = useCallback(async ()=>{
    const v=videoRef.current, c=canvasRef.current, d=detectorRef.current
    if(!v||!c||!d||v.readyState<2){ 
      rafRef.current=requestAnimationFrame(loop)
      return 
    }
    
    fitCanvas()
    const ctx=c.getContext('2d')
    ctx.clearRect(0,0,c.width,c.height)
    
    if (mirror){ 
      ctx.save()
      ctx.translate(c.width,0)
      ctx.scale(-1,1) 
    }

    // USER pose detection and drawing
    let pose=null
    try{ 
      const poses=await d.estimatePoses(v,{flipHorizontal:mirror})
      pose=poses?.[0] 
      if (pose && pose.keypoints) {
        console.log('Pose detected with', pose.keypoints.length, 'keypoints')
      }
    }catch(e){
      console.warn('Pose estimation error:', e)
    }
    
    if (pose && pose.keypoints && pose.keypoints.length > 0){ 
      drawSkeleton(ctx,c,pose.keypoints,color,opacity) 
      console.log('Drew user skeleton')
    }

    // REFERENCE ghost overlay (optional)
    if (showRef && refDetectorRef.current && refVideoRef.current?.readyState>=2){
      const rv = refVideoRef.current
      // Keep reference playback roughly aligned to user: t_ref ≈ t_user * timeScale + offset
      const tUser = v.currentTime*1000
      const targetMs = (tUser * timeScale) + timeOffsetMs
      const clamped = Math.max(0, Math.min(rv.duration*1000 - 30, targetMs))
      if (Math.abs(rv.currentTime*1000 - clamped) > 40){ 
        rv.currentTime = clamped/1000 
      } // soft sync
      
      let rPose=null
      try{ 
        const r=await refDetectorRef.current.estimatePoses(rv,{flipHorizontal:false})
        rPose=r?.[0] 
      }catch(e){
        console.warn('Reference pose estimation error:', e)
      }
      
      if (rPose && rPose.keypoints && rPose.keypoints.length > 0){ 
        drawSkeleton(ctx,c,rPose.keypoints,refColor,refOpacity) 
        console.log('Drew reference skeleton')
      }
    }

    // Swing analysis (push every ~5 frames)
    if (pose && pose.keypoints && pose.keypoints.length > 0){
      const tMs = Math.round(v.currentTime*1000)
      const next = analyzeFrame(analysis, pose, tMs)
      if (next.frames.length % 5 === 0) {
        setState(next)
        console.log('Updated analysis:', next.summary.frames, 'frames')
      }
      setAnalysis(next)
    }

    if (mirror) ctx.restore()
    rafRef.current=requestAnimationFrame(loop)
  },[fitCanvas, mirror, lineWidth, opacity, color, showJoints, showRef, refOpacity, refColor, timeOffsetMs, timeScale, analysis, setState])

  // Video event handlers
  useEffect(()=>{
    const v=videoRef.current
    if(!v) return
    const onPlay=()=>{ 
      cancelAnimationFrame(rafRef.current)
      rafRef.current=requestAnimationFrame(loop) 
    }
    const onPause=()=>cancelAnimationFrame(rafRef.current)
    v.addEventListener('play',onPlay)
    v.addEventListener('pause',onPause)
    v.addEventListener('ended',onPause)
    return ()=>{ 
      v.removeEventListener('play',onPlay)
      v.removeEventListener('pause',onPause)
      v.removeEventListener('ended',onPause)
      cancelAnimationFrame(rafRef.current) 
    }
  },[loop])

  // UI Actions
  const onFile=(e)=>{
    const file=e.target.files?.[0]
    if(!file) return
    const url=URL.createObjectURL(file)
    const v=videoRef.current
    v.srcObject=null
    v.src=url
    v.muted=true
    v.playsInline=true
    setAnalysis(emptyAnalysis())
    v.onloadedmetadata=()=>v.play().catch(()=>{})
  }
  
  const startCamera=async()=>{
    try {
      const stream=await navigator.mediaDevices.getUserMedia({ 
        video:{ facingMode:'environment' }, 
        audio:false 
      })
      const v=videoRef.current
      v.src=''
      v.srcObject=stream
      v.muted=true
      v.playsInline=true
      setAnalysis(emptyAnalysis())
      await v.play().catch(()=>{})
    } catch (e) {
      console.error('Camera access error:', e)
    }
  }
  
  const loadReference=()=>{
    const rv=refVideoRef.current
    if (!rv) return
    rv.src = refUrl
    rv.crossOrigin = 'anonymous'
    rv.loop = true
    rv.muted = true
    rv.playsInline = true
    rv.onloadedmetadata = ()=>{ 
      console.log('Reference video loaded for ghosting') 
    }
    // Autoplay reference silently in background (we hard-seek each frame anyway)
    rv.play().catch((e)=>console.warn('Reference autoplay blocked:', e))
  }

  return (
    <div>
      <div className="row" style={{marginBottom:10}}>
        <label className="label">Upload<input type="file" accept="video/*" onChange={onFile} style={{display:'none'}}/></label>
        <button className="btn" onClick={startCamera} disabled={busy}>Camera</button>
        <span className="hint">{busy?'Loading model…':'Model ready'}</span>
      </div>

      <div className="row" style={{marginBottom:10}}>
        <label className="row hint">Color <input type="color" value={color} onChange={e=>setColor(e.target.value)} /></label>
        <label className="row hint">Opacity <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(parseFloat(e.target.value))} /></label>
        <label className="row hint">Width <input type="range" min="1" max="8" step="1" value={lineWidth} onChange={e=>setLineWidth(parseInt(e.target.value))} /></label>
        <label className="row hint"><input type="checkbox" checked={showJoints} onChange={e=>setShowJoints(e.target.checked)} /> Joints</label>
        <label className="row hint"><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)} /> Mirror</label>
      </div>

      <div className="row" style={{marginBottom:10}}>
        <label className="row hint"><input type="checkbox" checked={showRef} onChange={e=>setShowRef(e.target.checked)} /> Show Reference</label>
        <label className="row hint">Ref Opacity <input type="range" min="0.1" max="1" step="0.05" value={refOpacity} onChange={e=>setRefOpacity(parseFloat(e.target.value))} /></label>
        <label className="row hint">Ref Color <input type="color" value={refColor} onChange={e=>setRefColor(e.target.value)} /></label>
        <label className="row hint">Offset (ms) <input type="range" min="-1500" max="1500" step="50" value={timeOffsetMs} onChange={e=>setTimeOffsetMs(parseInt(e.target.value))} /></label>
        <label className="row hint">Time Scale <input type="range" min="0.5" max="1.5" step="0.05" value={timeScale} onChange={e=>setTimeScale(parseFloat(e.target.value))} /></label>
      </div>

      <div className="row" style={{marginBottom:10}}>
        <input style={{flex:'1 1 360px', padding:'10px', borderRadius:10, border:'1px solid #2a3442', background:'#0f1620', color:'#dfe9f7'}}
               placeholder="Reference video URL (https) or /pro.mp4 in public/"
               value={refUrl} onChange={e=>setRefUrl(e.target.value)} />
        <button className="btn" onClick={loadReference}>Load Reference</button>
        <span className="hint">Tip: use a down-the-line pro 1080p MP4 for best results.</span>
      </div>

      <div className="stage">
        <video ref={videoRef} controls playsInline muted />
        <canvas ref={canvasRef} />
        <video ref={refVideoRef} style={{display:'none'}} playsInline muted />
      </div>
    </div>
  )
}