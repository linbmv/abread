// api/v1.js - 统一 API 入口点，处理所有 API 请求
import { db } from '../backend/db.js';
import { generateStatisticsText } from '../backend/utils.js';

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  const pathParts = pathname.split('/').filter(Boolean);

  // 基础路径验证
  if (pathParts[0] !== 'api' || !pathParts[1]) {
    return res.status(404).json({ error: 'API 端点不存在' });
  }

  // 移除 'api' 和版本部分
  const apiParts = pathParts.slice(2); // 例如 ['users'], ['users', '123'], ['verify-password'] 等

  try {
    if (apiParts[0] === 'verify-password') {
      // 处理密码验证
      if (req.method === 'POST') {
        const { password } = req.body || {};
        const correctPassword = process.env.APP_PASSWORD || 'admin123';

        if (password === correctPassword) {
          return res.json({ valid: true });
        } else {
          return res.status(401).json({ valid: false, error: '密码错误' });
        }
      } else {
        return res.status(405).json({ error: '方法不允许' });
      }
    } else if (apiParts[0] === 'users') {
      // 处理用户相关请求
      if (apiParts.length === 1) {
        // /api/users - 获取/添加用户
        if (req.method === 'GET') {
          const users = await db.getUsers();
          return res.json(users);
        } else if (req.method === 'POST') {
          const { names } = req.body || {};
          if (!names || !Array.isArray(names) || names.length === 0) {
            return res.status(400).json({ error: '用户名列表不能为空' });
          }

          const { validateUser } = await import('../backend/utils.js');
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
          return res.status(201).json(createdUsers);
        } else {
          return res.status(405).json({ error: '方法不允许' });
        }
      } else if (apiParts.length >= 2) {
        // /api/users/:id - 获取/更新/删除单个用户
        const userId = apiParts[1];

        if (req.method === 'GET') {
          const user = await db.getUserById(userId);
          if (!user) {
            return res.status(404).json({ error: '用户不存在' });
          }
          return res.json(user);
        } else if (req.method === 'PUT') {
          const updatedUser = await db.updateUser(userId, req.body);
          if (!updatedUser) {
            return res.status(404).json({ error: '用户不存在' });
          }
          return res.json(updatedUser);
        } else if (req.method === 'DELETE') {
          const result = await db.deleteUser(userId);
          if (!result) {
            return res.status(404).json({ error: '用户不存在' });
          }
          return res.json({ message: '用户删除成功' });
        } else {
          return res.status(405).json({ error: '方法不允许' });
        }
      }
    } else if (apiParts[0] === 'statistics') {
      // 处理统计相关请求
      if (apiParts.length === 1 && req.method === 'GET') {
        // /api/statistics - 获取统计信息
        const users = await db.getUsers();
        const statsText = generateStatisticsText(users);
        return res.json({ statistics: statsText });
      } else if (apiParts.length === 1 && req.method === 'POST') {
        // /api/send-statistics - 发送统计信息
        const { statistics } = req.body;
        console.log('Sending statistics:', statistics);
        return res.json({ success: true, message: '统计信息已发送' });
      } else {
        return res.status(405).json({ error: '方法不允许' });
      }
    } else if (apiParts[0] === 'cron') {
      // 处理定时任务
      if (req.method !== 'POST') {
        return res.status(405).json({ error: '方法不允许' });
      }

      // 验证是否来自 Vercel Cron
      const authHeader = req.headers['authorization'];
      if (authHeader !== `Bearer ${process.env.CRON_AUTH_TOKEN}`) {
        return res.status(401).json({ error: '未授权的访问' });
      }

      console.log('Running cron job at', new Date().toISOString());
      const users = await db.getUsers();
      const config = await db.getConfig();
      const maxUnreadDays = config.maxUnreadDays || 7;

      for (const user of users) {
        if (!user.frozen) {
          if (!user.isRead) {
            user.unreadDays++;
            if (user.unreadDays >= maxUnreadDays) {
              user.frozen = true;
              user.unreadDays = maxUnreadDays;
            }
          } else {
            user.isRead = false;
            user.unreadDays = 1;
          }
          await db.updateUser(user.id, { isRead: user.isRead, unreadDays: user.unreadDays, frozen: user.frozen });
        }
      }
      await db.updateLastResetTime();
      console.log('Cron job finished.');

      return res.json({ message: 'Cron job executed successfully', result: users.length });
    } else {
      return res.status(404).json({ error: 'API 端点不存在' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}