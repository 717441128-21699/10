import type { Request, Response, NextFunction } from 'express'
import type { UserRole } from '@shared/types'
import { error } from '../utils/response.js'

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(error('用户未认证', 401))
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(error('权限不足', 403))
      return
    }

    next()
  }
}
