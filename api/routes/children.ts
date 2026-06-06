import { Router, type Request, type Response } from 'express'
import { children, classes, users } from '../db.js'
import { success, error } from '../utils/response.js'
import { calculateAge } from '../utils/helpers.js'
import { verifyToken } from '../middleware/auth.js'
import type { Child, Guardian, DevelopmentScore, ClassInfo } from '@shared/types'

const router = Router()

router.use(verifyToken)

let childIdCounter = 1000
let guardianIdCounter = 1000

function getNextChildId(): number {
  const maxId = children.reduce((max, c) => Math.max(max, c.id), 0)
  childIdCounter = Math.max(childIdCounter, maxId + 1)
  return childIdCounter++
}

function getNextGuardianId(): number {
  let maxId = 0
  for (const child of children) {
    for (const g of child.guardians) {
      maxId = Math.max(maxId, g.id)
    }
  }
  guardianIdCounter = Math.max(guardianIdCounter, maxId + 1)
  return guardianIdCounter++
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

router.get('/', (req: Request, res: Response): void => {
  const { campusId, classId, keyword, status, page = '1', pageSize = '10' } = req.query

  let result = [...children]

  if (campusId) {
    const cid = Number(campusId)
    result = result.filter(c => c.campusId === cid)
  }

  if (classId) {
    const cid = Number(classId)
    result = result.filter(c => c.classId === cid)
  }

  if (keyword) {
    const kw = String(keyword).toLowerCase()
    result = result.filter(c =>
      c.name.toLowerCase().includes(kw) ||
      c.guardians.some(g => g.name.toLowerCase().includes(kw) || g.phone.includes(kw))
    )
  }

  if (status) {
    result = result.filter(c => c.status === status)
  }

  const total = result.length
  const pageNum = Number(page)
  const size = Number(pageSize)
  const start = (pageNum - 1) * size
  const list = result.slice(start, start + size)

  res.json(success({
    list,
    total,
    page: pageNum,
    pageSize: size,
    totalPages: Math.ceil(total / size),
  }, '获取幼儿列表成功'))
})

router.get('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const child = children.find(c => c.id === id)

  if (!child) {
    res.status(404).json(error('幼儿不存在', 404))
    return
  }

  res.json(success(child, '获取幼儿详情成功'))
})

router.post('/', (req: Request, res: Response): void => {
  const body = req.body as Partial<Child> & { guardians?: Omit<Guardian, 'id'>[] }

  if (!body.name || !body.gender || !body.birthDate || !body.campusId) {
    res.status(400).json(error('姓名、性别、出生日期、园区ID为必填项', 400))
    return
  }

  const age = calculateAge(body.birthDate)

  const guardians: Guardian[] = (body.guardians || []).map(g => ({
    id: getNextGuardianId(),
    name: g.name,
    relation: g.relation,
    phone: g.phone,
    photo: g.photo || '',
    idCard: g.idCard,
  }))

  const cls = body.classId ? classes.find(c => c.id === body.classId) : undefined

  const newChild: Child = {
    id: getNextChildId(),
    name: body.name,
    gender: body.gender,
    birthDate: body.birthDate,
    age,
    campusId: body.campusId,
    classId: body.classId,
    className: cls?.name,
    avatar: body.avatar,
    allergies: body.allergies || [],
    medicalHistory: body.medicalHistory,
    guardians,
    developmentScore: body.developmentScore,
    status: body.status || 'active',
    createdAt: formatDateTime(new Date()),
  }

  children.push(newChild)

  if (cls) {
    cls.studentCount = children.filter(c => c.classId === cls.id).length
  }

  res.json(success(newChild, '创建幼儿成功'))
})

