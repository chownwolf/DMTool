import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Disable compression so SSE chunks aren't buffered
        configure: (proxy) => {
          proxy.on('proxyReq', (_proxyReq, req) => {
            // Strip Accept-Encoding so backend doesn't gzip SSE
            if (req.url?.startsWith('/api/chat')) {
              _proxyReq.removeHeader('accept-encoding');
            }
          });
        },
      },
    },
  },
})
