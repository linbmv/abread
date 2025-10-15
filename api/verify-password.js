// /api/verify-password.js - 密码验证API
const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// 对于Vercel Node.js运行时的密码验证API
module.exports = async function handler(request, response) {
  // 确定HTTP方法
  const { method } = request;

  // 设置CORS头部
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (method === 'POST') {
    try {
      let body = '';
      for await (const chunk of request) {
        body += chunk;
      }

      const { password } = JSON.parse(body);

      // 从环境变量获取密码，如果不存在则使用默认密码
      const correctPassword = process.env.APP_PASSWORD || 'admin123';

      if (password === correctPassword) {
        response.status(200).json({ valid: true });
      } else {
        response.status(401).json({ valid: false, error: '密码错误' });
      }
    } catch (error) {
      console.error('密码验证失败:', error);
      response.status(500).json({ error: '密码验证失败' });
    }
  } else {
    response.status(405).json({ error: 'Method not allowed' });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};
