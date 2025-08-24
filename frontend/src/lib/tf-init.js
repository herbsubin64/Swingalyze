import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-wasm'
import * as tfwasm from '@tensorflow/tfjs-backend-wasm'

// WebGL → WASM fallback for reliability
export async function initTF(prefer='webgl'){
  tfwasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.20.0/wasm-out/')
  const tryBackend = async b => {
    try { await tf.setBackend(b); await tf.ready(); await tf.backend(); return b } catch { return null }
  }
  const order = prefer==='webgl' ? ['webgl','wasm'] : ['wasm','webgl']
  for (const b of order){ const ok = await tryBackend(b); if (ok) return ok }
  throw new Error('No TFJS backend available.')
}