import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/predict': 'http://localhost:8000',
      '/feedback': 'http://localhost:8000',
      '/retrain': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    }
  }
})
