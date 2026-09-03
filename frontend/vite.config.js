import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxying /api to the FastAPI server keeps the browser same-origin in dev.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
