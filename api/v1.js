// api/v1.js - 统一 API 入口点，处理所有 API 请求
// 使用动态导入来避免潜在的模块加载问题

export default async function handler(req, res) {
  // 添加调试日志
  console.log('API Handler被调用');
  console.log('请求URL:', req.url);
  console.log('请求方法:', req.method);
  console.log('请求头:', JSON.stringify(req.headers, null, 2));

  // 在Vercel中，由于路由重写，我们需要从原始URL路径中提取真实的API路径
  // vercel.json中的路由: "/api/(.*)" -> "/api/v1.js" 会重写请求
  // 例如：/api/users/123 -> /api/v1.js (但原始路径信息在req.url中)

  // 从请求URL中提取路径部分，移除查询参数
  const url = new URL('https://example.com' + req.url);
  const pathname = url.pathname;

  // 由于路由配置是 /api/(.*) -> /api/v1.js，我们需要移除 /api/ 前缀来获取实际API端点
  let actualPath = pathname;
  if (actualPath.startsWith('/api/')) {
    actualPath = actualPath.substring(4); // 移除 '/api' 前缀
  }

  const pathParts = actualPath.split('/').filter(Boolean);
  console.log('解析后的路径部分:', pathParts);
  console.log('原始路径:', pathname);
  console.log('处理后的路径:', actualPath);

  // 验证路径，确保至少有一个API端点部分
  if (pathParts.length === 0) {
    console.log('路径验证失败 - 没有API端点');
    return res.status(404).json({ error: 'API 端点不存在' });
  }

  const apiParts = pathParts; // 现在apiParts就是实际的API端点部分
  console.log('API路径部分:', apiParts);

  try {
    // 检查数据库模块是否可用
    let dbModule;
    try {
      // 使用统一的数据库模块 from api/_lib/db.js (Redis-based with Gist backup)
      const dbModuleRef = await import('./_lib/db.js');
      dbModule = dbModuleRef.db;
      console.log('数据库模块加载成功');
    } catch (dbError) {
      console.error('数据库模块加载失败:', dbError);
      return res.status(500).json({ error: '数据库模块初始化失败', details: dbError.message });
    }

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
          try {
            const users = await dbModule.getUsers();
            return res.json(users);
          } catch (error) {
            console.error('获取用户列表失败:', error);
            return res.status(500).json({ error: '获取用户列表失败', details: error.message });
          }
        } else if (req.method === 'POST') {
          console.log('添加用户');
          const { names } = req.body || {};
          if (!names || !Array.isArray(names) || names.length === 0) {
            console.log('用户列表无效');
            return res.status(400).json({ error: '用户名列表不能为空' });
          }

          try {
            const utilsModule = await import('../backend/utils.js');
            const { validateUser } = utilsModule;
            const createdUsers = [];
            for (const name of names) {
              if (!validateUser({ name })) {
                console.log(`用户名 "${name}" 无效`);
                return res.status(400).json({ error: `用户名 "${name}" 无效` });
              }
              const user = await dbModule.addUser({
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
          } catch (error) {
            console.error('添加用户失败:', error);
            return res.status(500).json({ error: '添加用户失败', details: error.message });
          }
        } else {
          console.log('用户列表 - 错误的HTTP方法:', req.method);
          return res.status(405).json({ error: '方法不允许' });
        }
      } else if (apiParts.length >= 2) {
        // /api/users/:id - 获取/更新/删除单个用户
        const userId = apiParts[1];
        console.log(`处理用户ID: ${userId}`);

        // 注意：dbModule 没有 getUserById 方法，使用 getUsers 并过滤
        if (req.method === 'GET') {
          console.log(`获取用户 ${userId}`);
          try {
            const users = await dbModule.getUsers();
            const user = users.find(u => u.id == userId);
            if (!user) {
              console.log(`用户 ${userId} 不存在`);
              return res.status(404).json({ error: '用户不存在' });
            }
            return res.json(user);
          } catch (error) {
            console.error('获取用户失败:', error);
            return res.status(500).json({ error: '获取用户失败', details: error.message });
          }
        } else if (req.method === 'PUT') {
          console.log(`更新用户 ${userId}`);
          try {
            const updatedUser = await dbModule.updateUser(userId, req.body);
            if (!updatedUser) {
              console.log(`用户 ${userId} 不存在`);
              return res.status(404).json({ error: '用户不存在' });
            }
            return res.json(updatedUser);
          } catch (error) {
            console.error('更新用户失败:', error);
            return res.status(500).json({ error: '更新用户失败', details: error.message });
          }
        } else if (req.method === 'DELETE') {
          console.log(`删除用户 ${userId}`);
          try {
            const result = await dbModule.deleteUser(userId);
            if (!result) {
              console.log(`用户 ${userId} 不存在`);
              return res.status(404).json({ error: '用户不存在' });
            }
            return res.json({ message: '用户删除成功' });
          } catch (error) {
            console.error('删除用户失败:', error);
            return res.status(500).json({ error: '删除用户失败', details: error.message });
          }
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
        try {
          const users = await dbModule.getUsers();
          const utilsModule = await import('../backend/utils.js');
          const { generateStatisticsText } = utilsModule;
          const statsText = generateStatisticsText(users);
          return res.json({ statistics: statsText });
        } catch (error) {
          console.error('获取统计信息失败:', error);
          return res.status(500).json({ error: '获取统计信息失败', details: error.message });
        }
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
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('Cron认证失败');
        return res.status(401).json({ error: '未授权的访问' });
      }

      console.log('运行定时任务');
      try {
        const users = await dbModule.getUsers();
        const config = await dbModule.getConfig();
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
            await dbModule.updateUser(user.id, { isRead: user.isRead, unreadDays: user.unreadDays, frozen: user.frozen });
          }
        }
        await dbModule.updateLastResetTime();
        console.log('定时任务完成');

        return res.json({ message: 'Cron job executed successfully', result: users.length });
      } catch (error) {
        console.error('定时任务执行失败:', error);
        return res.status(500).json({ error: '定时任务执行失败', details: error.message });
      }
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