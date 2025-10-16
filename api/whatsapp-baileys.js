/* eslint-disable no-undef */
// /api/whatsapp-baileys.js - 使用Baileys库发送WhatsApp消息
const { Boom } = require('@hapi/boom');
const { DisconnectReason, useMultiFileAuthState, makeInMemoryStore, jidNormalizedUser, proto, getContentType } = require('@whatsapp/web-core');
const { makeWASocket, Browsers } = require('baileys');
const { generateStatisticsText } = require('./_lib/utils.js');

// 创建内存存储，用于存储聊天记录
const store = makeInMemoryStore({
  logger: console
});

// WhatsApp消息发送服务
class WhatsAppBaileysService {
  constructor() {
    this.sock = null;
    this.isReady = false;
    this.authState = null;
  }

  // 连接到WhatsApp
  async connect() {
    console.log('正在连接到WhatsApp...');

    const { state, saveCreds } = await useMultiFileAuthState('./whatsapp_auth');
    this.authState = state;

    const sock = makeWASocket({
      auth: state,
      logger: console,
      printQRInTerminal: true, // 打印QR码到终端，用于首次登录
      browser: Browsers.baileys('Desktop'), // 使用桌面浏览器标识
      markOnlineOnConnect: true,
      retryRequestDelayMs: 100,
      maxMsgRetryCount: 10,
    });

    // 存储sock实例
    this.sock = sock;

    // 设置事件监听器
    sock.ev.process(async (events) => {
      // 连接更新
      if (events['connection.update']) {
        const { connection, lastDisconnect } = events['connection.update'];

        if (connection === 'open') {
          console.log('已成功连接到WhatsApp');
          this.isReady = true;
        } else if (connection === 'close') {
          console.log('与WhatsApp断开连接');
          const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
          console.log('是否需要重连:', shouldReconnect);

          if (shouldReconnect) {
            setTimeout(() => {
              this.connect();
            }, 5000);
          } else {
            console.log('登录已失效，需要重新扫描QR码');
          }
        } else if (connection === 'connecting') {
          console.log('正在连接到WhatsApp...');
        }
      }

      // 凭据更新
      if (events['creds.update']) {
        await saveCreds();
        console.log('凭据已更新');
      }

      // 接收到消息
      if (events['messages.upsert']) {
        console.log('接收到消息:', events['messages.upsert']);
      }

      // 群组元数据更新
      if (events['group-metadata.update']) {
        console.log('群组元数据更新:', events['group-metadata.update']);
      }

      // 联系人更新
      if (events['contacts.update']) {
        for (const contact of events['contacts.update']) {
          if (contact.notify) {
            console.log('联系人更新:', contact.notify);
          }
        }
      }
    });

    // 设置store
    store.bind(sock.ev);
  }

  // 检查连接状态
  isConnected() {
    return this.isReady && this.sock !== null;
  }

  // 发送文本消息
  async sendTextMessage(to, message) {
    if (!this.isConnected()) {
      throw new Error('WhatsApp未连接，请先连接');
    }

    try {
      // 格式化目标号码
      const formattedNumber = this.formatPhoneNumber(to);

      // 发送消息
      const response = await this.sock.sendMessage(
        formattedNumber,
        {
          text: message
        }
      );

      console.log('消息发送成功:', response);
      return response;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 发送图片消息
  async sendImageMessage(to, imageBuffer, caption = '') {
    if (!this.isConnected()) {
      throw new Error('WhatsApp未连接，请先连接');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(to);

      const response = await this.sock.sendMessage(
        formattedNumber,
        {
          image: imageBuffer,
          caption: caption
        }
      );

      console.log('图片消息发送成功:', response);
      return response;
    } catch (error) {
      console.error('发送图片消息失败:', error);
      throw error;
    }
  }

  // 发送文档消息
  async sendDocumentMessage(to, documentBuffer, fileName, caption = '') {
    if (!this.isConnected()) {
      throw new Error('WhatsApp未连接，请先连接');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(to);

      const response = await this.sock.sendMessage(
        formattedNumber,
        {
          document: documentBuffer,
          mimetype: 'application/pdf',
          fileName: fileName,
          caption: caption
        }
      );

      console.log('文档消息发送成功:', response);
      return response;
    } catch (error) {
      console.error('发送文档消息失败:', error);
      throw error;
    }
  }

  // 格式化电话号码
  formatPhoneNumber(phoneNumber) {
    // 移除所有非数字字符
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // 如果号码以0开头，替换为国家代码
    let formattedNumber;
    if (cleanNumber.startsWith('0')) {
      // 假设是中国号码，可以修改为其他国家代码
      formattedNumber = cleanNumber.replace(/^0/, '86');
    } else {
      formattedNumber = cleanNumber;
    }

    // 确保号码以@s.whatsapp.net结尾
    if (!formattedNumber.includes('@')) {
      formattedNumber += '@s.whatsapp.net';
    }

    return formattedNumber;
  }

  // 获取联系人列表
  async getContacts() {
    if (!this.isConnected()) {
      throw new Error('WhatsApp未连接，请先连接');
    }

    try {
      const contacts = await this.sock.contacts || [];
      return contacts;
    } catch (error) {
      console.error('获取联系人失败:', error);
      throw error;
    }
  }

  // 断开连接
  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.isReady = false;
      console.log('已断开与WhatsApp的连接');
    }
  }
}

// 创建全局实例
const whatsappService = new WhatsAppBaileysService();

// 初始化连接
if (process.env.WHATSAPP_BAILEYS_ENABLED === 'true') {
  whatsappService.connect();
}

// Vercel Serverless Function for sending WhatsApp messages using Baileys
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, message, type = 'text' } = req.body;

    if (!message) {
      return res.status(400).json({ error: '缺少message参数' });
    }

    if (!to) {
      return res.status(400).json({ error: '缺少to参数（目标号码）' });
    }

    // 检查服务是否已启用
    if (process.env.WHATSAPP_BAILEYS_ENABLED !== 'true') {
      return res.status(400).json({ error: 'Baileys WhatsApp服务未启用，请设置WHATSAPP_BAILEYS_ENABLED=true' });
    }

    // 检查连接状态
    if (!whatsappService.isConnected()) {
      return res.status(503).json({ error: 'WhatsApp服务未连接，请稍后再试' });
    }

    let result;
    switch (type) {
      case 'text':
        result = await whatsappService.sendTextMessage(to, message);
        break;
      case 'image':
        // 处理图片发送逻辑（需要图片URL或base64数据）
        return res.status(400).json({ error: '图片消息发送功能暂未实现' });
      case 'document':
        // 处理文档发送逻辑
        return res.status(400).json({ error: '文档消息发送功能暂未实现' });
      default:
        return res.status(400).json({ error: `不支持的消息类型: ${type}` });
    }

    return res.status(200).json({
      success: true,
      message: '消息发送成功',
      result
    });
  } catch (error) {
    console.error(`发送WhatsApp消息失败:`, error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};