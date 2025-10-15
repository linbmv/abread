const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// 运行前端构建
console.log('正在安装前端依赖...');
execSync('cd frontend && npm install', { stdio: 'inherit' });

console.log('正在构建前端...');
execSync('cd frontend && npm run build', { stdio: 'inherit' });

// 复制构建输出到根目录
console.log('正在复制构建输出到根目录...');
const sourceDir = path.join(__dirname, 'frontend', 'dist');
const destDir = path.join(__dirname, 'dist');

// 确保目标目录存在
if (fs.existsSync(destDir)) {
  fs.removeSync(destDir);
}

fs.copySync(sourceDir, destDir);
console.log('构建完成，文件已复制到 dist 目录');