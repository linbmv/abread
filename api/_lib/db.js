
// /api/_lib/db.js - 数据存储逻辑 (使用Redis作为主数据库 + Gist作为备份 + Edge Config作为静态配置)

const { createClient } = require('redis');

// Redis客户端初始化
let redisClient = null;
let redisConnected = false;

async function initRedis() {
  console.log('Redis初始化开始');

  if (process.env.REDIS_URL) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL
      });

      redisClient.on('error', (err) => {
        console.error('Redis客户端错误:', err);
      });

      redisClient.on('connect', () => {
        console.log('Redis连接已建立');
      });

      redisClient.on('ready', () => {
        console.log('Redis客户端就绪');
      });

      await redisClient.connect();
      redisConnected = true;
      console.log('Redis客户端初始化成功');
    } catch (error) {
      console.error('Redis初始化失败:', error.message);
      redisConnected = false;
    }
  } else {
    console.log('REDIS_URL未设置，Redis功能不可用');
  }
}

// 初始化Redis客户端
initRedis();

// Edge Config客户端（仅用于读取静态配置）
let edgeConfigClient = null;
let get = null;
let set = null;

// 初始化Edge Config客户端
function initEdgeConfig() {
  console.log('Edge Config初始化开始');
  console.log('EDGE_CONFIG环境变量存在:', !!process.env.EDGE_CONFIG);

  if (process.env.EDGE_CONFIG) {
    try {
      const { createClient: createEdgeClient } = require('@vercel/edge-config');
      edgeConfigClient = createEdgeClient(process.env.EDGE_CONFIG);

      console.log('Edge Config客户端结构:', Object.keys(edgeConfigClient));
      console.log('Edge Config客户端方法检查:', {
        hasGet: 'get' in edgeConfigClient,
        hasSet: 'set' in edgeConfigClient,
        getIsFunction: typeof edgeConfigClient.get === 'function',
        setIsFunction: typeof edgeConfigClient.set === 'function'
      });

      // Vercel Edge Config是只读的，只有get方法，没有set方法
      // 所以我们只初始化get函数用于读取配置
      if (edgeConfigClient.get && typeof edgeConfigClient.get === 'function') {
        get = edgeConfigClient.get;
        console.log('Edge Config读取功能可用');
      } else {
        console.warn('Edge Config读取功能不可用');
      }

      // 注意：Edge Config没有set方法，所以set将保持为null
      console.log('Edge Config客户端初始化完成（只读模式）');
      console.log('get函数可用:', typeof get === 'function');
      console.log('set函数可用:', typeof set === 'function'); // 这里将显示false，这是正常的
    } catch (error) {
      console.error('Edge Config初始化失败:', error.message);
    }
  } else {
    console.log('EDGE_CONFIG未设置，将仅使用Redis和Gist存储');
  }
}

// 初始化Edge Config客户端
initEdgeConfig();

// Redis键名常量
const USERS_KEY = 'bible-reading-users';
const CONFIG_KEY = 'bible-reading-config';

// GitHub Gist配置
const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;
const FILE_NAME = 'users.json';

// 上次Gist备份时间戳
let lastGistBackup = null;

// Gist相关辅助函数
async function readFromGist() {
  if (!GIST_ID || !GIST_TOKEN) {
    return { users: [], lastReset: null, config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7 } };
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        'Authorization': `token ${GIST_TOKEN}`,
        'User-Agent': 'Bible-Reading-Tracker'
      }
    });

    if (!response.ok) {
      throw new Error(`Gist请求失败: ${response.status}`);
    }

    const gistData = await response.json();
    const fileContent = gistData.files[FILE_NAME]?.content;

    if (fileContent) {
      const data = JSON.parse(fileContent);
      console.log('从Gist读取到用户数量:', data?.users?.length || 0);
      return data;
    } else {
      return { users: [], lastReset: null, config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7 } };
    }
  } catch (error) {
    console.error('从Gist读取数据失败:', error);
    return { users: [], lastReset: null, config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7 } };
  }
}

