import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { error } from '../utils/response.js'

declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

const JWT_SECRET = 'kindergarten-secret-key-2024'

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(error('未提供认证令牌', 401))
    return
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json(error('认证令牌无效或已过期', 401))
  }
}
