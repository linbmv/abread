// api/v1.js - 统一 API 入口点，处理所有 API 请求
import { db } from '../backend/db.js';
import { generateStatisticsText } from '../backend/utils.js';

export default async function handler(req, res) {
  // 添加调试日志
  console.log('API Handler被调用');
  console.log('请求URL:', req.url);
  console.log('请求方法:', req.method);
  console.log('请求头:', JSON.stringify(req.headers, null, 2));

  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  const pathParts = pathname.split('/').filter(Boolean);

  console.log('路径部分:', pathParts);

  // 基础路径验证
  if (pathParts[0] !== 'api' || !pathParts[1]) {
    console.log('路径验证失败 - 不是API请求或缺少版本');
    return res.status(404).json({ error: 'API 端点不存在' });
  }

  // 移除 'api' 和版本部分
  const apiParts = pathParts.slice(2); // 例如 ['users'], ['users', '123'], ['verify-password'] 等
  console.log('API路径部分:', apiParts);

  try {
    if (apiParts[0] === 'verify-password') {
      console.log('处理密码验证请求');
      // 处理密码验证
      if (req.method === 'POST') {
        const { password } = req.body || {};
        const correctPassword = process.env.APP_PASSWORD || 'admin123';

        console.log('验证密码:', password);
        if (password === correctPassword) {
          console.log('密码验证成功');
          return res.json({ valid: true });
        } else {
          console.log('密码验证失败');
          return res.status(401).json({ valid: false, error: '密码错误' });
        }
      } else {
        console.log('错误的HTTP方法:', req.method);
        return res.status(405).json({ error: '方法不允许' });
      }
    } else if (apiParts[0] === 'users') {
      console.log('处理用户请求:', apiParts.length > 1 ? `ID: ${apiParts[1]}` : '列表');
      // 处理用户相关请求
      if (apiParts.length === 1) {
        // /api/users - 获取/添加用户
        if (req.method === 'GET') {
          console.log('获取用户列表');
          const users = await db.getUsers();
          return res.json(users);
        } else if (req.method === 'POST') {
          console.log('添加用户');
          const { names } = req.body || {};
          if (!names || !Array.isArray(names) || names.length === 0) {
            console.log('用户列表无效');
            return res.status(400).json({ error: '用户名列表不能为空' });
          }

          const { validateUser } = await import('../backend/utils.js');
          const createdUsers = [];
          for (const name of names) {
            if (!validateUser({ name })) {
              console.log(`用户名 "${name}" 无效`);
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
          console.log(`成功创建 ${createdUsers.length} 个用户`);
          return res.status(201).json(createdUsers);
        } else {
          console.log('用户列表 - 错误的HTTP方法:', req.method);
          return res.status(405).json({ error: '方法不允许' });
        }
      } else if (apiParts.length >= 2) {
        // /api/users/:id - 获取/更新/删除单个用户
        const userId = apiParts[1];
        console.log(`处理用户ID: ${userId}`);

        if (req.method === 'GET') {
          console.log(`获取用户 ${userId}`);
          const user = await db.getUserById(userId);
          if (!user) {
            console.log(`用户 ${userId} 不存在`);
            return res.status(404).json({ error: '用户不存在' });
          }
          return res.json(user);
        } else if (req.method === 'PUT') {
          console.log(`更新用户 ${userId}`);
          const updatedUser = await db.updateUser(userId, req.body);
          if (!updatedUser) {
            console.log(`用户 ${userId} 不存在`);
            return res.status(404).json({ error: '用户不存在' });
          }
          return res.json(updatedUser);
        } else if (req.method === 'DELETE') {
          console.log(`删除用户 ${userId}`);
          const result = await db.deleteUser(userId);
          if (!result) {
            console.log(`用户 ${userId} 不存在`);
            return res.status(404).json({ error: '用户不存在' });
          }
          return res.json({ message: '用户删除成功' });
        } else {
          console.log(`用户 ${userId} - 错误的HTTP方法:`, req.method);
          return res.status(405).json({ error: '方法不允许' });
        }
      }
    } else if (apiParts[0] === 'statistics') {
      console.log('处理统计请求');
      // 处理统计相关请求
      if (apiParts.length === 1 && req.method === 'GET') {
        // /api/statistics - 获取统计信息
        console.log('获取统计信息');
        const users = await db.getUsers();
        const statsText = generateStatisticsText(users);
        return res.json({ statistics: statsText });
      } else if (apiParts.length === 1 && req.method === 'POST') {
        // /api/send-statistics - 发送统计信息
        console.log('发送统计信息');
        const { statistics } = req.body;
        console.log('发送的统计数据:', statistics);
        return res.json({ success: true, message: '统计信息已发送' });
      } else {
        console.log('统计请求 - 错误的HTTP方法或路径:', req.method, apiParts);
        return res.status(405).json({ error: '方法不允许' });
      }
    } else if (apiParts[0] === 'cron') {
      console.log('处理定时任务请求');
      // 处理定时任务
      if (req.method !== 'POST') {
        console.log('定时任务 - 错误的HTTP方法:', req.method);
        return res.status(405).json({ error: '方法不允许' });
      }

      // 验证是否来自 Vercel Cron
      const authHeader = req.headers['authorization'];
      console.log('Cron认证头:', authHeader ? '存在' : '不存在');
      if (authHeader !== `Bearer ${process.env.CRON_AUTH_TOKEN}`) {
        console.log('Cron认证失败');
        return res.status(401).json({ error: '未授权的访问' });
      }

      console.log('运行定时任务');
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
      console.log('定时任务完成');

      return res.json({ message: 'Cron job executed successfully', result: users.length });
    } else {
      console.log('未知API端点:', apiParts[0]);
      return res.status(404).json({ error: 'API 端点不存在' });
    }
  } catch (error) {
    console.error('API Error:', error);
    console.error('错误堆栈:', error.stack);
    return res.status(500).json({ error: '服务器内部错误', details: error.message });
  }
}