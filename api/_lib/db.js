
// /api/_lib/db.js - 数据存储逻辑 (使用JSON文件)
import { join } from 'path';
import { promises as fs } from 'fs';
// import { lock } from 'proper-lockfile'; // Vercel环境中可能不支持proper-lockfile

// 为Vercel环境创建一个简化的锁机制
const fileLocks = new Set();

async function lockFile(filePath) {
    // 在Vercel环境中，简单地使用内存锁
    while (fileLocks.has(filePath)) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    fileLocks.add(filePath);
    return async () => {
        fileLocks.delete(filePath);
    };
}

// 确定数据文件的路径。在Vercel环境中，/tmp/是唯一可写的目录。
const dataPath = process.env.VERCEL ? join('/tmp', 'users.json') : join(process.cwd(), 'backend', 'data', 'users.json');

// 确保数据目录存在
async function ensureDataFile() {
    try {
        await fs.mkdir(join(process.cwd(), 'backend', 'data'), { recursive: true });
        await fs.stat(dataPath);
    } catch (e) {
        // 如果文件不存在，则创建一个空的JSON文件
        if (e.code === 'ENOENT') {
            await fs.writeFile(dataPath, JSON.stringify({ users: [], lastReset: null, config: { resetHour: 4, timezone: 'Asia/Shanghai', maxUnreadDays: 7 } }, null, 2));
        }
    }
}


// 读取数据
async function readData() {
    await ensureDataFile();
    const fileContent = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(fileContent);
}

// 写入数据
async function writeData(data) {
    await ensureDataFile();
    const release = await lockFile(dataPath);
    try {
        await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    } finally {
        await release();
    }
}

export const db = {
    async getUsers() {
        const data = await readData();
        return data.users || [];
    },

    async addUser(userData) {
        const data = await readData();
        const newUser = {
            id: Date.now(), // 使用时间戳作为简单ID
            ...userData,
        };
        data.users.push(newUser);
        await writeData(data);
        return newUser;
    },

    async updateUser(userId, updates) {
        const data = await readData();
        const userIndex = data.users.findIndex(u => u.id == userId);

        if (userIndex === -1) {
            return null;
        }

        data.users[userIndex] = { ...data.users[userIndex], ...updates };
        await writeData(data);
        return data.users[userIndex];
    },

    async deleteUser(userId) {
        const data = await readData();
        const initialLength = data.users.length;
        data.users = data.users.filter(u => u.id != userId);

        if (data.users.length === initialLength) {
            return null; // 用户未找到
        }

        await writeData(data);
        return { success: true };
    },

    async getConfig() {
        const data = await readData();
        return data.config;
    },

    async updateLastResetTime() {
        const data = await readData();
        data.lastReset = new Date().toISOString();
        await writeData(data);
    }
};
