# 定时任务配置说明

## 概述

本项目使用 Vercel Cron 功能来执行定时任务，主要用于处理用户阅读状态的自动更新和冻结逻辑。

## 定时任务功能

定时任务每天凌晨4点自动执行以下操作：
1. 检查所有非冻结状态的用户
2. 如果用户未读（isRead 为 false），未读天数加1
3. 如果未读天数超过最大限制（默认7天），用户将被冻结
4. 如果用户已读（isRead 为 true），重置为未读状态

## 环境变量配置

### 必需的环境变量

在 Vercel 项目设置中必须配置以下环境变量：

```
CRON_SECRET=your_secure_cron_secret_here
```

### 可选的环境变量

```
MAX_UNREAD_DAYS=7          # 最大未读天数，默认为7
TIMEZONE=Asia/Shanghai     # 时区设置，默认为亚洲/上海
```

## Vercel 部署配置

定时任务已在 `vercel.json` 中配置：

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 4 * * *"  // 每天凌晨4点执行
    }
  ]
}
```

## 本地开发测试

### 启动本地服务器

```bash
npm run dev
```

### 手动触发定时任务

可以通过以下方式测试定时任务：

1. **使用测试端点**：
   ```bash
   curl -X POST http://localhost:3003/api/test-cron
   ```

2. **直接访问**（需要授权头）：
   ```bash
   curl -H "Authorization: Bearer your_cron_secret_here" \
        http://localhost:3003/api/cron
   ```

## 故障排除

### 定时任务未执行

1. **检查 CRON_SECRET 环境变量**：确保在 Vercel 项目设置中正确配置
2. **查看 Vercel 日志**：检查是否有认证失败或错误日志
3. **验证时区设置**：确认定时任务时间是否符合预期

### 常见错误

- **401 错误**：CRON_SECRET 未设置或配置错误
- **500 错误**：服务器内部错误，检查日志获取详细信息
- **数据库连接错误**：检查数据库配置是否正确

## 监控和调试

- 查看 Vercel 项目日志以监控定时任务执行情况
- 检查用户状态变化是否符合预期
- 验证冻结逻辑是否正确工作

## 时间表

- 定时任务默认在每天的 `03:00` UTC 时间执行（相当于北京时间 11:00 AM）
- Vercel Cron 使用 UTC 时间，北京时间 = UTC时间 + 8小时
- 例如：每天上午11:00北京时间 = 每天 03:00 UTC 时间