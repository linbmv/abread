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

    console.log('收到请求参数:', { id, idType: typeof id });
    console.log('请求方法:', req.method);
    console.log('请求体:', req.body);

    if (!id) {
      console.log('ID参数为空或未定义');
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    // 尝试将ID转换为数字（因为用户ID是使用Date.now()创建的数字ID）
    const userId = isNaN(id) ? id : Number(id);
    console.log('转换后的用户ID:', userId, '类型:', typeof userId);

    if (req.method === 'PUT') {
      const updates = req.body;
      console.log('PUT请求 - 更新数据:', updates);

      // 验证更新数据
      if (updates.name !== undefined && !validateUser({ name: updates.name })) {
        console.log('用户名验证失败:', updates.name);
        return res.status(400).json({ error: '用户名无效' });
      }

      if (updates.unreadDays !== undefined && (updates.unreadDays < 0 || updates.unreadDays > 7)) {
        console.log('未读天数验证失败:', updates.unreadDays);
        return res.status(400).json({ error: '未读天数必须在0-7之间' });
      }

      console.log('调用db.updateUser，userId:', userId, 'type:', typeof userId, 'updates:', updates);
      const updatedUser = await db.updateUser(userId, updates);
      console.log('db.updateUser结果:', updatedUser);

      if (!updatedUser) {
        console.log('用户不存在，ID:', userId);
        return res.status(404).json({ error: '用户不存在' });
      }

      return res.status(200).json(updatedUser);
    }

    if (req.method === 'DELETE') {
      console.log('调用db.deleteUser，userId:', userId, 'type:', typeof userId);
      const result = await db.deleteUser(userId);
      console.log('db.deleteUser结果:', result);

      if (!result) {
        console.log('删除失败，用户不存在，ID:', userId);
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