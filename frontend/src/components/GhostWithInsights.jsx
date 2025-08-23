import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
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

// MoveNet pose detection without MediaPipe
class MoveNetDetector {
  constructor() {
    this.model = null
    this.inputShape = [1, 192, 192, 3] // MoveNet Lightning input size
  }

  async load() {
    try {
      await tf.ready()
      // Load MoveNet Lightning model
      this.model = await tf.loadGraphModel('https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4')
      console.log('MoveNet model loaded successfully')
      return true
    } catch (error) {
      console.error('Failed to load MoveNet model:', error)
      return false
    }
  }

  async estimatePoses(video) {
    if (!this.model || !video) return []

    try {
      // Preprocess video frame
      const tensor = tf.tidy(() => {
        const imageTensor = tf.browser.fromPixels(video)
        const resized = tf.image.resizeBilinear(imageTensor, [192, 192])
        const normalized = tf.cast(resized, 'int32')
        return tf.expandDims(normalized, 0)
      })

      // Run inference
      const prediction = await this.model.predict(tensor).data()
      tensor.dispose()

      // Convert to pose format
      const keypoints = []
      const keypointNames = [
        'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
        'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
        'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
      ]

      for (let i = 0; i < 17; i++) {
        const y = prediction[i * 3] * video.videoHeight
        const x = prediction[i * 3 + 1] * video.videoWidth
        const score = prediction[i * 3 + 2]
        
        keypoints.push({
          name: keypointNames[i],
          x: x,
          y: y,
          score: score
        })
      }

      return keypoints.length > 0 ? [{ keypoints }] : []
    } catch (error) {
      console.error('Pose estimation error:', error)
      return []
    }
  }
}

export default function GhostWithInsights(){
  return <Player/>
}

