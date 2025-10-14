// 简单的Express服务器用于在Vercel上部署SPA应用
const express = require('express');
const path = require('path');
const app = express();

// 服务构建后的静态文件
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// API路由将由Vercel的API函数处理，这里只处理SPA路由
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;