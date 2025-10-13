import { ref, onMounted } from 'vue'

export function useDeviceDetection() {
  const isMobile = ref(false)

  onMounted(() => {
    isMobile.value = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  })

  return {
    isMobile: isMobile.value,
    checkIsMobile: () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  }
}