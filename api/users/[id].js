/* eslint-disable no-undef */
// /api/users/[id].js - 特定用户管理API

// 由于Vercel构建问题，需要使用require导入
const { db } = require('../../_lib/db.js');
const { validateUser } = require('../../_lib/utils.js');

// Vercel Serverless Function for specific user management
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 从URL参数中提取用户ID
    const { id } = req.query;
    const userId = id;

    if (!userId) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    if (req.method === 'PUT') {
      const updates = req.body;

      // 验证更新数据
      if (updates.name !== undefined && !validateUser({ name: updates.name })) {
        return res.status(400).json({ error: '用户名无效' });
      }

      if (updates.unreadDays !== undefined && (updates.unreadDays < 0 || updates.unreadDays > 7)) {
        return res.status(400).json({ error: '未读天数必须在0-7之间' });
      }

      const updatedUser = await db.updateUser(userId, updates);

      if (!updatedUser) {
        return res.status(404).json({ error: '用户不存在' });
      }

      return res.status(200).json(updatedUser);
    }

    if (req.method === 'DELETE') {
      const result = await db.deleteUser(userId);

      if (!result) {
        return res.status(404).json({ error: '用户不存在' });
      }

      return res.status(200).json({ message: '用户删除成功' });
    }

    // 方法不被允许
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('用户操作失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
};

module.exports.config = {
  runtime: 'nodejs',
};