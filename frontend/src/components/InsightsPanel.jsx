import React from 'react'
import { useInsightsBus } from '../lib/insightsBus.js'

export default function InsightsPanel(){
  const { state } = useInsightsBus()
  const { faults, summary } = state
  return (
    <div>
      <div className="row" style={{justifyContent:'space-between', marginBottom:6}}>
        <h3 className="title" style={{margin:0}}>🧠 AI Swing Analysis</h3>
        <span className="hint">{summary.frames} frames · {summary.fps} fps</span>
      </div>
      <div className="hint" style={{marginBottom:8}}>
        <strong>Tempo:</strong> <b style={{color:'var(--accent)'}}>{summary.tempo.ratio ? summary.tempo.ratio.toFixed(2) : '—'}:1</b>
        {' '} (back {summary.tempo.backMs||0}ms, down {summary.tempo.downMs||0}ms)<br/>
        <strong>X-factor @ Top:</strong> <b style={{color:'var(--accent)'}}>{Math.round(summary.xFactorDeg)||0}°</b>
        {' '} · <strong>Analysis:</strong> Real-time pose detection
      </div>
      {faults.length===0 ? (
        <div style={{padding:12,border:'1px solid #2b3a4b',borderRadius:10,background:'#0e141d',color:'#6ee7a9'}}>
          ✅ <strong>Excellent!</strong> No major swing faults detected by AI analysis. Keep swinging!
        </div>
      ) : (
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {faults.map((f,i)=>(
            <li key={i} style={{padding:12,border:'1px solid #2b3a4b',borderRadius:10,background:'#0e141d',marginBottom:8}}>
              <div className="row" style={{justifyContent:'space-between'}}>
                <b style={{color:'#ffffff'}}>{f.title}</b>
                <span style={{padding:'3px 8px', borderRadius:999, fontSize:11, fontWeight:'bold',
                  border:'1px solid', borderColor: f.severity==='bad' ? '#5a3434' : '#514528',
                  background: f.severity==='bad' ? '#261313' : '#261f0f',
                  color: f.severity==='bad' ? '#ff7b7b' : '#ffd166'}}>{f.severity.toUpperCase()}</span>
              </div>
              <div style={{fontSize:12,opacity:.9,marginTop:6,color:'#dde9f5'}}>{f.detail}</div>
              <div style={{fontSize:11,opacity:.7,marginTop:3,color:'var(--muted)'}}>⏱ {Math.round(f.timeMs)}ms · 📍 {f.phase}</div>
              {!!(f.drills?.length) && (
                <div style={{marginTop:10}}>
                  <div className="hint" style={{marginBottom:6,fontWeight:'bold'}}>🏌️ Improvement Drills:</div>
                  <ul style={{listStyle:'none', margin:'0', padding:0}}>
                    {f.drills.map((d,j)=>(
                      <li key={j} style={{marginBottom:6,padding:8,background:'#1a2533',borderRadius:8,borderLeft:'3px solid var(--accent)'}}>
                        <div style={{fontSize:12,fontWeight:'bold',color:'var(--accent)',marginBottom:2}}>{d.name}</div>
                        <div style={{fontSize:12,opacity:.95,color:'#c8d4e0'}}>{d.tip}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div style={{marginTop:12}}>
        <button className="btn" style={{width:'100%',background:'var(--accent)',color:'var(--bg)',fontWeight:'bold'}} onClick={()=>{
          const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'})
          const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='swing-analysis-report.json'; a.click()
          setTimeout(()=>URL.revokeObjectURL(a.href),1500)
        }}>📊 Export Analysis Report</button>
      </div>
    </div>
  )
}