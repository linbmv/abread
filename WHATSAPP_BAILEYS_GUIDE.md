# Baileys WhatsApp 发送功能部署指南

## 概述

本项目已集成了 Baileys 库，用于通过 WhatsApp 直接发送消息。使用 WhatsApp Web 协议，需要首次登录扫描 QR 码。

## 环境配置

在 `.env` 文件中添加以下配置：

```env
# WhatsApp Baileys 配置
WHATSAPP_BAILEYS_ENABLED=true                    # 启用 Baileys 发送功能
WHATSAPP_BAILEYS_RECIPIENT_PHONE=1234567890      # 接收消息的手机号（不含国家代码前缀+）
WHATSAPP_BAILEYS_AUTO_INIT=true                  # 是否自动初始化连接
```

## 首次部署步骤

### 1. 安装依赖
确保已安装项目依赖：
```bash
npm install
```

### 2. 首次登录
首次使用时，需要通过扫描 QR 码登录 WhatsApp：

- 启动服务器后控制台会显示 QR 码
- 使用手机 WhatsApp 扫描终端中显示的 QR 码
- 登录成功后，凭据将保存在 `./whatsapp_auth` 目录中

## API 使用方法

### 发送单条消息
```javascript
// POST /api/whatsapp-sender
{
  "to": "1234567890",  // 接收方号码
  "message": "你的消息内容"
}
```

### 通过通知服务发送
```javascript
// POST /api/notification
{
  "channel": "whatsapp_baileys",
  "message": "你的消息内容"
}
```

## 代码示例

### Node.js 客户端示例
```javascript
const sendMessage = async (message) => {
  const response = await fetch('/api/notification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: 'whatsapp_baileys',
      message: message
    })
  });

  const result = await response.json();
  return result;
};

// 使用示例
sendMessage('Hello from Baileys!').then(result => {
  console.log('消息发送结果:', result);
});
```

## 配置说明

### 电话号码格式
- 只包含数字，不包含 `+`、`-`、`(`、`)` 等符号
- 例如：`1234567890` 而不是 `+1 (234) 567-8900`

### 认证凭据
- 认证文件保存在 `./whatsapp_auth` 目录
- 首次登录后会自动生成
- 部署时需要保持此目录的持久性

## 部署注意事项

### 本地部署
1. 启动应用后，查看控制台输出的 QR 码
2. 使用手机 WhatsApp 扫描登录
3. 登录成功后即可发送消息

### 云端部署
1. 先在本地完成登录流程
2. 将生成的 `whatsapp_auth` 目录上传到服务器
3. 确保该目录具有读写权限

## 故障排除

### QR 码不显示
- 检查终端是否支持显示二维码
- 查看日志中是否有错误信息

### 发送消息失败
- 确认接收方号码格式正确
- 检查是否已成功登录
- 确认凭据文件未过期

### 连接断开
- 系统会自动尝试重连
- 如果持续失败，可能需要重新登录

## 安全考虑

- 保存认证凭据的目录需要适当保护
- 不要将认证文件提交到版本控制系统
- 定期检查连接状态，必要时重新认证

此实现允许您快速部署和使用 Baileys 进行 WhatsApp 消息发送。