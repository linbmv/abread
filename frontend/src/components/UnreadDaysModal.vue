<template>
  <div v-if="show" class="modal show" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2>设置未读天数</h2>
      <div class="input-group">
        <input
          id="unreadDays"
          ref="inputRef"
          v-model="days"
          type="number"
          min="1"
          max="7"
          @click="selectInput"
          @keyup.enter="confirm"
        />
        <span class="input-suffix">天</span>
      </div>
      <div class="modal-buttons">
        <button type="button" class="btn" @click="$emit('close')">取消</button>
        <button type="button" class="btn primary" @click="confirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  currentDays: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['close', 'confirm'])

const days = ref(1)
const inputRef = ref(null)

// 监听show变化，自动设置天数并聚焦
watch(
  () => props.show,
  async (show) => {
    if (show) {
      days.value = props.currentDays
      await nextTick()
      if (inputRef.value) {
        inputRef.value.focus()
        inputRef.value.select() // 自动选中输入框中的文字
      }
    }
  }
)

// 选中输入框中的文本
const selectInput = () => {
  if (inputRef.value) {
    inputRef.value.select()
  }
}

// 确认天数
const confirm = () => {
  const dayValue = parseInt(days.value)
  if (dayValue >= 1 && dayValue <= 7) {
    emit('confirm', dayValue)
  } else {
    alert('请输入1-7之间的天数')
  }
}
</script>

<style scoped>
/* 样式将在main.css中定义 */
</style>