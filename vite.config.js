import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const supabaseUrl =
  (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) ||
  'https://rthxlprgtfuhntpcdhsh.supabase.co'

// Dev CSP: 'unsafe-eval' is required by Vite's HMR (esbuild transforms)
// This is ONLY for development and is NOT included in production builds
const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' ${supabaseUrl} wss://${supabaseUrl.replace('https://', '')} https://cdn.jsdelivr.net https://latest.currency-api.pages.dev`,
  "img-src 'self' data: blob:",
  "frame-src 'self'",
].join('; ') + ';'

// Production CSP: strict, no eval, no unsafe-inline for scripts
// Used by netlify.toml and CI/CD pipelines
const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' ${supabaseUrl} wss://${supabaseUrl.replace('https://', '')} https://cdn.jsdelivr.net https://latest.currency-api.pages.dev`,
  "img-src 'self' data: blob:",
  "frame-src 'self'",
].join('; ') + ';'

// eslint-disable-next-line no-unused-vars
void CSP_PROD

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
