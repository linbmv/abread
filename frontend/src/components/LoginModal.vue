<template>
  <div v-if="show" class="modal show" @click="handleBackdropClick">
    <div class="modal-content" @click.stop>
      <h2>访问验证</h2>
      <form @submit.prevent="submitLogin">
        <div class="input-group">
          <label for="password">请输入密码：</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="密码"
            ref="inputRef"
            required
          />
        </div>
        <div class="modal-buttons">
          <button type="submit" class="btn primary">登录</button>
        </div>
      </form>
      <div v-if="error" class="error-message">{{ error }}</div>
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

const emit = defineEmits(['close', 'login'])

const password = ref('')
const error = ref('')
const inputRef = ref(null)

// 监听show变化，自动聚焦输入框
watch(
  () => props.show,
  async (show) => {
    if (show) {
      password.value = ''
      error.value = ''
      await nextTick()
      if (inputRef.value) {
        inputRef.value.focus()
      }
    }
  }
)

const submitLogin = () => {
  if (!password.value.trim()) {
    error.value = '请输入密码'
    return
  }
  
  emit('login', password.value)
}

const handleBackdropClick = () => {
  // Don't allow closing the modal by clicking backdrop
  // User must enter correct password to proceed
}

// Reset password field when modal closes
watch(() => props.show, (show) => {
  if (!show) {
    password.value = ''
    error.value = ''
  }
})
</script>

<style scoped>
.error-message {
  color: #f44336;
  margin-top: 10px;
  text-align: center;
}
</style>