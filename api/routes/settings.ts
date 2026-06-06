import { Router, type Request, type Response } from 'express'
import { users, campuses, dictionaries, classes } from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import type { User, Campus, DictionaryItem, UserRole } from '@shared/types'

const router = Router()

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let userIdCounter = 200
let campusIdCounter = 100
let dictIdCounter = 1000

router.get('/users', verifyToken, (req: Request, res: Response): void => {
  const { role, campusId, status } = req.query

  let filtered = [...users]

  if (role) {
    filtered = filtered.filter(u => u.role === role)
  }
  if (campusId) {
    filtered = filtered.filter(u => u.campusId === Number(campusId))
  }
  if (status) {
    filtered = filtered.filter(u => u.status === status)
  }

  res.json(success(filtered))
})

router.post('/users', verifyToken, requireRole('super_admin', 'principal'), (req: Request, res: Response): void => {
  const { username, name, role, campusId, phone, avatar } = req.body

  if (!username || !name || !role || !phone) {
    res.status(400).json(error('缺少必要参数', 400))
    return
  }

  if (users.some(u => u.username === username)) {
    res.status(400).json(error('用户名已存在', 400))
    return
  }

  const validRoles: UserRole[] = ['super_admin', 'principal', 'teacher', 'parent', 'finance']
  if (!validRoles.includes(role as UserRole)) {
    res.status(400).json(error('无效的角色', 400))
    return
  }

  const newUser: User = {
    id: userIdCounter++,
    username,
    name,
    role: role as UserRole,
    campusId: campusId ? Number(campusId) : undefined,
    phone,
    avatar,
    status: 'active',
    createdAt: formatDateTime(new Date()),
  }

  users.push(newUser)
  res.json(success(newUser, '用户创建成功'))
})

router.put('/users/:id', verifyToken, requireRole('super_admin', 'principal'), (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const user = users.find(u => u.id === id)

  if (!user) {
    res.status(404).json(error('用户不存在', 404))
    return
  }

  const { name, role, campusId, phone, avatar, status } = req.body

  if (name !== undefined) user.name = name
  if (role !== undefined) user.role = role as UserRole
  if (campusId !== undefined) user.campusId = Number(campusId)
  if (phone !== undefined) user.phone = phone
  if (avatar !== undefined) user.avatar = avatar
  if (status !== undefined) user.status = status as 'active' | 'disabled'

  res.json(success(user, '用户更新成功'))
})

router.delete('/users/:id', verifyToken, requireRole('super_admin'), (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const index = users.findIndex(u => u.id === id)

  if (index === -1) {
    res.status(404).json(error('用户不存在', 404))
    return
  }

  users.splice(index, 1)
  res.json(success(null, '用户删除成功'))
})

router.get('/campuses', verifyToken, (req: Request, res: Response): void => {
  res.json(success(campuses))
})

router.post('/campuses', verifyToken, requireRole('super_admin'), (req: Request, res: Response): void => {
  const { name, address, phone } = req.body

  if (!name) {
    res.status(400).json(error('缺少校区名称', 400))
    return
  }

  const newCampus: Campus = {
    id: campusIdCounter++,
    name,
    address,
    phone,
    status: 'active',
  }

  campuses.push(newCampus)
  res.json(success(newCampus, '校区创建成功'))
})

router.put('/campuses/:id', verifyToken, requireRole('super_admin'), (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const campus = campuses.find(c => c.id === id)

  if (!campus) {
    res.status(404).json(error('校区不存在', 404))
    return
  }

  const { name, address, phone, status } = req.body

  if (name !== undefined) campus.name = name
  if (address !== undefined) campus.address = address
  if (phone !== undefined) campus.phone = phone
  if (status !== undefined) campus.status = status as 'active' | 'inactive'

  res.json(success(campus, '校区更新成功'))
})

router.get('/dictionaries', verifyToken, (req: Request, res: Response): void => {
  const { type } = req.query

  let filtered = [...dictionaries]

  if (type) {
    filtered = filtered.filter(d => d.type === type)
  }

  filtered.sort((a, b) => a.sort - b.sort)
  res.json(success(filtered))
})

router.post('/dictionaries', verifyToken, (req: Request, res: Response): void => {
  const { type, key, value, sort } = req.body

  if (!type || !key || !value) {
    res.status(400).json(error('缺少必要参数', 400))
    return
  }

  const newDict: DictionaryItem = {
    id: dictIdCounter++,
    type,
    key,
    value,
    sort: sort ? Number(sort) : dictionaries.filter(d => d.type === type).length + 1,
  }

  dictionaries.push(newDict)
  res.json(success(newDict, '字典项创建成功'))
})

router.put('/dictionaries/:id', verifyToken, (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const dict = dictionaries.find(d => d.id === id)

  if (!dict) {
    res.status(404).json(error('字典项不存在', 404))
    return
  }

  const { type, key, value, sort } = req.body

  if (type !== undefined) dict.type = type
  if (key !== undefined) dict.key = key
  if (value !== undefined) dict.value = value
  if (sort !== undefined) dict.sort = Number(sort)

  res.json(success(dict, '字典项更新成功'))
})

router.delete('/dictionaries/:id', verifyToken, (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const index = dictionaries.findIndex(d => d.id === id)

  if (index === -1) {
    res.status(404).json(error('字典项不存在', 404))
    return
  }

  dictionaries.splice(index, 1)
  res.json(success(null, '字典项删除成功'))
})

export default router
