// api/verify-password.js - 密码验证
export default async function handler(req, res) {
  if (req.method \!== 'POST') {
    return res.status(405).json({ error: '方法不允许' });
  }

  try {
    const { password } = req.body;
    // 从环境变量获取密码，如果不存在则使用默认密码
    const correctPassword = process.env.APP_PASSWORD || 'admin123';

    if (password === correctPassword) {
      res.json({ valid: true });
    } else {
      res.status(401).json({ valid: false, error: '密码错误' });
    }
  } catch (error) {
    res.status(500).json({ error: '密码验证失败' });
  }
}
