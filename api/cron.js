// api/cron.js - 定时任务
import { db } from './_lib/db.js';
import { generateStatisticsText } from '../backend/utils.js';

export default async function handler(req, res) {
  // 验证是否来自 Vercel Cron
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_AUTH_TOKEN}`) {
    return res.status(401).json({ error: '未授权的访问' });
  }

  try {
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
    
    res.json({ message: 'Cron job executed successfully', result: users.length });
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ error: 'Cron job failed' });
  }
}
