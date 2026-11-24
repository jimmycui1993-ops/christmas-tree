import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative asset paths keep the production build portable on a static server.
export default defineConfig({
  base: './',
  plugins: [react()],
})
