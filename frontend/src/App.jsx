import React from 'react'
import GhostWithReference from './components/GhostWithReference.jsx'
import InsightsPanel from './components/InsightsPanel.jsx'
import { InsightsProvider } from './lib/insightsBus.js'

export default function App(){
  return (
    <InsightsProvider>
      <div className="container" style={{padding:18, maxWidth:1200, margin:'0 auto'}}>
        <h1 style={{margin:'0 0 8px'}}>Swingdebug – Ghost + Full Analysis</h1>
        <p style={{opacity:.75, fontSize:14, margin:'0 0 12px'}}>Upload or record. Left: your swing (with overlay). Right: optional reference. Panel shows metrics, faults, drills & tips.</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:14}}>
          <div className="card" style={{background:'#141a22', border:'1px solid #1f2733', borderRadius:14, padding:14}}>
            <GhostWithReference/>
          </div>
          <div className="card" style={{background:'#141a22', border:'1px solid #1f2733', borderRadius:14, padding:14}}>
            <InsightsPanel/>
          </div>
        </div>
      </div>
    </InsightsProvider>
  )
}