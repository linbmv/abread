// api/cron.js - 定时任务
import { db } from './_lib/db.js';

export default async function handler(req, res) {
  // 验证是否来自 Vercel Cron
  const authHeader = req.headers['authorization'];
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error('CRON_SECRET 环境变量未设置');
    return res.status(500).json({ error: '服务器配置错误：CRON_SECRET 未设置' });
  }

  if (authHeader !== expectedAuth) {
    console.error('定时任务验证失败，接收到的认证头:', authHeader, '期望:', expectedAuth);
    return res.status(401).json({ error: '未授权的访问' });
  }

  try {
    console.log('开始执行定时任务 at', new Date().toISOString());

    // 获取所有用户和配置
    const users = await db.getUsers();
    console.log(`获取到 ${users.length} 个用户`);

    const config = await db.getConfig();
    const maxUnreadDays = config.maxUnreadDays || 7;
    console.log(`最大未读天数配置: ${maxUnreadDays}`);

    let processedUsers = 0;
    for (const user of users) {
      if (!user.frozen) {
        if (!user.isRead) {
          user.unreadDays++;
          if (user.unreadDays >= maxUnreadDays) {
            user.frozen = true;
            user.unreadDays = maxUnreadDays;
            console.log(`用户 ${user.name} 已被冻结，未读天数: ${user.unreadDays}`);
          } else {
            console.log(`用户 ${user.name} 未读天数增加到: ${user.unreadDays}`);
          }
        } else {
          user.isRead = false;
          user.unreadDays = 1;
          console.log(`用户 ${user.name} 状态重置为未读`);
        }
        await db.updateUser(user.id, {
          isRead: user.isRead,
          unreadDays: user.unreadDays,
          frozen: user.frozen
        });
        processedUsers++;
      } else {
        console.log(`用户 ${user.name} 已被冻结，跳过处理`);
      }
    }

    await db.updateLastResetTime();
    console.log(`定时任务完成。处理了 ${processedUsers} 个用户，总共 ${users.length} 个用户。`);

    res.json({
      message: 'Cron job executed successfully',
      processedUsers: processedUsers,
      totalUsers: users.length,
      result: users.length
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ error: 'Cron job failed', details: error.message });
  }
}
