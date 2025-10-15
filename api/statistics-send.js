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
    const { stats } = req.body;

    // 获取当前用户列表以生成最新的统计数据
    const users = await db.getUsers();
    const statsText = generateStatisticsText(users);

    // 这里可以添加发送到WhatsApp或其他平台的逻辑
    // 暂时只是返回生成的统计文本
    return res.status(200).json({
      message: '统计信息已生成',
      statistics: statsText
    });
  } catch (error) {
    console.error('发送统计信息失败:', error);
    return res.status(500).json({ error: '发送统计信息失败' });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};