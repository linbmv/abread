/* eslint-disable no-undef */
// /api/statistics-send.js - 发送统计信息API
const { db } = require('./_lib/db.js');
const { generateStatisticsText } = require('./_lib/utils.js');

// Vercel Serverless Function for sending statistics
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
    const { stats, channel = 'notification' } = req.body;

    // 获取当前用户列表以生成最新的统计数据
    const users = await db.getUsers();
    const statsText = generateStatisticsText(users);

    // 如果提供了具体的统计数据，则使用提供的数据，否则使用生成的数据
    const messageToSend = stats || statsText;

    // 这里可以添加发送到不同平台的逻辑
    if (channel === 'notification') {
      // 默认行为：记录但不实际发送
      console.log('统计信息已生成（未发送）:', messageToSend);
      return res.status(200).json({
        message: '统计信息已生成',
        statistics: messageToSend
      });
    } else {
      // 如果指定了其他渠道，则需要调用notification服务
      // 由于在serverless环境中直接调用其他服务可能复杂，这里返回错误提示
      return res.status(400).json({
        error: '请使用 /api/notification 端点发送到特定渠道',
        message: '统计信息已生成',
        statistics: messageToSend
      });
    }
  } catch (error) {
    console.error('发送统计信息失败:', error);
    return res.status(500).json({ error: '发送统计信息失败' });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};