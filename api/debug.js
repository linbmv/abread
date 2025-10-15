// api/debug.js - 调试入口，提供详细的调试信息
export default async function handler(req, res) {
  console.log('=== 调试请求信息 ===');
  console.log('请求URL:', req.url);
  console.log('请求方法:', req.method);
  console.log('请求头:', JSON.stringify(req.headers, null, 2));
  console.log('请求原始URL:', req.url);

  const { pathname } = new URL(req.url, `https://${req.headers.host}`);
  console.log('解析后的路径名:', pathname);

  // 检查是否是API请求
  if (pathname.startsWith('/api/')) {
    console.log('这是一个API请求，应该由api/v1.js处理');
    return res.status(404).json({
      error: 'API请求',
      message: '此API请求应该由api/v1.js处理，而不是debug.js',
      requestedPath: pathname
    });
  }

  console.log('这是一个前端页面请求，返回index.html进行SPA路由');

  // 对于非API请求，应该提供index.html
  try {
    // 这个文件实际上不会被直接调用，因为我们配置了路由到 /dist/index.html
    // 但是我们可以提供一些调试信息
    return res.status(200).json({
      message: '前端入口点',
      requestedPath: pathname,
      info: '这个请求应该由Vercel的静态文件服务处理，返回/dist/index.html'
    });
  } catch (error) {
    console.error('调试处理错误:', error);
    return res.status(500).json({ error: '调试处理失败', details: error.message });
  }
}