require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

// 根据环境选择数据库实现
const isVercel = process.env.VERCEL_ENV || process.env.VERCEL || process.env.EDGE_CONFIG; // Vercel环境变量
let dbModule;
if (isVercel) {
  // Vercel环境使用Edge Config
  ({ db: dbModule } = require('./backend/db'));
} else {
  // 本地开发环境使用本地数据库
  ({ db: dbModule } = require('./backend/local-db'));
}

const { generateStatisticsText, validateUser } = require('./backend/utils');

const app = express();
app.use(cors());
app.use(express.json());

// 根据环境服务构建后的静态文件
const staticDir = process.env.VERCEL ? 'dist' : 'frontend/dist';
const staticPath = path.join(__dirname, staticDir);
if (require('fs').existsSync(staticPath)) {
  app.use(express.static(staticPath));
} else {
  console.warn(`警告: 静态文件目录 ${staticPath} 不存在`);
}

// --- API 路由 ---
// 获取所有用户
app.get('/api/users', async (req, res) => {
    try {
        const users = await dbModule.getUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 获取单个用户
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await dbModule.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: '获取用户失败' });
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
            const user = await dbModule.addUser({ name, isRead: false, unreadDays: 1, frozen: false, createdAt: new Date().toISOString() });
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
        const updatedUser = await dbModule.updateUser(req.params.id, req.body);
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
        const result = await dbModule.deleteUser(req.params.id);
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
        const users = await dbModule.getUsers();
        const statsText = generateStatisticsText(users);
        res.json({ statistics: statsText });
    } catch (error) {
        res.status(500).json({ error: '获取统计信息失败' });
    }
});

// 发送统计信息
app.post('/api/send-statistics', async (req, res) => {
    try {
        // 这里可以添加发送到WhatsApp等的逻辑
        const { statistics } = req.body;
        console.log('Sending statistics:', statistics);
        res.json({ success: true, message: '统计信息已发送' });
    } catch (error) {
        res.status(500).json({ error: '发送统计信息失败' });
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
    try {
        console.log('开始执行定时任务 at', new Date().toISOString());

        // 获取所有用户和配置
        const users = await dbModule.getUsers();
        console.log(`获取到 ${users.length} 个用户`);

        const config = await dbModule.getConfig();
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
                await dbModule.updateUser(user.id, {
                    isRead: user.isRead,
                    unreadDays: user.unreadDays,
                    frozen: user.frozen
                });
                processedUsers++;
            } else {
                console.log(`用户 ${user.name} 已被冻结，跳过处理`);
            }
        }

        await dbModule.updateLastResetTime();
        console.log(`定时任务完成。处理了 ${processedUsers} 个用户，总共 ${users.length} 个用户。`);

        return users; // Return for testing purposes
    } catch (error) {
        console.error('定时任务执行失败:', error);
        throw error;
    }
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

// SPA路由 - 在所有API路由之后
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// Vercel 兼容的处理函数
const handler = (req, res) => {
  // 检查是否已经构建了前端文件
  const staticDir = process.env.VERCEL ? 'dist' : 'frontend/dist';
  const path = require('path');

  // 动态设置静态文件目录，但只在第一次请求时设置
  // 检查是否已存在静态中间件，避免重复添加
  let hasStaticMiddleware = false;
  for (const layer of app._router.stack) {
    if (layer.name === 'serveStatic') {
      hasStaticMiddleware = true;
      break;
    }
  }

  if (!hasStaticMiddleware) {
    const express = require('express');
    app.use(express.static(path.join(__dirname, staticDir)));
  }

  // 代理请求到 Express 应用
  app(req, res);
};

// 只在非 Vercel 环境中启动服务器
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3003;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  // 导出 app 用于本地开发
  module.exports = app;
} else {
  // 在 Vercel 环境中导出处理函数
  module.exports = handler;
}