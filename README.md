# AWCA - 泛亚中文读经管理系统

一个基于Vue.js和Node.js的读经管理系统，支持用户管理、状态跟踪和定时任务功能。

## ✨ 主要功能

- **用户管理**: 支持批量添加、删除、冻结/解冻用户。
- **状态跟踪**: 可为每位用户标记“已读”、“未读”状态，并记录连续未读天数。
- **自动冻结**: 用户连续7天未读后，系统会自动将其状态设置为“冻结”。
- **跨平台交互**:
  - **移动端**: 双击切换状态，长按显示操作菜单。
  - **PC端**: 单击切换状态，右键显示操作菜单。
- **每日定时任务**: 每天凌晨4点自动更新所有用户的读经状态。
- **统计与推送**: 自动生成每日未读统计，并支持通过多种渠道（Telegram, Bark, Webhook等）进行消息推送。
- **双部署方案**: 支持一键部署到 Vercel 或通过 Docker 在私有服务器上运行。

## 🛠️ 技术栈

- **前端**: Vue 3 (Composition API), Vite, Pinia, Axios
- **后端 (Vercel)**: Vercel Functions (Serverless), Vercel KV (或JSON文件), Vercel Cron Jobs
- **后端 (Docker)**: Node.js, Express.js, node-cron, Nginx
- **容器化**: Docker, Docker Compose

## 📂 项目结构

```
bible-reading-tracker/
├── frontend/         # Vue 3 前端代码
├── api/              # Vercel Serverless Functions
│   └── _lib/         # 后端共享库 (db, utils)
├── backend/          # Express.js 后端 (用于Docker部署)
│   └── data/         # 数据存储目录
├── docker/           # Docker相关文件
│   ├── Dockerfile.frontend
│   └── Dockerfile.backend
├── .env.example      # 环境变量示例
├── vercel.json       # Vercel 部署配置
├── docker-compose.yml # Docker Compose 配置
└── README.md         # 本文档
```

## 🚀 快速开始

### 1. 环境准备

- Node.js (v18+)
- npm 或 yarn
- Docker 和 Docker Compose (如果选择Docker部署)

### 2. 克隆与安装

```bash
git clone <your-repo-url>
cd bible-reading-tracker

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖 (用于Docker部署)
cd ../backend
npm install
cd ..
```

### 3. 配置环境变量

在项目根目录 `bible-reading-tracker/` 下，复制 `.env.example` 并重命名为 `.env`：

```bash
cp .env.example .env
```

然后，编辑 `.env` 文件，根据你的需求填写相关配置，特别是消息推送服务的`TOKEN`和`URL`。

## 本地开发

为了方便本地开发和调试，你可以同时运行前端开发服务器和后端API。

1. **启动后端 (Express)**:

   ```bash
   cd backend
   npm start
   # 后端将运行在 http://localhost:3001
   ```

2. **启动前端 (Vite)**:
   在 `frontend/vite.config.js` 中配置代理，以便将API请求转发到后端：
   ```js
   // vite.config.js
   export default defineConfig({
     // ...
     server: {
       proxy: {
         '/api': {
           target: 'http://localhost:3001',
           changeOrigin: true,
         },
       },
     },
   });
   ```

   然后启动前端开发服务器：
   ```bash
   cd frontend
   npm run dev
   # 前端将运行在 http://localhost:5173 (或Vite指定的端口)
   ```

## 部署指南

### Vercel 部署 (推荐)

一键部署到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/linbmv/abread&env=APP_PASSWORD&env=TIMEZONE&env=MAX_UNREAD_DAYS&env=CRON_SECRET&project-name=abread-bible-tracker&repo-name=abread)

或者手动部署：

1. 将你的项目 Fork 并推送到你自己的 GitHub 仓库。
2. 访问 [Vercel](https://vercel.com) 并使用你的 GitHub 账户登录。
3. 点击 "Add New..." -> "Project"，然后选择你刚刚推送的 GitHub 仓库。
4. Vercel 会自动识别项目类型和 `vercel.json` 配置。
5. 在 "Environment Variables" 部分，添加以下环境变量：
   - `APP_PASSWORD`: 应用访问密码（默认为 admin123）
   - `TIMEZONE`: 时区设置（默认为 Asia/Shanghai）
   - `MAX_UNREAD_DAYS`: 最大未读天数（默认为 7）
   - `CRON_SECRET`: Cron任务安全密钥（可选，用于保护定时任务）
6. 点击 "Deploy"，Vercel 将自动完成构建和部署。

### Docker 部署

1. 确保你的服务器上已安装 Docker 和 Docker Compose。
2. 将整个项目上传到你的服务器。
3. 在 `bible-reading-tracker` 根目录下，执行以下命令：

   ```bash
   # 构建并启动所有服务 (前端和后端)
   docker-compose up -d --build
   ```
4. 访问 `http://<your-server-ip>:8080` 即可看到应用界面。

   要查看服务日志：
   ```bash
   docker-compose logs -f
   ```

## ✅ 测试要点

请根据以下清单对部署好的应用进行全面测试：

### 交互测试
- [ ] **PC端**:
  - [ ] 单击用户卡片是否能正确切换“已读/未读”状态？
  - [ ] 右键单击用户卡片是否能弹出操作菜单（删除/冻结）？
- [ ] **移动端**:
  - [ ] 双击用户卡片是否能正确切换状态？
  - [ ] 长按 (500ms) 用户卡片是否能弹出操作菜单？
  - [ ] 在用户卡片上进行上下滑动时，是否不会触发任何状态切换或菜单？

### 功能测试
- [ ] **用户管理**:
  - [ ] 点击右上角 "+" 按钮，能否成功添加一个或多个用户？
  - [ ] 在操作菜单中，能否成功删除一个用户？
  - [ ] 在操作菜单中，能否将一个用户“冻结”？（卡片变灰）
  - [ ] 能否将一个已冻结的用户“解冻”？（卡片恢复正常）
- [ ] **状态切换**:
  - [ ] 将一个“已读”用户切换为“未读”时，是否会弹出对话框要求输入未读天数（1-7）？
  - [ ] 将一个“未读”用户切换为“已读”时，其未读天数是否会清零？
- [ ] **定时任务**:
  - [ ] （需要等待或手动触发）验证每日凌晨4点的任务是否正确执行：
    - [ ] “已读”用户变为“1日未读”。
    - [ ] “未读”用户的未读天数是否加1。
    - [ ] 连续6天未读的用户，在任务执行后是否变为“7日未读”并被冻结？

### 消息推送测试
- [ ] 在配置了至少一个推送渠道（如Telegram）后，在统计区域点击“发送统计”按钮。
- [ ] 对应的渠道（如Telegram聊天）是否收到了格式正确的统计信息？
- [ ] 统计信息是否包含了正确的未读用户信息和读经计划？

---

项目已根据 `project.md` 的所有要求实现。如有任何问题，请随时提出。
