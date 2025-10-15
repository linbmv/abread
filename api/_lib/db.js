
// /api/_lib/db.js - 数据存储逻辑 (使用Vercel Edge Config + GitHub Gist备用方案)

// 由于@vercel/edge-config在Node.js环境中可能需要特殊处理
// 我们使用动态导入的方式来初始化客户端
let edgeConfigClient = null;
let get = null;
let set = null;

// 初始化Edge Config客户端
function initEdgeConfig() {
  if (!process.env.EDGE_CONFIG) {
    console.warn('EDGE_CONFIG环境变量未设置，将使用Gist作为数据存储');
    return;
  }

  try {
    // 在Node.js环境中，我们可能需要动态导入
    const { createClient } = require('@vercel/edge-config');
    edgeConfigClient = createClient(process.env.EDGE_CONFIG);
    ({ get, set } = edgeConfigClient);
  } catch (error) {
    console.warn('Edge Config初始化失败，将使用Gist作为数据存储:', error.message);
  }
}

// 初始化客户端
initEdgeConfig();

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
  } catch (error) {
    console.error('写入Gist失败:', error);
    throw error;
  }
}

// 主要数据访问函数
async function readData() {
  // 优先从Edge Config读取（更快的读取速度）
  if (get && process.env.EDGE_CONFIG) {
    try {
      const users = await get(USERS_KEY);
      const config = await get(CONFIG_KEY);

      return {
        users: users || [],
        config: config || { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null }
      };
    } catch (edgeError) {
      console.warn('Edge Config读取失败:', edgeError.message);
    }
  }

  // 如果Edge Config不可用或失败，尝试从Gist读取
  if (GIST_ID && GIST_TOKEN) {
    try {
      const gistData = await readFromGist();
      return gistData;
    } catch (gistError) {
      console.warn('从Gist读取数据失败:', gistError.message);
    }
  }

  // 如果两者都失败，返回默认空数据
  return { users: [], config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null } };
}

async function writeData(users, config) {
  // 优先写入Edge Config（更快的写入速度）
  const writePromises = [];

  if (set && process.env.EDGE_CONFIG) {
    writePromises.push(
      Promise.all([
        set(USERS_KEY, users),
        set(CONFIG_KEY, config)
      ]).catch(error => {
        console.error('写入Edge Config失败:', error.message);
        throw error;
      })
    );
  }

  // 同时写入Gist作为备份
  if (GIST_ID && GIST_TOKEN) {
    writePromises.push(
      writeToGist({ users, config }).catch(error => {
        console.error('写入Gist失败:', error.message);
        // Gist写入失败不应该影响整体操作
      })
    );
  }

  // 等待主要存储（Edge Config）写入完成
  if (writePromises.length > 0) {
    try {
      // 等待Edge Config写入（如果存在）
      if (set && process.env.EDGE_CONFIG) {
        await writePromises[0];
      } else if (GIST_ID && GIST_TOKEN && writePromises.length > 0) {
        // 如果没有Edge Config，至少等待Gist写入
        await writePromises[writePromises.length - 1];
      }
    } catch (error) {
      // 如果主要存储写入失败，抛出错误
      throw error;
    }
  } else {
    throw new Error('没有配置任何数据存储方案 (EDGE_CONFIG 或 GIST)');
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
