import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3010,
    proxy: {
      '/api': {
        // Use localhost for local development, backend hostname for Docker
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3011',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor'
          }
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'router'
          }
          // Drag and drop (only used in SettingsPage)
          if (id.includes('node_modules/@dnd-kit')) {
            return 'dnd-kit'
          }
          // Form libraries
          if (id.includes('node_modules/react-hook-form')) {
            return 'form-libs'
          }
          // Date libraries
          if (id.includes('node_modules/date-fns')) {
            return 'date-libs'
          }
          // Radix UI components
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui'
          }
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }
          // HTTP client
          if (id.includes('node_modules/axios')) {
            return 'http'
          }
        },
      },
    },
  },
})

