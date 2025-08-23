import React from 'react'
import { useInsightsBus } from '../lib/insightsBus.jsx'

export default function InsightsPanel(){
  const { state } = useInsightsBus()
  const { faults, events, summary } = state
  return (
    <div>
      <div className="row" style={{justifyContent:'space-between'}}>
        <h3 className="title" style={{margin:0}}>Insights</h3>
        <span className="badge">{summary.frames} frames · {summary.fps} fps</span>
      </div>
      <div className="tiny" style={{marginBottom:8}}>
        Tempo: <b>{summary.tempo.ratio.toFixed(2)}:1</b> (back {summary.tempo.backMs}ms, down {summary.tempo.downMs}ms) ·
        X-factor @ top: <b>{Math.round(summary.xFactorDeg)}°</b>
      </div>
      <ul className="ins">
        {faults.length===0 && <li className="ok">No major faults detected (heuristic). Keep swinging!</li>}
        {faults.map((f,i)=>(
          <li key={i} className={f.severity==='bad'?'bad':f.severity==='warn'?'warn':'ok'}>
            <div className="row" style={{justifyContent:'space-between'}}>
              <b>{f.title}</b>
              <span className="pill">{f.severity.toUpperCase()}</span>
            </div>
            <div className="tiny">{f.detail}</div>
            <div className="tiny">at {Math.round(f.timeMs)}ms · phase: {f.phase}</div>
          </li>
        ))}
      </ul>
      <div className="row" style={{marginTop:10}}>
        <ExportReportButton/>
      </div>
    </div>
  )
}

function ExportReportButton(){
  const { state } = useInsightsBus()
  const onClick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'swingalyze-report.json'
    a.click()
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000)
  }
  return <button className="btn" onClick={onClick}>Export JSON Report</button>
}