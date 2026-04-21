import axios from 'axios'

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/v1'

// 用户端API客户端 (使用JWT auth_token)
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 用户端请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 用户端响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      // admin路由的401不应清除用户token
      if (!url.includes('/admin/')) {
        localStorage.removeItem('auth_token')
      }
    }
    return Promise.reject(error)
  }
)

// 管理后台专用API客户端 (使用X-Admin-Secret header)
// 完全独立于用户认证，不会覆盖auth_token
export const adminClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

adminClient.interceptors.request.use(
  (config) => {
    const adminSecret = import.meta.env.VITE_ADMIN_SECRET || 'admin_secret_key_mvp'
    config.headers['X-Admin-Secret'] = adminSecret
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient
