import React from 'react'

export default function DiagnosticsHUD({ status, fps, poseFps, backend }){
  const box = {
    position:'fixed', right:12, bottom:12,
    padding:'10px 12px', borderRadius:10,
    background:'#101822', border:'1px solid #243246',
    color:'#cfe3ff', fontSize:12, zIndex:9999,
    boxShadow:'0 6px 22px rgba(0,0,0,.35)', maxWidth:260
  }
  const dot = (ok)=>({display:'inline-block',width:8,height:8,borderRadius:8,marginRight:6,background:ok?'#4ade80':'#f87171'})
  return (
    <div style={box}>
      <div><span style={dot(!!backend)}></span>Backend: <b>{backend||'—'}</b></div>
      <div style={{marginTop:4}}>Status: {status}</div>
      <div style={{marginTop:4}}>Render FPS: <b>{fps?.toFixed?.(1) ?? '—'}</b> | Pose FPS: <b>{poseFps?.toFixed?.(1) ?? '—'}</b></div>
      <div style={{marginTop:4,opacity:.75}}>Tip: if backend=wasm on high-end GPU, WebGL might be blocked. Check browser flags/CSP.</div>
    </div>
  )
}