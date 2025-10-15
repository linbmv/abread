// api/users/index.js - 获取所有用户
import { db } from '../../backend/db.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const users = await db.getUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: '获取用户列表失败' });
    }
  } else if (req.method === 'POST') {
    try {
      const { names } = req.body;
      if (!names || !Array.isArray(names) || names.length === 0) {
        return res.status(400).json({ error: '用户名列表不能为空' });
      }

      const { validateUser } = await import('../../backend/utils.js');
      const createdUsers = [];
      for (const name of names) {
        if (!validateUser({ name })) {
          return res.status(400).json({ error: `用户名 "${name}" 无效` });
        }
        const user = await db.addUser({
          name,
          isRead: false,
          unreadDays: 1,
          frozen: false,
          createdAt: new Date().toISOString()
        });
        createdUsers.push(user);
      }
      res.status(201).json(createdUsers);
    } catch (error) {
      res.status(500).json({ error: '添加用户失败' });
    }
  } else {
    res.status(405).json({ error: '方法不允许' });
  }
}