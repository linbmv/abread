# AWCA - 泛亚中文读经管理系统

一个基于Vue.js和Node.js的读经管理系统，支持用户管理、状态跟踪和定时任务功能。

## ✨ 主要功能

- **用户管理**: 支持批量添加、删除、冻结/解冻用户。
- **状态跟踪**: 可为每位用户标记"已读"、"未读"状态，并记录连续未读天数。
- **自动冻结**: 用户连续7天未读后，系统会自动将其状态设置为"冻结"。
- **跨平台交互**:
  - **移动端**: 双击切换状态，长按显示操作菜单。
  - **PC端**: 单击切换状态，右键显示操作菜单。
- **每日定时任务**: 每天凌晨4点自动更新所有用户的读经状态。
- **统计与推送**: 自动生成每日未读统计，并支持通过多种渠道（Telegram, Bark, Webhook等）进行消息推送。
- **双部署方案**: 支持一键部署到 Vercel 或通过 Docker 在私有服务器上运行。

## 🛠️ 技术栈

- **前端**: Vue 3 (Composition API), Vite, Pinia, Axios
- **后端 (Vercel)**: Vercel Functions (Serverless), Vercel Edge Config + GitHub Gist (双重存储方案)
- **后端 (Docker)**: Node.js, Express.js, node-cron, Nginx
- **容器化**: Docker, Docker Compose

## 🔧 数据存储配置（重要）

当前系统采用双重存储方案，以解决数据持久化问题：

### 主存储：Vercel Edge Config
- **优势**: 高性能、低延迟、Vercel原生支持
- **持久化**: 数据永久保存，不受实例重启影响
- **配置**: 在Vercel项目设置中启用Edge Config

### 备用存储：GitHub Gist
- **优势**: 免费、简单、可靠的备用方案
- **配置**:
  - GIST_ID: 您的Gist ID
  - GIST_TOKEN: GitHub访问令牌（需gist权限）

### 容错机制
- 系统优先使用Edge Config
- 如果Edge Config不可用，自动回退到Gist
- 数据会同时写入两个存储（如果都可用）

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

## ⚙️ 环境变量配置

### 基础配置

项目需要以下基础环境变量：

```
APP_PASSWORD=your_app_password  # 应用访问密码
TIMEZONE=Asia/Shanghai          # 时区设置（默认：Asia/Shanghai）
MAX_UNREAD_DAYS=7               # 最大未读天数（默认：7）
CRON_SECRET=your_cron_secret    # Cron任务安全密钥（用于保护定时任务）
```

如果使用GitHub Gist作为备用存储，还需要配置：

```
GIST_ID=your_gist_id_here
GIST_TOKEN=your_github_token_here
```

### 可选的通知服务配置

- **WhatsApp Baileys (直接发送，需要首次登录)**:
  ```
  WHATSAPP_BAILEYS_ENABLED=false                    # 启用Baileys发送功能
  WHATSAPP_BAILEYS_RECIPIENT_PHONE=recipient_phone_number  # 接收消息的手机号
  WHATSAPP_BAILEYS_AUTO_INIT=false                 # 是否自动初始化连接
  ```

- **Bark (iOS)**:
  ```
  BARK_URL=your_bark_url
  ```

