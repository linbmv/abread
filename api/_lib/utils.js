// /api/_lib/utils.js - 工具函数

/**
 * 验证用户数据
 * @param {object} user - 用户对象
 * @returns {boolean} - 是否有效
 */
function validateUser(user) {
    if (!user || typeof user.name !== 'string' || user.name.trim().length === 0) {
        return false;
    }
    // 可以添加更多验证规则
    return true;
}

/**
 * 生成统计信息文本
 * @param {Array} users - 用户列表
 * @returns {string} - 格式化的统计文本
 */
function generateStatisticsText(users) {
    let stats = '📖 每日读经统计\n';
    const unreadGroups = {};

    users.forEach(user => {
        if (!user.isRead && !user.frozen && user.unreadDays > 0) {
            if (!unreadGroups[user.unreadDays]) {
                unreadGroups[user.unreadDays] = [];
            }
            unreadGroups[user.unreadDays].push(`@${user.name}`);
        }
    });

    // 按未读天数排序
    const sortedDays = Object.keys(unreadGroups).sort((a, b) => a - b);

    for (const days of sortedDays) {
        const names = unreadGroups[days].join(' ');
        stats += `${names} ${days}日未读\n`;
    }

    return stats.trim();
}

module.exports = {
    validateUser,
    generateStatisticsText
};
