import React from 'react'
import { useInsightsBus } from '../lib/insightsBus.js'

export default function InsightsPanel(){
  const { state } = useInsightsBus()
  const { faults, summary } = state

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
        <h3 style={{margin:0}}>Insights</h3>
        <span style={{fontSize:12, opacity:.75}}>{summary.frames} frames · {summary.fps} fps</span>
      </div>
      <div style={{fontSize:12, opacity:.85, marginBottom:8}}>
        Tempo: <b>{summary.tempo.ratio ? summary.tempo.ratio.toFixed(2) : '—'}:1</b> (back {summary.tempo.backMs||0}ms, down {summary.tempo.downMs||0}ms) · X-factor @ Top: <b>{Math.round(summary.xFactorDeg)||0}°</b>
      </div>

      {faults.length=== 0 ? (
        <div style={{padding:10, border:'1px solid #2b3a4b', borderRadius:10, background:'#0e141d', color:'#6ee7a9'}}>
          No major faults detected (heuristic). Keep swinging!
        </div>
      ) : (
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {faults.map((f,i)=>(
            <li key={i} style={{padding:10, border:'1px solid #2b3a4b', borderRadius:10, background:'#0e141d', marginBottom:8}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <b>{f.title}</b>
                <span style={{
                  padding:'2px 8px', borderRadius:999, fontSize:11,
                  border:'1px solid', borderColor: f.severity==='bad' ? '#5a3434' : '#514528',
                  background: f.severity==='bad' ? '#261313' : '#261f0f',
                  color: f.severity==='bad' ? '#ff7b7b' : '#ffd166'
                }}>{f.severity.toUpperCase()}</span>
              </div>
              <div style={{fontSize:12, opacity:.85, marginTop:4}}>{f.detail}</div>
              <div style={{fontSize:11, opacity:.7, marginTop:2}}>at ~{Math.round(f.timeMs)}ms · phase: {f.phase}</div>

              {Array.isArray(f.drills) && f.drills.length>0 && (
                <div style={{marginTop:8}}>
                  <div style={{fontSize:12, opacity:.8, marginBottom:4}}>Drills & tips:</div>
                  <ul style={{listStyle:'disc', margin:'0 0 0 18px', padding:0}}>
                    {f.drills.map((d, j)=>(
                      <li key={j} style={{marginBottom:4}}>
                        <b style={{fontSize:12}}>{d.name}</b>
                        <span style={{fontSize:12, opacity:.9}}> — {d.tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div style={{marginTop:10}}>
        <button
          onClick={()=>{
            const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' })
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'swing-report.json'; a.click()
            setTimeout(()=>URL.revokeObjectURL(a.href), 1500)
          }}
          style={{padding:'10px 14px', borderRadius:10, border:'1px solid #2a3442', background:'#16202c', color:'#e9eef4', cursor:'pointer'}}
        >Export JSON Report</button>
      </div>
    </div>
  )
}