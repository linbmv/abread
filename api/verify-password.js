// /api/verify-password.js - 密码验证API

export async function POST(request) {
  try {
    const { password } = await request.json();
    
    // 从环境变量获取密码，如果不存在则使用默认密码
    const correctPassword = process.env.APP_PASSWORD || 'admin123';
    
    if (password === correctPassword) {
      return new Response(JSON.stringify({ valid: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } else {
      return new Response(JSON.stringify({ valid: false, error: '密码错误' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('密码验证失败:', error);
    return new Response(JSON.stringify({ error: '密码验证失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
