/* eslint-disable no-undef */
// /api/verify-password.js - 密码验证API

// Vercel Serverless Function for password verification
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
    const { password } = req.body;

    // Get password from environment variable, default to 'admin123'
    const correctPassword = process.env.APP_PASSWORD || 'admin123';

    if (password === correctPassword) {
      return res.status(200).json({ valid: true });
    } else {
      return res.status(401).json({ valid: false, error: '密码错误' });
    }
  } catch (error) {
    console.error('密码验证失败:', error);
    return res.status(500).json({ error: '密码验证失败' });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};
