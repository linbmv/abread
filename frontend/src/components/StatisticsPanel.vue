<template>
  <!-- 这个组件主要用于统计逻辑，实际UI在App.vue中显示 -->
</template>

<script setup>
import { computed, watch, onMounted } from 'vue'

const props = defineProps({
  users: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update-statistics'])

// 计算统计信息
const computedStatistics = computed(() => {
  let stats = ''

  // 今日未读
  const todayUnread = props.users
    .filter(u => !u.isRead && !u.frozen && u.unreadDays === 1)
    .map(u => `@${u.name}`)
    .join(' ')

  if (todayUnread) stats += `${todayUnread}\n今日未读\n\n`

  // 多日未读
  for (let days = 2; days <= 7; days++) {
    const daysUnread = props.users
      .filter(u => !u.isRead && !u.frozen && u.unreadDays === days)
      .map(u => `@${u.name}`)
      .join(' ')

    if (daysUnread) stats += `${daysUnread}\n${days}日未读\n\n`
  }

  return stats
})

// 监听用户变化，更新统计
watch(
  () => props.users,
  () => {
    emit('update-statistics', computedStatistics.value)
  },
  { deep: true, immediate: true }
)

// 组件挂载时发送初始统计
onMounted(() => {
  emit('update-statistics', computedStatistics.value)
})
</script>

<style scoped>
/* 样式将在main.css中定义 */
</style>