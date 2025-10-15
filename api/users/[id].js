// api/users/[id].js - 获取、更新、删除单个用户
import { db } from '../../api/_lib/db.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      // 获取所有用户并查找指定ID的用户
      const users = await db.getUsers();
      const user = users.find(u => u.id == id);
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error('获取用户失败:', error);
      res.status(500).json({ error: '获取用户失败' });
    }
  } else if (req.method === 'PUT') {
    try {
      const updatedUser = await db.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('更新用户失败:', error);
      res.status(500).json({ error: '更新用户失败' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await db.deleteUser(id);
      if (!result) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.status(200).json({ message: '用户删除成功' });
    } catch (error) {
      console.error('删除用户失败:', error);
      res.status(500).json({ error: '删除用户失败' });
    }
  } else {
    res.status(405).json({ error: '方法不允许' });
  }
}
