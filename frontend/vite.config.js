import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { 
    outDir: 'dist', 
    target: 'es2017', 
    sourcemap: true, 
    assetsInlineLimit: 0 
  },
  optimizeDeps: {
    include: [
      '@tensorflow/tfjs',
      '@tensorflow-models/pose-detection'
    ],
    exclude: ['@mediapipe/pose', '@tensorflow/tfjs-backend-webgpu']
  },
  server: { 
    host: '0.0.0.0', 
    port: 3000,
    allowedHosts: ['swingdebug.preview.emergentagent.com'],
    hmr: {
      port: 3000,
      host: 'swingdebug.preview.emergentagent.com'
    }
  },
  preview: { 
    host: '0.0.0.0', 
    port: 3000 
  }
})