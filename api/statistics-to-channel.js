/* eslint-disable no-undef */
// /api/statistics-to-channel.js - 将统计信息发送到指定渠道
const { db } = require('./_lib/db.js');
const { generateStatisticsText } = require('./_lib/utils.js');
const NotificationService = require('./notification.js');

// Vercel Serverless Function for sending statistics to specific channels
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
    const { channel, customStats } = req.body;

    if (!channel) {
      return res.status(400).json({ error: '缺少 channel 参数' });
    }

    // 获取当前用户列表以生成最新的统计数据
    const users = await db.getUsers();
    const statsText = generateStatisticsText(users);

    // 使用提供的自定义统计信息或生成的统计信息
    const messageToSend = customStats || statsText;

    // 创建通知服务实例并发送
    const notificationService = new NotificationService();

    // 如果channel为'all'，则发送到所有已配置的渠道
    let result;
    if (channel === 'all' || channel === 'all_channels') {
      result = await notificationService.sendToAllChannels(messageToSend);
      return res.status(200).json({
        success: true,
        message: result.message,
        channel: channel,
        details: result
      });
    } else {
      await notificationService.send(channel, messageToSend);
      return res.status(200).json({
        success: true,
        message: `统计信息已成功发送到 ${channel}`,
        channel: channel
      });
    }
  } catch (error) {
    console.error(`发送统计信息到 ${channel} 失败:`, error);
    return res.status(500).json({ error: `发送统计信息失败: ${error.message}` });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};