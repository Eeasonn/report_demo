import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App'
import './index.css'

// 配置 API 基础地址（支持 Vite 环境变量）
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
