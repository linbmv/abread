/* eslint-disable no-undef */
// /api/notification.js - 消息推送API

const { generateStatisticsText } = require('./_lib/utils.js');

// 统一的消息推送服务
class NotificationService {
    // 发送到Telegram
    async sendTelegram(message) {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!token || !chatId) {
            throw new Error('Telegram token或chat ID未配置');
        }
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message }),
        });
    }

    // 发送到WhatsApp (通过特定服务，此处为示例)
    async sendWhatsApp(message) {
        // WhatsApp Business API的实现会更复杂，这里仅作演示
        console.log('正在推送到WhatsApp:', message);
        // 实际应调用WhatsApp Business API
        if (!process.env.WHATSAPP_API_URL) {
             console.warn('WhatsApp API URL未配置');
             return;
        }
        // 示例: await fetch(process.env.WHATSAPP_API_URL, ...);
    }

    // 发送到Bark
    async sendBark(message) {
        const barkUrl = process.env.BARK_URL;
        if (!barkUrl) {
            throw new Error('Bark URL未配置');
        }
        // Bark的URL通常是 https://api.day.app/your_device_key/推送内容
        await fetch(`${barkUrl}/${encodeURIComponent(message)}`);
    }

    // 发送到通用Webhook
    async sendWebhook(message) {
        const webhookUrl = process.env.WEBHOOK_URL;
        if (!webhookUrl) {
            throw new Error('Webhook URL未配置');
        }
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message }), // 很多webhook接受content字段
        });
    }

    async send(channel, message) {
        const adapters = {
            'telegram': this.sendTelegram,
            'whatsapp': this.sendWhatsApp,
            'bark': this.sendBark,
            'webhook': this.sendWebhook
        };
        if (!adapters[channel]) {
            throw new Error(`不支持的消息渠道: ${channel}`);
        }
        return adapters[channel](message);
    }
}

// Vercel Serverless Function for notification
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
    const { channel, message } = req.body;

    if (!channel || !message) {
      return res.status(400).json({ error: '缺少channel或message参数' });
    }

    const notificationService = new NotificationService();
    await notificationService.send(channel, message);

    return res.status(200).json({ success: true, message: `消息已发送到 ${channel}` });
  } catch (error) {
    console.error(`发送到 ${channel} 失败:`, error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};
