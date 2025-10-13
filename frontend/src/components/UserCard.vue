<template>
  <div
    class="user-card"
    :class="{
      'read': user.isRead && !user.frozen,
      'unread': !user.isRead && !user.frozen,
      'frozen': user.frozen
    }"
    @click="handleClick"
    @contextmenu="handleContextMenu"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
  >
    <span>{{ user.name }}</span>
    <div
      v-if="!user.isRead && !user.frozen && user.unreadDays > 0"
      class="unread-badge"
    >
      {{ user.unreadDays }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['state-change', 'context-menu'])

// 设备检测
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

// 触摸事件相关状态
const lastTap = ref(0)
const touchStartTime = ref(0)
const longPressTimer = ref(null)
const preventClick = ref(false)
const touchStartY = ref(0)
const hasMoved = ref(false)

// 禁用文字选择的样式
const disableSelectionStyle = `
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  touch-action: manipulation;
`

// 双击处理
const handleDoubleClick = (e) => {
  if (!isMobile) return

  e.preventDefault()
  e.stopPropagation()

  const now = Date.now()
  const DOUBLE_TAP_DELAY = 300

  if (lastTap.value && (now - lastTap.value) < DOUBLE_TAP_DELAY) {
    // 是双击
    if (props.user.frozen) {
      // 如果是冻结状态，切换冻结状态（解冻）
      emit('state-change', props.user)
    } else {
      // 非冻结状态，切换读经状态
      emit('state-change', props.user)
    }
    lastTap.value = 0
  } else {
    lastTap.value = now
  }
}

// 触摸开始处理
const handleTouchStart = (e) => {
  if (!isMobile) return

  e.stopPropagation()
  touchStartTime.value = Date.now()
  touchStartY.value = e.touches[0].clientY
  hasMoved.value = false

  longPressTimer.value = setTimeout(() => {
    if (!hasMoved.value) {
      preventClick.value = true
      lastTap.value = 0 // 清除双击状态

      // 显示移动端操作菜单
      emit('context-menu', e, props.user)
    }
  }, 500)
}

// 触摸移动处理
const handleTouchMove = (e) => {
  if (!isMobile) return

  e.stopPropagation()
  const touchY = e.touches[0].clientY
  const deltaY = Math.abs(touchY - touchStartY.value)

  if (deltaY > 10) {
    hasMoved.value = true
    clearTimeout(longPressTimer.value)
    lastTap.value = 0 // 清除双击状态
  }
}

// 触摸结束处理
const handleTouchEnd = (e) => {
  if (!isMobile) return

  e.stopPropagation()
  clearTimeout(longPressTimer.value)

  const touchEndTime = Date.now()
  const touchDuration = touchEndTime - touchStartTime.value

  if (!hasMoved.value && touchDuration < 500 && !preventClick.value) {
    handleDoubleClick(e)
  }

  preventClick.value = false
}

// 触摸取消处理
const handleTouchCancel = () => {
  if (!isMobile) return

  clearTimeout(longPressTimer.value)
  preventClick.value = false
  hasMoved.value = false
  lastTap.value = 0 // 清除双击状态
}

// 点击处理
const handleClick = (e) => {
  if (isMobile) return // 移动端使用触摸事件

  e.stopPropagation()
  emit('state-change', props.user)
}

// 右键菜单处理
const handleContextMenu = (e) => {
  if (isMobile) return // 移动端使用触摸长按

  e.preventDefault()
  e.stopPropagation()
  emit('context-menu', e, props.user)
}
</script>

<style scoped>
/* 样式将在main.css中定义 */
</style>