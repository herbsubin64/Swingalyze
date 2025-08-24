import React from 'react'
import GhostWithReference from './components/GhostWithReference.jsx'
import InsightsPanel from './components/InsightsPanel.jsx'
import { InsightsProvider } from './lib/insightsBus.jsx'

export default function App(){
  return (
    <InsightsProvider>
      <div className="container">
        <h1 className="title">Swingalyze – Ghost + Insights + Reference</h1>
        <p className="hint">Upload or record. Optional: set a Reference URL (pro swing) and toggle "Show Reference" for a Greenside-style ghost overlay.</p>
        <div className="grid">
          <div className="card"><GhostWithReference/></div>
          <div className="card"><InsightsPanel/></div>
        </div>
      </div>
    </InsightsProvider>
  )
}