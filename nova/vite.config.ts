import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is configurable so the same build works on Vercel/Cloudflare Pages ("/")
// and on GitHub Pages ("/<repo>/") via NOVA_BASE env var.
export default defineConfig({
  plugins: [react()],
  base: process.env.NOVA_BASE || '/',
  build: { outDir: 'dist' },
})
