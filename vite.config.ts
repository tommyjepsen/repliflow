import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // Replicate's API has no CORS headers, so the browser talks to this proxy instead.
    proxy: {
      '/replicate': {
        target: 'https://api.replicate.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/replicate/, ''),
      },
    },
  },
})
