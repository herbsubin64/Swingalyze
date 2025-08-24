import React from 'react'
import GhostWithReference from './components/GhostWithReference.jsx'

export default function App(){
  return (
    <div className="container">
      <h1 className="title">Swingalyze – Ghost + Insights + Reference</h1>
      <p className="hint">Upload or record. Reference video loads side-by-side for comparison with real-time pose detection.</p>
      <GhostWithReference />
    </div>
  )
}