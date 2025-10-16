require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');

// 使用本地库文件
const { db } = require('./db');
const { generateStatisticsText, validateUser } = require('./utils');

const app = express();
app.use(cors());
app.use(express.json());

// --- API 路由 ---

// 获取所有用户
app.get('/api/users', async (req, res) => {
    try {
        const users = await db.getUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 添加用户
app.post('/api/users', async (req, res) => {
    try {
        const { names } = req.body;
        if (!names || !Array.isArray(names) || names.length === 0) {
            return res.status(400).json({ error: '用户名列表不能为空' });
        }

        const createdUsers = [];
        for (const name of names) {
            if (!validateUser({ name })) {
                return res.status(400).json({ error: `用户名 "${name}" 无效` });
            }
            const user = await db.addUser({ name, isRead: false, unreadDays: 1, frozen: false, createdAt: new Date().toISOString() });
            createdUsers.push(user);
        }
        res.status(201).json(createdUsers);
    } catch (error) {
        res.status(500).json({ error: '添加用户失败' });
    }
});

// 更新用户
app.put('/api/users/:id', async (req, res) => {
    try {
        const updatedUser = await db.updateUser(req.params.id, req.body);
        if (!updatedUser) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: '更新用户失败' });
    }
});

// 删除用户
app.delete('/api/users/:id', async (req, res) => {
    try {
        const result = await db.deleteUser(req.params.id);
        if (!result) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json({ message: '用户删除成功' });
    } catch (error) {
        res.status(500).json({ error: '删除用户失败' });
    }
});

// 获取统计信息
app.get('/api/statistics', async (req, res) => {
    try {
        const users = await db.getUsers();
        const statsText = generateStatisticsText(users);
        res.json({ statistics: statsText });
    } catch (error) {
        res.status(500).json({ error: '获取统计信息失败' });
    }
});

// 密码验证
app.post('/api/verify-password', async (req, res) => {
    try {
        const { password } = req.body;
        // 从环境变量获取密码，如果不存在则使用默认密码
        const correctPassword = process.env.APP_PASSWORD || 'admin123';
        
        if (password === correctPassword) {
            res.json({ valid: true });
        } else {
            res.status(401).json({ valid: false, error: '密码错误' });
        }
    } catch (error) {
        res.status(500).json({ error: '密码验证失败' });
    }
});

// --- 定时任务 ---
async function runCronJob() {
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
    return users; // Return for testing purposes
}

// 只在非 Vercel 环境中启动本地定时任务（避免重复执行）
if (!process.env.VERCEL_ENV) {
    // 每天凌晨4点执行
    cron.schedule('0 4 * * *', runCronJob, {
        timezone: process.env.TIMEZONE || 'Asia/Shanghai'
    });
    console.log('Local cron job scheduled for 04:00 daily');
} else {
    console.log('Running on Vercel, using Vercel Cron instead of local cron');
}

// Test endpoint to manually trigger cron job for testing
app.post('/api/test-cron', async (req, res) => {
    try {
        const result = await runCronJob();
        res.json({ message: 'Cron job executed successfully', result });
    } catch (error) {
        console.error('Cron job failed:', error);
        res.status(500).json({ error: 'Cron job failed' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
});
