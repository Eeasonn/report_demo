import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 项目页面需要带仓库名的 base 路径，例如 /repo-name/
// 可通过环境变量覆盖；本地开发保持默认 /
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
