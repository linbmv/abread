<template>
  <!-- Login modal - shown first if not authenticated -->
  <LoginModal
    :show="!isAuthenticated"
    @login="handleLogin"
  />

  <!-- Main app - shown only after authentication -->
  <div v-if="isAuthenticated" class="container">
    <!-- 头部 -->
    <header>
      <h1>泛亚中文读经</h1>
      <div class="reading-plan" id="readingPlan">
        {{ readingPlan }}
      </div>
    </header>

    <!-- 添加用户按钮 -->
    <button class="add-user-btn" @click="showAddUserModal = true">+</button>

    <!-- 用户卡片区域 -->
    <div class="user-cards" id="userCards">
      <UserCard
        v-for="user in sortedUsers"
        :key="user.id"
        :user="user"
        @state-change="handleUserStateChange"
        @context-menu="showContextMenu"
      />
    </div>

    <!-- 统计信息区域 -->
    <div class="statistics-section">
      <div class="stats-header">
        <button class="send-stats-btn" @click="sendStatistics" title="统计">
          <i class="fab fa-whatsapp whatsapp-btn-icon"></i>
          <span class="btn-text">统计</span>
        </button>
      </div>
      <div class="live-statistics" id="liveStatistics">
        {{ liveStatistics }}
      </div>
    </div>

    <!-- 添加用户模态框 -->
    <AddUserModal
      :show="showAddUserModal"
      @close="showAddUserModal = false"
      @add-users="addUsers"
    />

    <!-- 未读天数模态框 -->
    <UnreadDaysModal
      :show="showUnreadDaysModal"
      :current-days="currentUnreadDays"
      @close="showUnreadDaysModal = false"
      @confirm="confirmUnreadDays"
    />

    <!-- 统计面板 -->
    <StatisticsPanel
      :users="users"
      @update-statistics="liveStatistics = $event"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import UserCard from './components/UserCard.vue'
import AddUserModal from './components/AddUserModal.vue'
import UnreadDaysModal from './components/UnreadDaysModal.vue'
import StatisticsPanel from './components/StatisticsPanel.vue'
import LoginModal from './components/LoginModal.vue'
import { useUserStore } from './stores/userStore'
import apiService from './services/api'

const userStore = useUserStore()

// Authentication state
const isAuthenticated = ref(false)

// 状态
const showAddUserModal = ref(false)
const showUnreadDaysModal = ref(false)
const currentUnreadDays = ref(1)
const currentUser = ref(null)
const readingPlan = ref('')
const liveStatistics = ref('')

// 检查本地存储的密码
onMounted(async () => {
  const storedPassword = localStorage.getItem('appPassword')
  if (storedPassword) {
    // 如果有存储的密码，直接验证
    const isValid = await verifyPassword(storedPassword)
    if (isValid) {
      isAuthenticated.value = true
      await userStore.fetchUsers()
      await loadReadingPlan()
    } else {
      // 如果存储的密码无效，清除它
      localStorage.removeItem('appPassword')
    }
  } else {
    // 如果没有存储的密码，显示登录界面
    isAuthenticated.value = false
  }
})

// 用户列表
const users = computed(() => userStore.users)
const sortedUsers = computed(() => {
  return [...users.value].sort((a, b) => {
    if (a.frozen !== b.frozen) return a.frozen ? 1 : -1
    if (!a.isRead && !b.isRead) return a.unreadDays - b.unreadDays
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
    return a.name.localeCompare(b.name)
  })
})

// 登录处理
async function handleLogin(inputPassword) {
  const isValid = await verifyPassword(inputPassword)
  if (isValid) {
    // 登录成功，保存密码到本地存储
    localStorage.setItem('appPassword', inputPassword)
    isAuthenticated.value = true
    await userStore.fetchUsers()
    await loadReadingPlan()
  } else {
    alert('密码错误，请重试')
  }
}

// 验证密码
async function verifyPassword(password) {
  try {
    const response = await apiService.verifyPassword(password)
    return response.data.valid
  } catch (error) {
    console.error('密码验证失败:', error)
    return false
  }
}

// 读经计划
async function loadReadingPlan() {
  try {
    const response = await fetch('https://gist.githubusercontent.com/linbmv/8adb195011a6422d4ee40f773f32a8fa/raw/bible_reading_plan.txt')
    let text = await response.text()
    text = text.replace(/[\r\n]+/g, ' ').trim()
    readingPlan.value = text
  } catch (error) {
    console.error('获取读经计划失败:', error)
    readingPlan.value = '获取读经计划失败'
  }
}

