import { defineConfig } from 'vite';

export default defineConfig({
  base: '/RetailAR/', // GitHub Pages repository name
  server: {
    host: '0.0.0.0', // Explicitly bind to all interfaces
    port: 3000,
    https: false // Try HTTP first for connectivity testing
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsDir: 'assets'
  },
  optimizeDeps: {
    include: ['three', 'qr-scanner']
  }
});