// api/statistics/index.js - 获取统计信息
import { db } from '../../backend/db.js';
import { generateStatisticsText } from '../../backend/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const users = await db.getUsers();
    const statsText = generateStatisticsText(users);
    res.json({ statistics: statsText });
  } catch (error) {
    res.status(500).json({ error: '获取统计信息失败' });
  }
}
