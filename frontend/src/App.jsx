import React from 'react'
import GhostWithInsights from './components/GhostWithInsights.jsx'
import InsightsPanel from './components/InsightsPanel.jsx'

export default function App(){
  return (
    <div className="container">
      <h1 className="title">Swingalyze – Ghost + Insights</h1>
      <p className="hint">Upload or record. We auto-detect Address ▸ Top ▸ Impact, compute motion metrics, and flag common faults.</p>
      <div className="grid">
        <div className="card"><GhostWithInsights/></div>
        <div className="card"><InsightsPanel/></div>
      </div>
    </div>
  )
}