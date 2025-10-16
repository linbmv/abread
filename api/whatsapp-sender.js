/* eslint-disable no-undef */
// /api/whatsapp-sender.js - 简化的Baileys WhatsApp消息发送器
// 仅用于发送消息，无需接收消息功能

const { useMultiFileAuthState, makeWASocket, Browsers, DisconnectReason } = require('baileys');

// 简化的WhatsApp消息发送服务（仅发送）
class WhatsAppSender {
  constructor() {
    this.sock = null;
    this.isReady = false;
    this.authState = null;
    this.qrCallback = null; // 用于处理QR码的回调函数
  }

  // 初始化连接 - 仅用于发送消息
  async initialize() {
    console.log('正在初始化WhatsApp发送器...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState('./whatsapp_auth');
      this.authState = state;

      this.sock = makeWASocket({
        auth: state,
        logger: console,
        printQRInTerminal: true, // 在终端打印QR码，用于首次登录
        browser: Browsers.baileys('Desktop'), // 浏览器标识
        markOnlineOnConnect: false, // 不标记为在线，因为我们只发送消息
        // 禁用不需要的事件处理
        syncFullHistory: false,
      });

      // 设置事件监听器
      this.sock.ev.process(async (events) => {
        // 连接状态更新
        if (events['connection.update']) {
          const { connection, lastDisconnect, qr } = events['connection.update'];

          if (qr) {
            // QR码生成，可以传递给前端显示
            console.log('请扫描QR码以登录WhatsApp');
            if (this.qrCallback) {
              this.qrCallback(qr);
            }
          }

          if (connection === 'open') {
            console.log('WhatsApp连接已建立，可以发送消息');
            this.isReady = true;
          } else if (connection === 'close') {
            console.log('连接已关闭');
            const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
            if (shouldReconnect) {
              console.log('尝试重新连接...');
              setTimeout(() => {
                this.initialize();
              }, 5000);
            } else {
              console.log('需要重新扫描QR码登录');
            }
          }
        }

        // 凭据更新
        if (events['creds.update']) {
          await saveCreds();
        }
      });

    } catch (error) {
      console.error('初始化WhatsApp发送器失败:', error);
      throw error;
    }
  }

  // 检查是否已连接并准备好发送消息
  isReadyToSend() {
    return this.isReady && this.sock !== null;
  }

  // 发送文本消息
  async sendText(to, message) {
    if (!this.isReadyToSend()) {
      throw new Error('WhatsApp发送器未就绪，请先初始化并登录');
    }

    try {
      // 格式化目标号码
      const formattedJid = this.formatJid(to);

      const response = await this.sock.sendMessage(
        formattedJid,
        { text: message }
      );

      console.log(`消息已发送到 ${formattedJid}`, response);
      return response;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 格式化JID（WhatsApp号码格式）
  formatJid(phoneNumber) {
    // 移除所有非数字字符
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // 添加@s.whatsapp.net后缀
    if (!cleanNumber.includes('@')) {
      return cleanNumber + '@s.whatsapp.net';
    }

    return cleanNumber;
  }

  // 设置QR码回调函数（可选，用于前端显示QR码）
  setQRCodeCallback(callback) {
    this.qrCallback = callback;
  }

  // 关闭连接
  async close() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.isReady = false;
    }
  }
}

// 创建全局发送器实例
const whatsappSender = new WhatsAppSender();

// 如果环境变量要求，自动初始化
if (process.env.WHATSAPP_BAILEYS_AUTO_INIT === 'true') {
  whatsappSender.initialize();
}

// 通过API端点发送消息
module.exports = async (req, res) => {
  // 设置CORS头部
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 仅允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅允许POST请求' });
  }

  try {
    const { to, message } = req.body;

    if (!to) {
      return res.status(400).json({ error: '缺少目标号码 (to)' });
    }

    if (!message) {
      return res.status(400).json({ error: '缺少消息内容 (message)' });
    }

    // 检查发送器是否已初始化
    if (!whatsappSender.isReadyToSend()) {
      // 尝试初始化
      if (!whatsappSender.sock) {
        await whatsappSender.initialize();

        // 等待连接建立（最多等待30秒）
        const maxWait = 30000;
        const startTime = Date.now();

        while (!whatsappSender.isReadyToSend() && (Date.now() - startTime) < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!whatsappSender.isReadyToSend()) {
        return res.status(503).json({
          error: 'WhatsApp发送器未就绪，请确保已登录并连接',
          hint: '首次使用需要扫描QR码登录'
        });
      }
    }

    // 发送消息
    const result = await whatsappSender.sendText(to, message);

    return res.status(200).json({
      success: true,
      message: '消息发送成功',
      result: {
        messageId: result.key?.id,
        recipient: to,
        timestamp: Date.now()
      }
    });

  } catch (error) {
    console.error('发送WhatsApp消息失败:', error);
    return res.status(500).json({
      error: error.message,
      hint: '请检查号码格式是否正确，以及是否已成功登录WhatsApp'
    });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};