function Player(){
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const detectorRef = useRef(null)
  const objectUrlRef = useRef(null)
  const [busy, setBusy] = useState(true)
  const [mirror, setMirror] = useState(false)
  const [lineWidth, setLineWidth] = useState(3)
  const [opacity, setOpacity] = useState(0.85)
  const [color, setColor] = useState('#00ff80')
  const [showJoints, setShowJoints] = useState(true)
  const [analyze, setAnalyze] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showGuides, setShowGuides] = useState(true)
  const { state, setState } = useInsightsBus()
  const [analysis, setAnalysis] = useState(emptyAnalysis())
  const lastInferRef = useRef(0)

  useEffect(()=>()=>{ if(objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current) },[])

  // init detector
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setBusy(true)
      const detector = new MoveNetDetector()
      const loaded = await detector.load()
      if (!cancelled && loaded) {
        detectorRef.current = detector
        setBusy(false)
      } else if (!cancelled) {
        setBusy(false)
        console.error('Failed to load pose detection model')
      }
    })()
    return ()=>{ cancelled = true }
  }, [])

  const fitCanvas = useCallback(()=>{
    const v=videoRef.current, c=canvasRef.current
    if(!v||!c||!v.videoWidth||!v.videoHeight) return
    if(c.width!==v.videoWidth||c.height!==v.videoHeight){ c.width=v.videoWidth; c.height=v.videoHeight }
  },[])

  const drawLoop = useCallback(async (t)=>{
    const v=videoRef.current, c=canvasRef.current, d=detectorRef.current
    if(!v||!c||!d||v.readyState<2){ rafRef.current=requestAnimationFrame(drawLoop); return }

    if (t && t - lastInferRef.current < 33) { rafRef.current=requestAnimationFrame(drawLoop); return } // ~30fps
    lastInferRef.current = t || performance.now()

    fitCanvas()
    const ctx=c.getContext('2d')
    ctx.clearRect(0,0,c.width,c.height)

    if (mirror) { ctx.save(); ctx.translate(c.width,0); ctx.scale(-1,1) }
    let poses=[]
    try{ poses=await d.estimatePoses(v) }catch{}
    const pose = poses?.[0]

    // overlay
    if (pose) {
      const kp = pose.keypoints
      ctx.lineWidth=Math.max(2,lineWidth); ctx.strokeStyle=`${color}${''}`
      ctx.globalAlpha=opacity
      EDGES.forEach(([a,b])=>{
        const p1=kp.find(k=>k.name===a), p2=kp.find(k=>k.name===b)
        if(p1?.score>0.35 && p2?.score>0.35){ ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke() }
      })
      if (showJoints) {
        ctx.globalAlpha=Math.min(1,opacity+0.1); ctx.fillStyle='#00ffff'
        const r = Math.max(2, c.width/640*4)
        kp.forEach(p=>{ if(p.score>0.45){ ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill() } })
      }
      ctx.globalAlpha=1

      if (analyze) {
        const tMs = Math.round(v.currentTime*1000)
        const next = analyzeFrame(analysis, pose, tMs)
        setAnalysis(next)
        // push to side panel store every ~5 frames
        if (next.frames.length % 5 === 0) setState(next)
        // guides
        if (showGuides) {
          drawGuides(ctx, c, next)
        }
      }
    }

    if (mirror) ctx.restore()
    rafRef.current=requestAnimationFrame(drawLoop)
  }, [fitCanvas, mirror, lineWidth, opacity, color, showJoints, analyze, showGuides, analysis])

  useEffect(()=>{
    const v=videoRef.current
    if(!v) return
    const onPlay=()=>{ cancelAnimationFrame(rafRef.current); v.playbackRate=playbackRate; rafRef.current=requestAnimationFrame(drawLoop) }
    const onPause=()=>cancelAnimationFrame(rafRef.current)
    v.addEventListener('play',onPlay); v.addEventListener('pause',onPause); v.addEventListener('ended',onPause)
    return ()=>{ v.removeEventListener('play',onPlay); v.removeEventListener('pause',onPause); v.removeEventListener('ended',onPause); cancelAnimationFrame(rafRef.current) }
  }, [drawLoop, playbackRate])

  // UI actions
  const onFile = (e)=>{
    const file=e.target.files?.[0]; if(!file) return
    if(objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url=URL.createObjectURL(file); objectUrlRef.current=url
    const v=videoRef.current; v.srcObject=null; v.src=url; v.muted=true; v.playsInline=true
    v.onloadedmetadata=()=>{ setAnalysis(emptyAnalysis()); v.play().catch(()=>{}) }
  }

  const startCamera = async ()=>{
    const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false })
    const v=videoRef.current; v.src=''; v.srcObject=stream; v.muted=true; v.playsInline=true
    setAnalysis(emptyAnalysis()); await v.play().catch(()=>{})
  }

  const snapshot = ()=>{
    const v=videoRef.current, o=canvasRef.current
    if(!v||!o||v.readyState<2) return
    const w=o.width||v.videoWidth, h=o.height||v.videoHeight
    const tmp=document.createElement('canvas'); tmp.width=w; tmp.height=h
    const tctx=tmp.getContext('2d')
    if(mirror){ tctx.save(); tctx.translate(w,0); tctx.scale(-1,1); tctx.drawImage(v,0,0,w,h); tctx.restore() } else { tctx.drawImage(v,0,0,w,h) }
    tctx.drawImage(o,0,0)
    const url=tmp.toDataURL('image/png'); const a=document.createElement('a'); a.href=url; a.download='swing-frame.png'; a.click()
  }

  return (
    <div>
      <div className="row" style={{marginBottom:10}}>
        <label className="label">Upload<input type="file" accept="video/*" onChange={onFile} style={{display:'none'}}/></label>
        <button className="btn" onClick={startCamera} disabled={busy}>Camera</button>
        <button className="btn" onClick={snapshot}>Snapshot</button>
        <span className="hint">{busy?'Loading model…':'Model ready'}</span>
      </div>

      <div className="row" style={{marginBottom:10}}>
        <label className="row hint">Color <input type="color" value={color} onChange={e=>setColor(e.target.value)}/></label>
        <label className="row hint">Opacity <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(parseFloat(e.target.value))}/></label>
        <label className="row hint">Width <input type="range" min="1" max="8" step="1" value={lineWidth} onChange={e=>setLineWidth(parseInt(e.target.value))}/></label>
        <label className="row hint">Speed <input type="range" min="0.25" max="2" step="0.25" value={playbackRate} onChange={e=>setPlaybackRate(parseFloat(e.target.value))}/></label>
        <label className="row hint"><input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)}/> Mirror</label>
        <label className="row hint"><input type="checkbox" checked={analyze} onChange={e=>setAnalyze(e.target.checked)}/> Analyze</label>
        <label className="row hint"><input type="checkbox" checked={showGuides} onChange={e=>setShowGuides(e.target.checked)}/> Guides</label>
      </div>

      <div className="stage">
        <video ref={videoRef} controls playsInline muted onLoadedMetadata={()=>{ try{ videoRef.current.play() }catch{} }}/>
        <canvas ref={canvasRef}/>
      </div>
    </div>
  )
}

// Visual guides (address/top/impact markers + text metrics)
function drawGuides(ctx, c, analysis){
  const { events, summary } = analysis
  ctx.save()
  ctx.font = `${Math.round(c.width/48)}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(230,240,255,0.9)'
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'
  ctx.lineWidth = Math.max(2, c.width/600)

  const pad = Math.round(c.width*0.02)
  const lines = [
    `Tempo: ${summary.tempo.backMs}ms : ${summary.tempo.downMs}ms (${summary.tempo.ratio.toFixed(2)}:1)`,
    `X-factor @ top: ${Math.round(summary.xFactorDeg)}°`
  ]
  lines.forEach((t,i)=>{
    ctx.strokeText(t, pad, pad + (i+1)*Math.round(c.width/28))
    ctx.fillText(t, pad, pad + (i+1)*Math.round(c.width/28))
  })

  // phase markers (thin vertical lines)
  const drawMarker = (evt, col)=>{
    if(!evt) return
    const x = (evt.tMs/1000) // seconds
    // we don't have absolute timeline mapping to pixels; just render colored labels in corner
    ctx.fillStyle = col
    const label = col==='orange'?'TOP':col==='lime'?'ADDRESS':'IMPACT'
    ctx.fillText(label, c.width - pad*5, pad + (col==='lime'?0:col==='orange'?1:2)*Math.round(c.width/28) + Math.round(c.width/28))
  }
  drawMarker(events.address,'lime')
  drawMarker(events.top,'orange')
  drawMarker(events.impact,'deepskyblue')

  ctx.restore()
}