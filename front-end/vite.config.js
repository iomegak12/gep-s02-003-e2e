import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During `vite dev` we don't have nginx in front of us, so proxy the same
// paths that nginx will serve in production. This keeps src/api/* code
// identical between dev and prod (everything is relative under /api/v1 and /health).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth':            { target: 'http://localhost:3001', changeOrigin: true },
      '/api/v1/suppliers':       { target: 'http://localhost:3002', changeOrigin: true },
      '/api/v1/purchase-orders': { target: 'http://localhost:3003', changeOrigin: true },
      '/health/iam':             { target: 'http://localhost:3001', changeOrigin: true, rewrite: () => '/health' },
      '/health/sup':             { target: 'http://localhost:3002', changeOrigin: true, rewrite: () => '/health' },
      '/health/po':              { target: 'http://localhost:3003', changeOrigin: true, rewrite: () => '/health' }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
