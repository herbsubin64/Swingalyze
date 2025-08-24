import React, { useState } from 'react'
import OverlayGreenside from './components/OverlayGreenside.jsx'
import SideBySideSwing from './components/SideBySideSwing.jsx'
import InsightsPanel from './components/InsightsPanel.jsx'
import { InsightsProvider } from './lib/insightsBus.js'

export default function App(){
  const [tab, setTab] = useState('overlay') // 'overlay' | 'side'
  return (
    <InsightsProvider>
      <div className="container">
        <h1 className="title">SwingAnalyze – AI-Powered Golf Analysis</h1>
        <p className="hint">Upload video or use camera for real-time pose detection and swing analysis. Left: ghost overlay (Greenside style) or side-by-side; Right: live analysis with drills & tips.</p>
        <div className="tabs">
          <button className={'tab ' + (tab==='overlay'?'active':'')} onClick={()=>setTab('overlay')}>Ghost Overlay</button>
          <button className={'tab ' + (tab==='side'?'active':'')} onClick={()=>setTab('side')}>Side-by-Side</button>
        </div>
        <div className="grid">
          <div className="card">
            {tab==='overlay' ? <OverlayGreenside/> : <SideBySideSwing/>}
          </div>
          <div className="card">
            <InsightsPanel/>
          </div>
        </div>
      </div>
    </InsightsProvider>
  )
}