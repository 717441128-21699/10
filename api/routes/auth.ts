import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { users, initMockData } from '../db.js'
import { success, error } from '../utils/response.js'
import { calculateAge } from '../utils/helpers.js'
import { verifyToken } from '../middleware/auth.js'
import type { User, UserRole } from '@shared/types'

const router = Router()

const JWT_SECRET = 'kindergarten-secret-key-2024'
const JWT_EXPIRES_IN = '7d'
const UNIVERSAL_PASSWORD = '123456'

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json(error('用户名和密码不能为空', 400))
    return
  }

  const user = users.find(u => u.username === username)

  if (!user) {
    res.status(401).json(error('用户不存在', 401))
    return
  }

  if (password !== UNIVERSAL_PASSWORD) {
    res.status(401).json(error('密码错误', 401))
    return
  }

  if (user.status !== 'active') {
    res.status(403).json(error('账号已被禁用', 403))
    return
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      campusId: user.campusId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )

  res.json(success({ token, user }, '登录成功'))
})

router.post('/logout', (req: Request, res: Response): void => {
  res.json(success(null, '登出成功'))
})

router.get('/me', verifyToken, (req: Request, res: Response): void => {
  const userId = req.user?.id
  const user = users.find(u => u.id === userId)

  if (!user) {
    res.status(404).json(error('用户不存在', 404))
    return
  }

  res.json(success(user, '获取用户信息成功'))
})

router.post('/init', (req: Request, res: Response): void => {
  initMockData()
  res.json(success(null, '数据初始化成功'))
})

export default router
