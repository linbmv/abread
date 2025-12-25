const VERCEL_URL = process.env.VERCEL_URL || 'https://abread.vercel.app';

async function deleteAllUsers() {
  try {
    console.log('正在获取用户列表...');
    const res = await fetch(`${VERCEL_URL}/api/users`);

    if (!res.ok) {
      throw new Error(`获取用户列表失败: ${res.status} ${res.statusText}`);
    }

    const users = await res.json();
    console.log(`找到 ${users.length} 个用户`);

    if (users.length === 0) {
      console.log('没有用户需要删除');
      return;
    }

    let deleted = 0;
    for (const user of users) {
      const deleteRes = await fetch(`${VERCEL_URL}/api/users/${user.id}`, {
        method: 'DELETE'
      });

      if (deleteRes.ok) {
        deleted++;
        console.log(`✓ 已删除用户: ${user.name} (${deleted}/${users.length})`);
      } else {
        console.error(`✗ 删除失败: ${user.name}`);
      }
    }

    console.log(`\n完成！共删除 ${deleted} 个用户`);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

deleteAllUsers();