async function writeToGist(data) {
  if (!GIST_ID || !GIST_TOKEN) {
    console.warn('GIST_ID 或 GIST_TOKEN 未配置，无法保存到Gist');
    return;
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${GIST_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Bible-Reading-Tracker'
      },
      body: JSON.stringify({
        files: {
          [FILE_NAME]: {
            content: JSON.stringify(data, null, 2)
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`更新Gist失败: ${response.status}`);
    }

    lastGistBackup = new Date().toISOString();
    console.log('数据已备份到Gist');
  } catch (error) {
    console.error('写入Gist失败:', error);
    throw error;
  }
}

// 将Redis数据备份到Gist的函数
async function backupToGist() {
  if (!redisConnected) {
    console.log('Redis未连接，跳过备份');
    return;
  }

  if (!GIST_ID || !GIST_TOKEN) {
    console.log('GIST配置未设置，跳过备份');
    return;
  }

  try {
    console.log('开始备份Redis数据到Gist...');

    // 从Redis读取当前数据
    const redisData = await readDataFromRedis();

    // 写入到Gist
    await writeToGist(redisData);

    console.log('Redis数据已备份到Gist');
  } catch (error) {
    console.error('备份Redis数据到Gist失败:', error);
  }
}

// 定期备份任务 - 每12小时执行一次
function startPeriodicBackup() {
  const backupInterval = 12 * 60 * 60 * 1000; // 12小时（毫秒）

  setInterval(async () => {
    try {
      await backupToGist();
    } catch (error) {
      console.error('定期备份任务失败:', error);
    }
  }, backupInterval);

  console.log('定期备份任务已启动（每12小时一次）');
}

// 启动定期备份
startPeriodicBackup();

// 从Redis读取数据的函数
async function readDataFromRedis() {
  if (redisConnected) {
    try {
      console.log('尝试从Redis读取数据');
      const usersStr = await redisClient.get(USERS_KEY);
      const configStr = await redisClient.get(CONFIG_KEY);

      const users = usersStr ? JSON.parse(usersStr) : [];
      const config = configStr ? JSON.parse(configStr) : { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null };

      console.log('从Redis读取到的用户数量:', users.length);
      return { users, config };
    } catch (error) {
      console.error('从Redis读取数据失败:', error);
      // 如果Redis读取失败，尝试从Gist读取
      try {
        console.log('尝试从Gist读取数据作为后备方案');
        const gistData = await readFromGist();
        return gistData;
      } catch (gistError) {
        console.error('从Gist读取数据也失败:', gistError);
      }
    }
  }

  // 如果Redis不可用，尝试从Gist读取
  try {
    console.log('Redis不可用，尝试从Gist读取数据');
    const gistData = await readFromGist();
    return gistData;
  } catch (gistError) {
    console.error('从Gist读取数据失败:', gistError);
  }

  // 如果都失败，返回默认空数据
  console.log('使用默认空数据');
  return { users: [], config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null } };
}

// 将数据写入Redis的函数
async function writeDataToRedis(users, config) {
  if (!redisConnected) {
    console.log('Redis未连接，无法写入主数据库');
    // 如果Redis不可用，尝试直接写入Gist
    if (GIST_ID && GIST_TOKEN) {
      console.log('Redis不可用，直接写入Gist');
      await writeToGist({ users, config });
      return;
    } else {
      const errorMsg = 'Redis和Gist都不可用，无法保存数据';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  try {
    console.log('写入数据到Redis（主数据库）');

    // 将数据写入Redis
    await redisClient.set(USERS_KEY, JSON.stringify(users));
    await redisClient.set(CONFIG_KEY, JSON.stringify(config));

    console.log('数据写入Redis成功');

    // 同时写入Gist作为备份
    if (GIST_ID && GIST_TOKEN) {
      console.log('写入数据到Gist作为备份');
      await writeToGist({ users, config });
    }
  } catch (error) {
    console.error('写入Redis失败:', error);
    throw error;
  }
}

// 主要数据访问函数 - 优先使用Redis
async function readData() {
  console.log('readData函数被调用');
  console.log('Redis可用:', redisConnected);
  console.log('Gist配置可用:', !!(GIST_ID && GIST_TOKEN));
  console.log('Edge Config可用:', !!(get && process.env.EDGE_CONFIG));

  // 优先从Redis读取数据（主数据库）
  if (redisConnected) {
    console.log('尝试从Redis读取数据（主数据库）');
    try {
      const redisData = await readDataFromRedis();
      console.log('从Redis读取到的用户数量:', redisData?.users?.length || 0);
      return redisData;
    } catch (redisError) {
      console.error('从Redis读取数据失败:', redisError.message);
    }
  }

  // 如果Redis不可用，尝试从Gist读取
  if (GIST_ID && GIST_TOKEN) {
    console.log('尝试从Gist读取数据（备份）');
    try {
      const gistData = await readFromGist();
      console.log('从Gist读取到的用户数量:', gistData?.users?.length || 0);
      return gistData;
    } catch (gistError) {
      console.error('从Gist读取数据失败:', gistError.message);
    }
  }

  // 如果Gist也不可用，尝试从Edge Config读取（仅静态配置）
  if (get && process.env.EDGE_CONFIG) {
    console.log('尝试从Edge Config读取数据（静态配置）');
    try {
      const users = await get(USERS_KEY);
      const config = await get(CONFIG_KEY);

      console.log('从Edge Config读取到的用户数量:', users ? users.length : 0);
      return {
        users: users || [],
        config: config || { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null }
      };
    } catch (edgeError) {
      console.error('Edge Config读取失败:', edgeError.message);
    }
  }

  // 如果所有存储都失败，返回默认空数据
  console.log('所有存储源都不可用，使用默认空数据');
  return { users: [], config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null } };
}

async function writeData(users, config) {
  console.log('writeData函数被调用');
  console.log('要写入的用户数量:', users.length);
  console.log('Redis可用用于写入:', redisConnected);
  console.log('Gist配置可用用于写入:', !!(GIST_ID && GIST_TOKEN));

  // 优先写入Redis（主数据库）
  await writeDataToRedis(users, config);

  console.log('数据写入完成（Redis主数据库，Gist备份）');
}

const db = {
  async getUsers() {
    try {
      const data = await readData();
      return data.users || [];
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return [];
    }
  },

  async addUser(userData) {
    try {
      const data = await readData();
      const newUser = {
        id: Date.now(), // 使用时间戳作为简单ID
        ...userData,
      };
      data.users.push(newUser);
      await writeData(data.users, data.config);
      return newUser;
    } catch (error) {
      console.error('添加用户失败:', error);
      throw error;
    }
  },

  async updateUser(userId, updates) {
    try {
      console.log('db.updateUser被调用，userId:', userId, 'type:', typeof userId, 'updates:', updates);
      const data = await readData();
      console.log('从数据库读取的用户数量:', data.users.length);

      // 尝试将userId转换为数字进行比较，以处理字符串/数字类型不匹配问题
      const numericUserId = isNaN(userId) ? userId : Number(userId);
      console.log('比较前转换的ID:', numericUserId, 'type:', typeof numericUserId);

      // 检查数据中的用户ID类型
      console.log('数据库中的用户ID示例:', data.users.slice(0, 3).map(u => ({ id: u.id, type: typeof u.id })));

      const userIndex = data.users.findIndex(u => u.id == numericUserId);
      console.log('查找结果 - userIndex:', userIndex, '匹配的用户:', userIndex !== -1 ? data.users[userIndex] : null);

      if (userIndex === -1) {
        console.log('未找到用户，搜索ID:', numericUserId, '原始ID:', userId);
        return null;
      }

      data.users[userIndex] = { ...data.users[userIndex], ...updates };
      await writeData(data.users, data.config);
      console.log('用户更新成功，返回数据:', data.users[userIndex]);
      return data.users[userIndex];
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      console.log('db.deleteUser被调用，userId:', userId, 'type:', typeof userId);
      const data = await readData();
      console.log('从数据库读取的用户数量:', data.users.length);

      // 尝试将userId转换为数字进行比较，以处理字符串/数字类型不匹配问题
      const numericUserId = isNaN(userId) ? userId : Number(userId);
      console.log('比较前转换的ID:', numericUserId, 'type:', typeof numericUserId);

      // 检查数据中的用户ID类型
      console.log('数据库中的用户ID示例:', data.users.slice(0, 3).map(u => ({ id: u.id, type: typeof u.id })));

      const initialLength = data.users.length;
      const filteredUsers = data.users.filter(u => u.id != numericUserId);
      console.log('删除前长度:', initialLength, '删除后长度:', filteredUsers.length, '是否找到用户:', filteredUsers.length !== initialLength);

      if (filteredUsers.length === initialLength) {
        console.log('未找到要删除的用户，搜索ID:', numericUserId, '原始ID:', userId);
        return null; // 用户未找到
      }

      await writeData(filteredUsers, data.config);
      console.log('用户删除成功');
      return { success: true };
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  },

  async getConfig() {
    try {
      const data = await readData();
      return data.config;
    } catch (error) {
      console.error('获取配置失败:', error);
      return { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null };
    }
  },

  async updateLastResetTime() {
    try {
      const data = await readData();
      if (!data.config) {
        data.config = {};
      }
      data.config.lastReset = new Date().toISOString();
      await writeData(data.users, data.config);
    } catch (error) {
      console.error('更新重置时间失败:', error);
      throw error;
    }
  }
};

module.exports = { db };
