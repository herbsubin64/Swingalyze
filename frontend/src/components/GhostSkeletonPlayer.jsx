import React, { useEffect, useRef, useState, useCallback } from 'react'

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

const styles = {
  btn:{ padding:'10px 14px', borderRadius:10, border:'1px solid #2a3442', background:'#16202c', color:'#e9eef4', cursor:'pointer' },
  label:{ padding:'10px 14px', borderRadius:10, border:'1px solid #2a3442', background:'#101a26', color:'#e9eef4', cursor:'pointer' },
  hint:{ fontSize:12, color:'#8ea0b3' }
}

export default function GhostSkeletonPlayer(){
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const detectorRef = useRef(null)
  const rafRef = useRef(0)
  const objectUrlRef = useRef(null)
  const [status, setStatus] = useState('Initializing…')
  const [mirror, setMirror] = useState(false)

  // toast helper
  const toast = useCallback((msg)=>{
    const el = document.getElementById('toast')
    if(!el) return
    el.textContent = msg
    el.style.display = 'block'
    clearTimeout(el._t)
    el._t = setTimeout(()=>{ el.style.display = 'none' }, 2500)
  },[])

  useEffect(()=>()=>{ if(objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current) },[])

  // Init TF + model once using global objects
  useEffect(()=>{
    let cancelled=false
    ;(async ()=>{
      try {
        // Wait for global TF objects to be available
        if (typeof window.tf === 'undefined' || typeof window.poseDetection === 'undefined') {
          setStatus('Waiting for TensorFlow.js to load...')
          // Poll for availability
          const checkLibraries = () => {
            if (typeof window.tf !== 'undefined' && typeof window.poseDetection !== 'undefined') {
              initializeDetector()
            } else {
              setTimeout(checkLibraries, 100)
            }
          }
          checkLibraries()
          return
        }
        
        await initializeDetector()
        
        async function initializeDetector() {
          setStatus('Loading TF backend…')
          await window.tf.setBackend('webgl')
          await window.tf.ready()
          setStatus('Loading MoveNet model…')
          const detector = await window.poseDetection.createDetector(
            window.poseDetection.SupportedModels.MoveNet,
            { 
              modelType:'lightning',
              enableSmoothing: true
            }
          )
          if (!cancelled) {
            detectorRef.current = detector
            setStatus('Model ready ✓')
            toast('Ghost skeleton ready ✓')
          }
        }
      } catch (e) {
        console.error('TF init/model load failed', e)
        setStatus('Model load failed (see console)')
        toast('Model load failed – open console')
      }
    })()
    return ()=>{ cancelled=true }
  }, [toast])

  // Keep canvas matched to actual video pixels
  const fitCanvas = useCallback(()=>{
    const v = videoRef.current, c = canvasRef.current
    if (!v || !c || !v.videoWidth || !v.videoHeight) return
    if (c.width !== v.videoWidth || c.height !== v.videoHeight) {
      c.width = v.videoWidth; c.height = v.videoHeight
    }
  },[])

  // Draw loop tied to video playing
  const loop = useCallback(async ()=>{
    const v = videoRef.current, c = canvasRef.current, d = detectorRef.current
    if (!v || !c || !d || v.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return }
    fitCanvas()
    const ctx = c.getContext('2d')
    ctx.clearRect(0,0,c.width,c.height)

    if (mirror) { ctx.save(); ctx.translate(c.width,0); ctx.scale(-1,1) }
    try {
      const poses = await d.estimatePoses(v, { flipHorizontal: mirror })
      const pose = poses?.[0]
      if (pose && pose.keypoints?.length) {
        drawSkeleton(ctx, c, pose.keypoints)
      }
    } catch (e) {
      // keep rendering, log once
      console.warn('estimatePoses error', e)
    }
    if (mirror) ctx.restore()
    rafRef.current = requestAnimationFrame(loop)
  }, [fitCanvas, mirror])

  useEffect(()=>{
    const v = videoRef.current
    if (!v) return
    const onPlay = () => {
      cancelAnimationFrame(rafRef.current)
      setStatus('Analyzing…')
      rafRef.current = requestAnimationFrame(loop)
    }
    const onPause = () => { cancelAnimationFrame(rafRef.current); setStatus('Paused') }
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('ended', onPause)
    return ()=>{
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('ended', onPause)
      cancelAnimationFrame(rafRef.current)
    }
  }, [loop])

  // Upload → autoplay
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    const v = videoRef.current
    v.srcObject = null
    v.src = url
    v.muted = true
    v.playsInline = true
    v.onloadedmetadata = () => {
      setStatus('Video loaded – playing…')
      v.play().catch(err=>{ console.warn('autoplay blocked', err); setStatus('Press play ▶') })
    }
  }

  // Camera preview
  const startCamera = async ()=>{
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false })
      const v = videoRef.current
      v.src = ''
      v.srcObject = stream
      v.muted = true
      v.playsInline = true
      await v.play()
      setStatus('Camera live – analyzing…')
    } catch (e) {
      console.error('camera error', e)
      setStatus('Camera blocked (allow permissions)')
      toast('Allow camera permissions')
    }
  }

  return (
    <div>
      <div className="row">
        <label className="label">Upload Video
          <input type="file" accept="video/*" onChange={onFile}/>
        </label>
        <button className="btn" style={styles.btn} onClick={startCamera}>Camera Preview</button>
        <label className="label" style={{display:'inline-flex',gap:8,alignItems:'center'}}>
          <input type="checkbox" checked={mirror} onChange={e=>setMirror(e.target.checked)} />
          Mirror
        </label>
        <span className="hint">{status}</span>
      </div>

      <div className="stage">
        <video ref={videoRef} controls playsInline muted />
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}

function drawSkeleton(ctx, c, keypoints){
  // lines
  ctx.lineWidth = Math.max(2, c.width/640*3)
  ctx.strokeStyle = 'rgba(0,255,128,0.9)'
  EDGES.forEach(([a,b])=>{
    const p1 = keypoints.find(k=>k.name===a)
    const p2 = keypoints.find(k=>k.name===b)
    if (p1?.score>0.35 && p2?.score>0.35){
      ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke()
    }
  })
  // joints
  ctx.fillStyle = 'rgba(0,255,255,0.85)'
  const r = Math.max(2, c.width/640*4)
  keypoints.forEach(p=>{
    if (p.score>0.45){ ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2); ctx.fill() }
  })
}