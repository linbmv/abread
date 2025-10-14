// /api/users.js - 用户管理API
import { db } from './_lib/db.js'
import { validateUser } from './_lib/utils.js'

// 支持的方法
const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE']

export async function GET(request) {
  try {
    const users = await db.getUsers()
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return new Response(JSON.stringify({ error: '获取用户列表失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export async function POST(request) {
  try {
    const { names } = await request.json()

    if (!names || !Array.isArray(names) || names.length === 0) {
      return new Response(JSON.stringify({ error: '用户名列表不能为空' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    // 验证用户名
    for (const name of names) {
      if (!validateUser({ name })) {
        return new Response(JSON.stringify({ error: `用户名 "${name}" 无效` }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    }

    const createdUsers = []
    for (const name of names) {
      const user = await db.addUser({
        name,
        isRead: false,  // 新用户默认未读
        unreadDays: 1,  // 新用户未读天数为1
        frozen: false,
        createdAt: new Date().toISOString()
      })
      createdUsers.push(user)
    }

    return new Response(JSON.stringify(createdUsers), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('添加用户失败:', error)
    return new Response(JSON.stringify({ error: '添加用户失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export async function PUT(request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1]; // 获取URL路径的最后一部分作为用户ID
    
    if (!userId) {
      return new Response(JSON.stringify({ error: '用户ID不能为空' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    const updates = await request.json()

    // 验证更新数据
    if (updates.name !== undefined && !validateUser({ name: updates.name })) {
      return new Response(JSON.stringify({ error: '用户名无效' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    if (updates.unreadDays !== undefined && (updates.unreadDays < 0 || updates.unreadDays > 7)) {
      return new Response(JSON.stringify({ error: '未读天数必须在0-7之间' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    const updatedUser = await db.updateUser(userId, updates)

    if (!updatedUser) {
      return new Response(JSON.stringify({ error: '用户不存在' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('更新用户失败:', error)
    return new Response(JSON.stringify({ error: '更新用户失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1]; // 获取URL路径的最后一部分作为用户ID
    
    if (!userId) {
      return new Response(JSON.stringify({ error: '用户ID不能为空' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    const result = await db.deleteUser(userId)

    if (!result) {
      return new Response(JSON.stringify({ error: '用户不存在' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    return new Response(JSON.stringify({ message: '用户删除成功' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    console.error('删除用户失败:', error)
    return new Response(JSON.stringify({ error: '删除用户失败' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

// 处理不支持的HTTP方法
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': allowedMethods.join(', ')
    }
  })
}