
// /backend/db.js - 数据存储逻辑 (使用Vercel Edge Config + GitHub Gist备用方案)
const edgeConfig = require('@vercel/edge-config');

// Edge Config键名常量
const USERS_KEY = 'bible-reading-users';
const CONFIG_KEY = 'bible-reading-config';

// GitHub Gist配置
const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;
const FILE_NAME = 'users.json';

// Gist相关辅助函数
async function readFromGist() {
  if (!GIST_ID || !GIST_TOKEN) {
    return { users: [], lastReset: null, config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7 } };
  }

  try {
    const response = await require('node-fetch')(`https://api.github.com/gists/${GIST_ID}`, {
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
      return JSON.parse(fileContent);
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
    const response = await require('node-fetch')(`https://api.github.com/gists/${GIST_ID}`, {
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
  } catch (error) {
    console.error('写入Gist失败:', error);
    throw error;
  }
}

// 主要数据访问函数
async function readData() {
  // 首先尝试从Gist读取（因为那是我们写入的地方）
  if (GIST_ID && GIST_TOKEN) {
    try {
      return await readFromGist();
    } catch (gistError) {
      console.warn('从Gist读取失败，尝试从Edge Config读取:', gistError.message);
    }
  }

  try {
    // 检查 edgeConfig 是否正确导入且支持 get 方法
    if (typeof edgeConfig.get === 'function') {
      // 如果Gist不可用或未配置，尝试从Edge Config读取
      const users = await edgeConfig.get(USERS_KEY);
      const config = await edgeConfig.get(CONFIG_KEY);

      return {
        users: users || [],
        config: config || { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null }
      };
    } else {
      console.warn('Edge Config get方法不可用');
    }
  } catch (edgeError) {
    console.warn('Edge Config读取失败:', edgeError.message);
  }

  // 如果都失败，返回默认值
  return { users: [], config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null } };
}

async function writeData(users, config) {
  try {
    // Vercel Edge Config是只读的，不支持写入操作
    // 使用GitHub Gist作为主要存储方案
    if (GIST_ID && GIST_TOKEN) {
      await writeToGist({ users, config });
    } else {
      // 如果没有配置Gist，则尝试使用其他方式（比如本地文件存储）
      // 但Vercel函数环境中本地文件存储是临时的，这里记录警告
      console.warn('GIST_ID 或 GIST_TOKEN 未配置，数据无法持久化存储');
    }
  } catch (error) {
    console.error('写入数据失败:', error);
    throw error;
  }
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
      const data = await readData();
      const userIndex = data.users.findIndex(u => u.id == userId);

      if (userIndex === -1) {
        return null;
      }

      data.users[userIndex] = { ...data.users[userIndex], ...updates };
      await writeData(data.users, data.config);
      return data.users[userIndex];
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      const data = await readData();
      const initialLength = data.users.length;
      const filteredUsers = data.users.filter(u => u.id != userId);

      if (filteredUsers.length === initialLength) {
        return null; // 用户未找到
      }

      await writeData(filteredUsers, data.config);
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
