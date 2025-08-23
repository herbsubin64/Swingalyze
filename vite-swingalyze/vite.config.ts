import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Root-relative asset URLs so /assets/*.js resolves on your domain
  base: '/',
  build: {
    outDir: 'dist',
    target: 'es2017',
    sourcemap: true,
    assetsInlineLimit: 0
  }
})