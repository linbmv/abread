// api/user-id.js - 通过查询参数处理单个用户
import { db } from '../backend/db.js';

export default async function handler(req, res) {
  const { id, method } = req.query;

  if (!id) {
    return res.status(400).json({ error: '用户ID是必需的' });
  }

  // 根据请求方法确定操作
  const requestMethod = method || req.method;

  if (requestMethod === 'GET') {
    try {
      const user = await db.getUserById(id);
      if (!user) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: '获取用户失败' });
    }
  } else if (requestMethod === 'PUT') {
    try {
      const updatedUser = await db.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: '更新用户失败' });
    }
  } else if (requestMethod === 'DELETE') {
    try {
      const result = await db.deleteUser(id);
      if (!result) {
        return res.status(404).json({ error: '用户不存在' });
      }
      res.status(200).json({ message: '用户删除成功' });
    } catch (error) {
      res.status(500).json({ error: '删除用户失败' });
    }
  } else {
    res.status(405).json({ error: '方法不允许' });
  }
}