- **通用 Webhook**:
  ```
  WEBHOOK_URL=your_webhook_url
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

## 🌐 部署指南

### Vercel 部署 (推荐)

一键部署到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/linbmv/abread&env=APP_PASSWORD&env=TIMEZONE&env=MAX_UNREAD_DAYS&env=CRON_SECRET&project-name=abread-bible-tracker&repo-name=abread)

或者手动部署：

1. 将你的项目 Fork 并推送到你自己的 GitHub 仓库。
2. 访问 [Vercel](https://vercel) 并使用你的 GitHub 账户登录。
3. 点击 "Add New..." -> "Project"，然后选择你刚刚推送的 GitHub 仓库。
4. Vercel 会自动识别项目类型和 `vercel.json` 配置。
5. 在 "Environment Variables" 部分，添加以下环境变量：
   - `APP_PASSWORD`: 应用访问密码（默认为 admin123）
   - `TIMEZONE`: 时区设置（默认为 Asia/Shanghai）
   - `MAX_UNREAD_DAYS`: 最大未读天数（默认为 7）
   - `CRON_SECRET`: Cron任务安全密钥（可选，用于保护定时任务）
   - `GIST_ID`: GitHub Gist ID（可选，备用存储）
   - `GIST_TOKEN`: GitHub访问令牌（可选，备用存储）
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

## 📌 图标更新说明

当前版本已将统计按钮图标更新为Font Awesome的WhatsApp图标（fab fa-whatsapp）：
- 添加了Font Awesome CDN链接
- 图标显示为WhatsApp标志（绿色话泡+电话图标）
- 按钮文字改为"统计"
- 按钮样式为圆角矩形

如果您在浏览器中仍看到旧图标，请尝试：
1. 强制刷新页面 (Ctrl+F5 或 Cmd+Shift+R)
2. 清理浏览器缓存
3. 在隐私/无痕模式下打开页面

## 🛠️ 故障排除

### 数据无法保存问题

**问题**: 数据无法永久保存，刷新后丢失
**解决方案**:
1. 确认已配置Vercel Edge Config
2. 检查GitHub Gist环境变量是否正确设置
3. 查看浏览器控制台是否有错误信息

### 添加用户失败

**问题**: 点击"+"按钮后无法添加用户
**解决方案**:
1. 检查网络连接是否正常
2. 确认API端点是否正常工作
3. 查看浏览器控制台和网络标签页中的错误信息

### 图标显示问题

**问题**: WhatsApp图标显示为气泡或其他符号
**解决方案**:
1. 确认Font Awesome CDN链接已加载
2. 检查CSS样式是否正确应用
3. 强制刷新浏览器缓存

### 定时任务不执行

**问题**: 用户状态没有在每天凌晨4点自动更新
**解决方案**:
1. 确认时区设置正确
2. 检查Vercel Cron Job配置
3. 验证CRON_SECRET环境变量是否正确

## ✅ 测试要点

请根据以下清单对部署好的应用进行全面测试：

### 交互测试
- [ ] **PC端**:
  - [ ] 单击用户卡片是否能正确切换"已读/未读"状态？
  - [ ] 右键单击用户卡片是否能弹出操作菜单（删除/冻结）？
- [ ] **移动端**:
  - [ ] 双击用户卡片是否能正确切换状态？
  - [ ] 长按 (500ms) 用户卡片是否能弹出操作菜单？
  - [ ] 在用户卡片上进行上下滑动时，是否不会触发任何状态切换或菜单？

### 功能测试
- [ ] **用户管理**:
  - [ ] 点击右上角 "+" 按钮，能否成功添加一个或多个用户？
  - [ ] 在操作菜单中，能否成功删除一个用户？
  - [ ] 在操作菜单中，能否将一个用户"冻结"？（卡片变灰）
  - [ ] 能否将一个已冻结的用户"解冻"？（卡片恢复正常）
- [ ] **状态切换**:
  - [ ] 将一个"已读"用户切换为"未读"时，是否会弹出对话框要求输入未读天数（1-7）？
  - [ ] 将一个"未读"用户切换为"已读"时，其未读天数是否会清零？
- [ ] **定时任务**:
  - [ ] （需要等待或手动触发）验证每日凌晨4点的任务是否正确执行：
    - [ ] "已读"用户变为"1日未读"。
    - [ ] "未读"用户的未读天数是否加1。
    - [ ] 连续6天未读的用户，在任务执行后是否变为"7日未读"并被冻结？

### 消息推送测试
- [ ] 在配置了至少一个推送渠道（如Telegram）后，在统计区域点击"发送统计"按钮。
- [ ] 对应的渠道（如Telegram聊天）是否收到了格式正确的统计信息？
- [ ] 统计信息是否包含了正确的未读用户信息和读经计划？

---