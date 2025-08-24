import React, { createContext, useContext, useMemo, useState } from 'react'
const Ctx = createContext(null)
export function InsightsProvider({ children }){
  const [state, setState] = useState({
    frames: [],
    events: { address:null, top:null, impact:null },
    faults: [],
    summary: { frames:0, fps:0, tempo:{backMs:0,downMs:0,ratio:0}, xFactorDeg:0 }
  })
  const api = useMemo(()=>({ state, setState }), [state])
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
export function useInsightsBus(){
  const api = useContext(Ctx)
  if (!api) throw new Error('useInsightsBus outside provider')
  return api
}