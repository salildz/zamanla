import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 9050,
    host: '0.0.0.0',
    proxy: {
      // Used during local dev so VITE_API_URL=/api routes to the backend.
      // On the server, nginx handles /api/ routing directly.
      '/api': {
        target: 'http://localhost:9051',
        changeOrigin: true,
      }
    },
    // When running inside Docker behind nginx (server dev environment),
    // HMR WebSocket must connect through the public domain, not localhost.
    // Set HMR_HOST in docker-compose.dev.yml to activate this.
    hmr: process.env.HMR_HOST
      ? {
          host: process.env.HMR_HOST,
          clientPort: parseInt(process.env.HMR_CLIENT_PORT || '443'),
          protocol: process.env.HMR_PROTOCOL || 'wss',
        }
      : true,
  },
  build: {
    outDir: 'dist',
  },
})
