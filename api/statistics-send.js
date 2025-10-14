// /api/statistics-send.js - 发送统计信息API
import { db } from './_lib/db.js';
import { generateStatisticsText } from './_lib/utils.js';

export async function POST(request) {
    try {
        const { stats } = await request.json();
        
        // 获取当前用户列表以生成最新的统计数据
        const users = await db.getUsers();
        const statsText = generateStatisticsText(users);
        
        // 这里可以添加发送到WhatsApp或其他平台的逻辑
        // 暂时只是返回生成的统计文本
        return new Response(JSON.stringify({ 
            message: '统计信息已生成', 
            statistics: statsText 
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('发送统计信息失败:', error);
        return new Response(JSON.stringify({ error: '发送统计信息失败' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}