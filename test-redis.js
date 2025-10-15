// 简单的Redis连接测试脚本
const { createClient } = require('redis');

async function testRedisConnection() {
  console.log('开始测试Redis连接...');

  // 从环境变量获取Redis URL
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log('使用Redis URL:', redisUrl);

  const client = createClient({
    url: redisUrl
  });

  client.on('error', (err) => {
    console.error('Redis客户端错误:', err);
  });

  client.on('connect', () => {
    console.log('Redis连接已建立');
  });

  client.on('ready', () => {
    console.log('Redis客户端就绪');
  });

  try {
    await client.connect();
    console.log('Redis连接成功');

    // 测试基本读写操作
    const testKey = 'test-key';
    const testValue = 'Hello Redis!';

    // 写入测试数据
    await client.set(testKey, testValue);
    console.log('测试数据写入成功');

    // 读取测试数据
    const result = await client.get(testKey);
    console.log('读取测试数据:', result);

    // 验证数据是否正确
    if (result === testValue) {
      console.log('✓ Redis读写测试通过');
    } else {
      console.log('✗ Redis读写测试失败');
    }

    // 清理测试数据
    await client.del(testKey);
    console.log('测试数据已清理');

    await client.quit();
    console.log('Redis连接已关闭');
  } catch (error) {
    console.error('Redis连接测试失败:', error.message);
  }
}

// 执行测试
testRedisConnection();