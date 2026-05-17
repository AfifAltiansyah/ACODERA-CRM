import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CSP_DEV = "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://rthxlprgtfuhntpcdhsh.supabase.co wss://rthxlprgtfuhntpcdhsh.supabase.co; img-src 'self' data: blob:; frame-src 'self';"
const CSP_PROD = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://rthxlprgtfuhntpcdhsh.supabase.co wss://rthxlprgtfuhntpcdhsh.supabase.co; img-src 'self' data: blob:; frame-src 'self';"

export default defineConfig({
  plugins: [react()],
  server: {
    headers: { 'Content-Security-Policy': CSP_DEV },
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