// 用户状态变更处理
async function handleUserStateChange(user) {
  if (user.frozen) return

  if (user.isRead) {
    // 已读状态：设置未读天数
    currentUser.value = user
    currentUnreadDays.value = user.unreadDays || 1
    showUnreadDaysModal.value = true
  } else {
    // 未读状态：切换为已读
    await userStore.updateUser(user.id, {
      isRead: true,
      unreadDays: 0
    })
  }
}

// 确认未读天数
async function confirmUnreadDays(days) {
  if (currentUser.value && days !== null) {
    await userStore.updateUser(currentUser.value.id, {
      isRead: false,
      unreadDays: days
    })
  }
  showUnreadDaysModal.value = false
  currentUser.value = null
}

// 显示上下文菜单
function showContextMenu(event, user) {
  // 创建移动端操作菜单
  const dialogContainer = document.createElement('div')
  dialogContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: none;
  `

  const dialog = document.createElement('div')
  dialog.style.cssText = `
    background: white;
    border-radius: 12px;
    width: 80%;
    max-width: 300px;
    padding: 20px;
    display: flex;
    gap: 10px;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: none;
  `

  const deleteBtn = document.createElement('button')
  deleteBtn.textContent = '删除用户'
  deleteBtn.style.cssText = `
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    background: #f44336;
    color: white;
    font-size: 16px;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  `

  const freezeBtn = document.createElement('button')
  freezeBtn.textContent = user.frozen ? '解冻用户' : '冻结用户'
  freezeBtn.style.cssText = `
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    background: #2196F3;
    color: white;
    font-size: 16px;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  `

  // Function to close the context menu
  function closeContextMenu() {
    dialogContainer.remove()
    document.removeEventListener('keydown', handleEscKey)
  }

  // Handle ESC key press
  function handleEscKey(event) {
    if (event.key === 'Escape') {
      closeContextMenu()
    }
  }

  // Add event listener for ESC key
  document.addEventListener('keydown', handleEscKey)

  deleteBtn.onclick = async () => {
    closeContextMenu()
    if (confirm(`确定要删除用户 "${user.name}" 吗？`)) {
      await userStore.deleteUser(user.id)
    }
  }

  freezeBtn.onclick = async () => {
    closeContextMenu()
    await userStore.updateUser(user.id, {
      frozen: !user.frozen,
      isRead: true,  // 解冻时设置为已读状态
      unreadDays: 0
    })
  }

  dialog.appendChild(deleteBtn)
  dialog.appendChild(freezeBtn)
  dialogContainer.appendChild(dialog)
  document.body.appendChild(dialogContainer)

  dialogContainer.addEventListener('touchstart', (e) => {
    if (e.target === dialogContainer) {
      e.preventDefault()
      closeContextMenu()
    }
  })
}

// 添加用户
async function addUsers(names) {
  await userStore.addUsers(names)
  showAddUserModal.value = false
}

// 发送统计信息
async function sendStatistics() {
  const stats = liveStatistics.value
  if (!stats.trim()) {
    showError('没有需要发送的统计信息')
    return
  }

  try {
    // 复制到剪贴板
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(stats)
      showSuccess('统计信息已复制到剪贴板')
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = stats
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      showSuccess('统计信息已复制到剪贴板')
    }

    // 尝试发送到后端（如WhatsApp等）
    try {
      // 直接通过 notification 服务发送到 WhatsApp
      await apiService.sendStatisticsToChannel(stats, 'whatsapp')
      showSuccess('统计信息已发送到 WhatsApp')
    } catch (sendError) {
      console.warn('发送统计到 WhatsApp 失败:', sendError)
      // 如果发送失败，至少用户已将信息复制到剪贴板
      showSuccess('统计信息已复制到剪贴板（WhatsApp 发送失败）')
    }
  } catch (error) {
    showError(error.message)
  }
}

// 错误提示
function showError(message) {
  // 这里可以实现错误提示逻辑
  console.error(message)
}

// 成功提示
function showSuccess(message) {
  // 这里可以实现成功提示逻辑
  console.log(message)
}
</script>

<style>
/* 样式将从main.css导入 */
</style>