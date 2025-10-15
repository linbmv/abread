/* eslint-disable no-undef */
// /api/statistics.js - 统计信息API

const { db } = require('./_lib/db.js');
const { generateStatisticsText } = require('./_lib/utils.js');

// Vercel Serverless Function for statistics
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const users = await db.getUsers();
    const statsText = generateStatisticsText(users);

    return res.status(200).json({ statistics: statsText });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return res.status(500).json({ error: '获取统计信息失败' });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};
