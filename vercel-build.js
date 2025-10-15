// vercel-build.js - Vercel 构建入口
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function build() {
  console.log('开始构建项目...');

  // 确保 node_modules 存在
  if (!fs.existsSync('./node_modules')) {
    console.log('安装项目依赖...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // 进入前端目录并构建
  console.log('进入前端目录并安装依赖...');
  execSync('cd frontend && npm install', { stdio: 'inherit' });

  console.log('构建前端应用...');
  execSync('cd frontend && npm run build', { stdio: 'inherit' });

  // 将构建结果复制到根目录的 dist
  console.log('复制构建结果...');
  const sourceDir = path.join(__dirname, 'frontend', 'dist');
  const destDir = path.join(__dirname, 'dist');

  if (fs.existsSync(destDir)) {
    fs.removeSync(destDir);
  }

  fs.copySync(sourceDir, destDir);
  console.log('构建完成！');
}

// 执行构建
build().catch(err => {
  console.error('构建失败:', err);
  process.exit(1);
});

module.exports = build;