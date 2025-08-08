import { defineConfig } from 'vite'

export default defineConfig({
  base: '/RetailAR/',  // GitHub Pages deployment path
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'tensorflow': ['@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgl']
        }
      }
    }
  },
  server: {
    https: false,  // Disabled for testing - camera needs HTTPS in production
    port: 8080,
    host: true
  },
  optimizeDeps: {
    include: ['three', '@tensorflow/tfjs', '@tensorflow/tfjs-backend-webgl']
  }
})