router.put('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const idx = children.findIndex(c => c.id === id)

  if (idx === -1) {
    res.status(404).json(error('幼儿不存在', 404))
    return
  }

  const body = req.body as Partial<Child> & { guardians?: Omit<Guardian, 'id'>[] }
  const existing = children[idx]

  const age = body.birthDate ? calculateAge(body.birthDate) : existing.age

  let guardians: Guardian[] = existing.guardians
  if (body.guardians) {
    guardians = body.guardians.map(g => {
      const existingGuardian = existing.guardians.find(eg => eg.name === g.name && eg.phone === g.phone)
      return {
        id: existingGuardian?.id || getNextGuardianId(),
        name: g.name,
        relation: g.relation,
        phone: g.phone,
        photo: g.photo || existingGuardian?.photo || '',
        idCard: g.idCard || existingGuardian?.idCard,
      }
    })
  }

  const oldClassId = existing.classId
  const newClassId = body.classId ?? existing.classId

  let className = existing.className
  if (newClassId && newClassId !== oldClassId) {
    const cls = classes.find(c => c.id === newClassId)
    className = cls?.name
  }

  children[idx] = {
    ...existing,
    ...body,
    age,
    guardians,
    className,
  }

  if (oldClassId && oldClassId !== newClassId) {
    const oldCls = classes.find(c => c.id === oldClassId)
    if (oldCls) {
      oldCls.studentCount = children.filter(c => c.classId === oldClassId).length
    }
  }
  if (newClassId) {
    const newCls = classes.find(c => c.id === newClassId)
    if (newCls) {
      newCls.studentCount = children.filter(c => c.classId === newClassId).length
    }
  }

  res.json(success(children[idx], '更新幼儿成功'))
})

router.delete('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const idx = children.findIndex(c => c.id === id)

  if (idx === -1) {
    res.status(404).json(error('幼儿不存在', 404))
    return
  }

  const classId = children[idx].classId
  children.splice(idx, 1)

  if (classId) {
    const cls = classes.find(c => c.id === classId)
    if (cls) {
      cls.studentCount = children.filter(c => c.classId === classId).length
    }
  }

  res.json(success(null, '删除幼儿成功'))
})

router.get('/:id/recommend-class', (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const child = children.find(c => c.id === id)

  if (!child) {
    res.status(404).json(error('幼儿不存在', 404))
    return
  }

  const age = child.age
  const devScore = child.developmentScore?.overall ?? 80

  const eligibleClasses = classes.filter(cls => {
    const [minAge, maxAge] = cls.ageRange
    const ageMatch = age >= minAge && age <= maxAge
    const capacityMatch = cls.studentCount < cls.capacity
    const campusMatch = child.campusId === cls.campusId
    return ageMatch && capacityMatch && campusMatch
  })

  const scored = eligibleClasses.map(cls => {
    const [minAge, maxAge] = cls.ageRange
    const midAge = (minAge + maxAge) / 2
    const ageDiff = Math.abs(age - midAge)
    const fillRate = cls.studentCount / cls.capacity

    let score = 100
    score -= ageDiff * 10
    score -= fillRate * 20

    if (devScore >= 85) {
      score += 5
    }

    return { classInfo: cls, score: Math.max(0, score) }
  })

  scored.sort((a, b) => b.score - a.score)

  res.json(success({
    recommended: scored.slice(0, 3).map(s => s.classInfo),
    allEligible: scored.map(s => ({ ...s.classInfo, matchScore: s.score })),
  }, '获取推荐班级成功'))
})

router.post('/:id/assess', (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const idx = children.findIndex(c => c.id === id)

  if (idx === -1) {
    res.status(404).json(error('幼儿不存在', 404))
    return
  }

  const { language, motor, social, cognitive } = req.body as {
    language: number
    motor: number
    social: number
    cognitive: number
  }

  if (
    typeof language !== 'number' ||
    typeof motor !== 'number' ||
    typeof social !== 'number' ||
    typeof cognitive !== 'number'
  ) {
    res.status(400).json(error('语言、运动、社交、认知分数均为必填数字', 400))
    return
  }

  const overall = Math.round((language + motor + social + cognitive) / 4)

  const developmentScore: DevelopmentScore = {
    language,
    motor,
    social,
    cognitive,
    overall,
  }

  children[idx] = {
    ...children[idx],
    developmentScore,
  }

  res.json(success(developmentScore, '评估保存成功'))
})

export default router
