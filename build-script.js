const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 用 Node.js 内置函数实现 fs-extra 的功能
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const items = fs.readdirSync(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);

    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      if (fs.statSync(itemPath).isDirectory()) {
        removeDir(itemPath);
      } else {
        fs.unlinkSync(itemPath);
      }
    }

    fs.rmdirSync(dir);
  }
}

// 运行前端构建
console.log('构建脚本开始执行');
console.log('当前工作目录:', process.cwd());
console.log('当前目录内容:', fs.readdirSync('.').join(', '));

console.log('正在安装前端依赖...');
try {
  execSync('cd frontend && npm install', { stdio: 'inherit' });
  console.log('前端依赖安装完成');
} catch (error) {
  console.error('前端依赖安装失败:', error.message);
  throw error;
}

console.log('正在构建前端...');
try {
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  console.log('前端构建完成');
} catch (error) {
  console.error('前端构建失败:', error.message);
  throw error;
}

// 检查构建输出
const sourceDir = path.join(__dirname, 'frontend', 'dist');
console.log('检查构建输出目录是否存在:', sourceDir);
console.log('构建输出目录是否存在:', fs.existsSync(sourceDir));

if (fs.existsSync(sourceDir)) {
  console.log('构建输出目录内容:', fs.readdirSync(sourceDir).join(', '));
} else {
  console.error('构建输出目录不存在！');
  throw new Error('前端构建未生成 dist 目录');
}

// 复制构建输出到根目录
console.log('正在复制构建输出到根目录...');
const destDir = path.join(__dirname, 'dist');

// 确保目标目录存在
if (fs.existsSync(destDir)) {
  console.log('删除现有的 dist 目录');
  removeDir(destDir);
}

copyDir(sourceDir, destDir);
console.log('构建完成，文件已复制到 dist 目录');
console.log('根目录 dist 内容:', fs.readdirSync('dist').join(', '));