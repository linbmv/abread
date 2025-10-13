<template>
  <div v-if="show" class="modal show" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2>添加用户</h2>
      <form @submit.prevent="addUsers">
        <div class="input-group">
          <textarea
            id="userNames"
            v-model="namesText"
            placeholder="请输入用户名，每行一个或用逗号分隔"
            rows="6"
            ref="inputRef"
          ></textarea>
        </div>
        <div class="modal-buttons">
          <button type="button" class="btn" @click="$emit('close')">取消</button>
          <button type="submit" class="btn primary">添加</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'add-users'])

const namesText = ref('')
const inputRef = ref(null)

// 监听show变化，自动聚焦输入框
watch(
  () => props.show,
  async (show) => {
    if (show) {
      namesText.value = ''
      await nextTick()
      if (inputRef.value) {
        inputRef.value.focus()
      }
    }
  }
)

// 添加用户
const addUsers = () => {
  const names = namesText.value
    .split(/[,\n]/)
    .map(name => name.trim())
    .filter(Boolean)

  if (names.length === 0) {
    alert('请输入用户名')
    return
  }

  emit('add-users', names)
}
</script>

<style scoped>
/* 样式将在main.css中定义 */
</style>