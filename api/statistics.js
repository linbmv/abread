// /api/statistics.js - 统计信息API
import { db } from './_lib/db.js';
import { generateStatisticsText } from './_lib/utils.js';

export async function GET(request) {
    try {
        const users = await db.getUsers();
        const statsText = generateStatisticsText(users);

        return new Response(JSON.stringify({ statistics: statsText }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('获取统计信息失败:', error);
        return new Response(JSON.stringify({ error: '获取统计信息失败' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}
