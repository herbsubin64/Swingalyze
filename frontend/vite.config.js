import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'dist', target: 'es2017', sourcemap: true, assetsInlineLimit: 0 },
  server: { host: true, port: 3000 },
  preview: { host: true, port: 3000 }
})