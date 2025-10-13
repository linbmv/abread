import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiService from '../services/api'

export const useUserStore = defineStore('user', () => {
  const users = ref([])

  // 获取用户列表
  async function fetchUsers() {
    try {
      const response = await apiService.getUsers()
      users.value = response.data
      return response.data
    } catch (error) {
      console.error('获取用户列表失败:', error)
      throw error
    }
  }

  // 添加用户
  async function addUsers(names) {
    try {
      // 检查是否有重复的用户名并过滤掉
      const existingNames = users.value.map(user => user.name.toLowerCase())
      const newNames = names.filter(name => 
        !existingNames.includes(name.toLowerCase())
      )
      
      // 如果没有新用户名需要添加，直接返回
      if (newNames.length === 0) {
        alert('没有新用户需要添加（所有用户名已存在）')
        return
      }
      
      // 如果有重复的用户名，提示用户
      if (newNames.length < names.length) {
        const duplicateCount = names.length - newNames.length
        alert(`已过滤 ${duplicateCount} 个重复用户名，仅添加新用户`)
      }
      
      const response = await apiService.addUsers(newNames)
      await fetchUsers() // 刷新用户列表
      return response.data
    } catch (error) {
      console.error('添加用户失败:', error)
      throw error
    }
  }

  // 更新用户
  async function updateUser(userId, data) {
    try {
      const response = await apiService.updateUser(userId, data)
      await fetchUsers() // 刷新用户列表
      return response.data
    } catch (error) {
      console.error('更新用户失败:', error)
      throw error
    }
  }

  // 删除用户
  async function deleteUser(userId) {
    try {
      const response = await apiService.deleteUser(userId)
      await fetchUsers() // 刷新用户列表
      return response.data
    } catch (error) {
      console.error('删除用户失败:', error)
      throw error
    }
  }

  // 发送统计
  async function sendStatistics(stats) {
    try {
      const response = await apiService.sendStatistics(stats)
      return response.data
    } catch (error) {
      console.error('发送统计失败:', error)
      throw error
    }
  }

  return {
    users,
    fetchUsers,
    addUsers,
    updateUser,
    deleteUser,
    sendStatistics
  }
})