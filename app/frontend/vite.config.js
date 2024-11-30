import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': process.env
  },
  server: {
    port: process.env.DEMO_FRONTEND_PORT || 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_RPC_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})