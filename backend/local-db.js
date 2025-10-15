// /backend/local-db.js - 本地开发环境数据存储逻辑
const fs = require('fs').promises;
const path = require('path');
const fsSync = require('fs'); // 同步版本用于检查目录是否存在

// 数据文件路径
const DATA_FILE = path.join(__dirname, '..', 'data', 'local-data.json');

// 确保数据目录存在
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fsSync.existsSync(DATA_DIR)) {
  fsSync.mkdirSync(DATA_DIR, { recursive: true });
}

// 读取数据的辅助函数
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 如果文件不存在或解析失败，返回默认数据
    return {
      users: [],
      config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7, lastReset: null }
    };
  }
}

// 写入数据的辅助函数
async function writeData(users, config) {
  try {
    const data = { users, config };
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
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
        id: Date.now().toString(), // 使用时间戳作为ID
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

  async getUserById(userId) {
    try {
      const data = await readData();
      return data.users.find(u => u.id == userId) || null;
    } catch (error) {
      console.error('获取用户失败:', error);
      return null;
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