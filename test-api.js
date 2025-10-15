// 测试API端点的脚本
const axios = require('axios');

async function testApiEndpoints() {
  const baseUrl = 'https://abread.vercel.app/api';

  console.log('开始测试API端点...');

  try {
    // 测试GET请求
    console.log('\n1. 测试GET /api/users');
    const getUsersResponse = await axios.get(`${baseUrl}/users`);
    console.log('GET /api/users 响应状态:', getUsersResponse.status);
    console.log('用户数量:', getUsersResponse.data.length);

    // 测试DELETE请求（使用一个假设的用户ID）
    console.log('\n2. 测试DELETE /api/users/[id]');
    try {
      // 这里使用一个示例ID，实际测试时需要使用真实的用户ID
      const userId = 'test123';
      const deleteResponse = await axios.delete(`${baseUrl}/users/${userId}`);
      console.log('DELETE /api/users/[id] 响应状态:', deleteResponse.status);
    } catch (deleteError) {
      console.log('DELETE /api/users/[id] 预期错误（用户不存在）:', deleteError.response?.status);
    }

    // 测试PUT请求
    console.log('\n3. 测试PUT /api/users/[id]');
    try {
      const userId = 'test123';
      const putResponse = await axios.put(`${baseUrl}/users/${userId}`, {
        isRead: true
      });
      console.log('PUT /api/users/[id] 响应状态:', putResponse.status);
    } catch (putError) {
      console.log('PUT /api/users/[id] 预期错误（用户不存在）:', putError.response?.status);
    }

    console.log('\nAPI端点测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

testApiEndpoints();