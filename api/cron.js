// /api/cron.js - Vercel Cron Job 处理器
import { db } from './_lib/db.js';
import { generateStatisticsText } from './_lib/utils.js';

// 核心业务逻辑：重置用户状态
async function resetUserStates() {
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
            await db.updateUser(user.id, {
                isRead: user.isRead,
                unreadDays: user.unreadDays,
                frozen: user.frozen
            });
        }
    }
    await db.updateLastResetTime();
}

// 获取最新的读经计划文本
async function getReadingPlan() {
    try {
        const response = await fetch('https://gist.githubusercontent.com/linbmv/8adb195011a6422d4ee40f773f32a8fa/raw/bible_reading_plan.txt');
        if (!response.ok) return '';
        let text = await response.text();
        return text.replace(/[
]+/g, ' ').trim();
    } catch (error) {
        console.error('获取读经计划失败:', error);
        return '';
    }
}

// 主处理函数
export async function GET(request) {
    try {
        // 在Vercel环境中，可以通过Authorization Header来保护Cron Job
        const authHeader = request.headers.get('authorization');
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        // 1. 执行用户状态重置
        await resetUserStates();

        // 2. 生成统计信息
        const users = await db.getUsers();
        let statsText = generateStatisticsText(users);

        // 3. 获取并附加读经计划
        const plan = await getReadingPlan();
        if (plan) {
            statsText += `
今日读经计划：${plan}`;
        }

        // 4. (可选) 自动发送通知
        // 如果需要，可以在这里调用notification API
        // 例如：await fetch(`${process.env.VERCEL_URL}/api/notification`, ...)

        return new Response(`Cron job executed successfully at ${new Date().toISOString()}
Statistics:
${statsText}`, {
            status: 200,
        });

    } catch (error) {
        console.error('Cron job failed:', error);
        return new Response('Cron job failed', { status: 500 });
    }
}
