import axios from 'axios'

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token
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

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 统一错误处理 - 只对非admin路由清除token
    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      // admin路由的401不应清除token（可能是密码错误）
      if (!url.includes('/admin/')) {
        localStorage.removeItem('auth_token')
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
