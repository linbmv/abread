// api/send-statistics.js - 发送统计信息
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    // 这里可以添加发送到WhatsApp等的逻辑
    const { statistics } = req.body;
    console.log('Sending statistics:', statistics);
    res.json({ success: true, message: '统计信息已发送' });
  } catch (error) {
    res.status(500).json({ error: '发送统计信息失败' });
  }
}
