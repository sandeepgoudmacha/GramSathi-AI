import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendHttp = env.VITE_API_URL || 'http://localhost:5000'
  const backendWs = backendHttp.replace(/^https?/, m => m === 'https' ? 'wss' : 'ws')
  return {
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: {
      port: 5173,
      // Proxy is only used when VITE_API_URL is not set (local dev pointing at localhost)
      proxy: env.VITE_API_URL ? {} : {
        '/api': { target: backendHttp, changeOrigin: true },
        '/uploads': { target: backendHttp, changeOrigin: true },
        '/ws': { target: backendWs, ws: true, changeOrigin: true },
      },
    },
  }
})
