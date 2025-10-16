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

    // 发送到WhatsApp (通过WhatsApp Business Cloud API)
    async sendWhatsApp(message) {
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID; // WhatsApp Business Account Phone Number ID
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN; // WhatsApp Business API Access Token
        const recipientPhone = process.env.WHATSAPP_RECIPIENT_PHONE; // 接收消息的手机号

        if (!phoneNumberId || !accessToken || !recipientPhone) {
            console.warn('WhatsApp 配置未完全设置 (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_RECIPIENT_PHONE)');
            return;
        }

        try {
            // WhatsApp Business Cloud API 的端点
            const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: recipientPhone, // 格式: 1234567890 (不带+号)
                    type: 'text',
                    text: {
                        body: message
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`发送 WhatsApp 消息失败: ${errorData.error?.message || response.statusText}`);
            }

            console.log('WhatsApp 消息发送成功');
        } catch (error) {
            console.error('发送 WhatsApp 消息失败:', error);
            throw error;
        }
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

    // 发送到所有已配置的渠道
    async sendToAllChannels(message) {
        const channels = [];

        // 检查并收集所有已配置的渠道
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            channels.push('telegram');
        }

        if (process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_RECIPIENT_PHONE) {
            channels.push('whatsapp');
        }

        if (process.env.BARK_URL) {
            channels.push('bark');
        }

        if (process.env.WEBHOOK_URL) {
            channels.push('webhook');
        }

        if (channels.length === 0) {
            throw new Error('没有配置任何通知渠道');
        }

        // 并行发送到所有已配置的渠道
        const results = await Promise.allSettled(
            channels.map(channel => this.send(channel, message))
        );

        // 记录结果
        const successful = [];
        const failed = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successful.push(channels[index]);
            } else {
                failed.push({ channel: channels[index], error: result.reason });
            }
        });

        return {
            successful,
            failed,
            total: channels.length,
            message: `成功发送到 ${successful.length}/${channels.length} 个渠道`
        };
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

    if (!message) {
      return res.status(400).json({ error: '缺少message参数' });
    }

    const notificationService = new NotificationService();

    // 如果channel为'all'，则发送到所有已配置的渠道
    let result;
    if (channel === 'all' || channel === 'all_channels') {
      result = await notificationService.sendToAllChannels(message);
      return res.status(200).json({
        success: true,
        message: result.message,
        details: result
      });
    } else {
      if (!channel) {
        return res.status(400).json({ error: '缺少channel参数' });
      }
      await notificationService.send(channel, message);
      return res.status(200).json({ success: true, message: `消息已发送到 ${channel}` });
    }
  } catch (error) {
    console.error(`发送通知失败:`, error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};
