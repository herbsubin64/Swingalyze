import React from 'react'
import GhostSkeletonPlayer from './components/GhostSkeletonPlayer.jsx'

export default function App(){
  return (
    <div className="container">
      <h1 style={{margin:'6px 0 8px'}}>Swing Ghost Skeleton</h1>
      <p className="hint">Upload a clip or use your camera. Video will auto-play and the skeleton overlay should appear within ~1–2s.</p>
      <GhostSkeletonPlayer />
    </div>
  )
}