/* eslint-disable no-undef */
// /api/users.js - 用户管理API

// 由于Vercel构建问题，需要使用require导入
const { db } = require('./_lib/db.js');
const { validateUser } = require('./_lib/utils.js');

// Vercel Serverless Function for user management
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
    if (req.method === 'GET') {
      const users = await db.getUsers();
      return res.status(200).json(users);
    }

    if (req.method === 'POST') {
      const { names } = req.body;

      if (!names || !Array.isArray(names) || names.length === 0) {
        return res.status(400).json({ error: '用户名列表不能为空' });
      }

      // 验证用户名
      for (const name of names) {
        if (!validateUser({ name })) {
          return res.status(400).json({ error: `用户名 "${name}" 无效` });
        }
      }

      const createdUsers = [];
      for (const name of names) {
        const user = await db.addUser({
          name,
          isRead: false,  // 新用户默认未读
          unreadDays: 1,  // 新用户未读天数为1
          frozen: false,
          createdAt: new Date().toISOString()
        });
        createdUsers.push(user);
      }

      return res.status(201).json(createdUsers);
    }

    if (req.method === 'PUT') {
      // 从URL中提取用户ID (假设URL格式为 /api/users/:id)
      const urlParts = req.url.split('/');
      const userId = urlParts[urlParts.length - 1];

      if (!userId) {
        return res.status(400).json({ error: '用户ID不能为空' });
      }

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
      // 从URL中提取用户ID
      const urlParts = req.url.split('/');
      const userId = urlParts[urlParts.length - 1];

      if (!userId) {
        return res.status(400).json({ error: '用户ID不能为空' });
      }

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