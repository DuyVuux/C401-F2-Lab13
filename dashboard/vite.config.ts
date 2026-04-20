import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/health': 'http://localhost:9999',
      '/metrics': 'http://localhost:9999',
      '/incidents': 'http://localhost:9999',
      '/chat': 'http://localhost:9999'
    }
  }
})
