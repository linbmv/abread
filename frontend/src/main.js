import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'

// 添加调试信息
console.log('前端应用开始初始化');

try {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)

  // 添加错误处理
  app.config.errorHandler = (err, instance, info) => {
    console.error('Vue应用错误:', err);
    console.error('错误信息:', info);
  };

  app.mount('#app')
  console.log('前端应用初始化完成');
} catch (error) {
  console.error('前端应用初始化失败:', error);
}