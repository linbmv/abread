import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // 使用环境变量或默认值
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 可以在这里添加认证token等
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response
  },
  error => {
    console.error('API请求错误:', error)
    return Promise.reject(error)
  }
)

// API方法
export const apiService = {
  // 获取用户列表
  async getUsers() {
    return await api.get('/users')
  },

  // 添加用户
  async addUsers(names) {
    return await api.post('/users', { names })
  },

  // 更新用户
  async updateUser(userId, data) {
    return await api.put(`/users/${userId}`, data)
  },

  // 删除用户
  async deleteUser(userId) {
    return await api.delete(`/users/${userId}`)
  },

  // 发送统计
  async sendStatistics(stats) {
    return await api.post('/statistics/send', { stats })
  },

  // 获取统计
  async getStatistics() {
    return await api.get('/statistics')
  },
  
  // 验证密码
  async verifyPassword(password) {
    return await api.post('/verify-password', { password })
  }
}

export default apiService