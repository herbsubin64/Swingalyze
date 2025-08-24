import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-wasm'
import * as tfwasm from '@tensorflow/tfjs-backend-wasm'

/**
 * Initialize TFJS with WebGL, then fall back to WASM if WebGL fails.
 * Shows which backend is active and returns the backend name.
 */
export async function initTF({ prefer = 'webgl' } = {}){
  // Enable WASM assets from CDN (no COOP/COEP needed; SIMD optional)
  tfwasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.20.0/wasm-out/')

  const tryBackend = async (name) => {
    try {
      await tf.setBackend(name)
      await tf.ready()
      await tf.backend() // throws if not ready
      return name
    } catch (e) {
      console.warn(`TF backend ${name} failed`, e)
      return null
    }
  }

  const order = prefer === 'webgl' ? ['webgl','wasm'] : ['wasm','webgl']
  for (const b of order){
    const ok = await tryBackend(b)
    if (ok) {
      console.info('TF backend:', ok)
      return ok
    }
  }
  throw new Error('No TFJS backend available (webgl/wasm)')
}