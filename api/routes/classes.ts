import { Router, type Request, type Response } from 'express'
import { classes, children, course_plans } from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import type { ClassInfo, CoursePlan } from '@shared/types'

const router = Router()

router.use(verifyToken)

router.get('/', (req: Request, res: Response): void => {
  const { campusId } = req.query

  let result = [...classes]

  if (campusId) {
    const campusIdNum = parseInt(campusId as string, 10)
    if (!isNaN(campusIdNum)) {
      result = result.filter(c => c.campusId === campusIdNum)
    }
  }

  const enriched = result.map(cls => ({
    ...cls,
    studentCount: children.filter(c => c.classId === cls.id).length,
    courses: course_plans.filter(cp => cp.classId === cls.id),
  }))

  res.json(success(enriched))
})

router.get('/:id', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const cls = classes.find(c => c.id === id)

  if (!cls) {
    res.status(404).json(error('班级不存在', 404))
    return
  }

  const enriched = {
    ...cls,
    studentCount: children.filter(c => c.classId === id).length,
    courses: course_plans.filter(cp => cp.classId === id),
  }

  res.json(success(enriched))
})

router.post('/', (req: Request, res: Response): void => {
  const { name, campusId, teacherId, teacherName, classroom, capacity, ageRange } = req.body

  if (!name || !campusId || !teacherId || !classroom || !capacity || !ageRange) {
    res.status(400).json(error('缺少必填字段', 400))
    return
  }

  const nextId = classes.length > 0 ? Math.max(...classes.map(c => c.id)) + 1 : 1

  const newClass: ClassInfo = {
    id: nextId,
    name,
    campusId,
    teacherId,
    teacherName,
    classroom,
    capacity,
    studentCount: 0,
    ageRange,
    courses: [],
  }

  classes.push(newClass)
  res.status(201).json(success(newClass, '创建成功'))
})

router.put('/:id', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const index = classes.findIndex(c => c.id === id)

  if (index === -1) {
    res.status(404).json(error('班级不存在', 404))
    return
  }

  classes[index] = {
    ...classes[index],
    ...req.body,
    id,
  }

  res.json(success(classes[index], '更新成功'))
})

router.delete('/:id', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const index = classes.findIndex(c => c.id === id)

  if (index === -1) {
    res.status(404).json(error('班级不存在', 404))
    return
  }

  classes.splice(index, 1)
  res.json(success(null, '删除成功'))
})

router.get('/:id/courses', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const cls = classes.find(c => c.id === id)

  if (!cls) {
    res.status(404).json(error('班级不存在', 404))
    return
  }

  const courses = course_plans.filter(cp => cp.classId === id)
  res.json(success(courses))
})

router.put('/:id/courses', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const { courses } = req.body as { courses: CoursePlan[] }

  const cls = classes.find(c => c.id === id)
  if (!cls) {
    res.status(404).json(error('班级不存在', 404))
    return
  }

  if (!Array.isArray(courses)) {
    res.status(400).json(error('courses 必须是数组', 400))
    return
  }

  const existingIndices = course_plans
    .map((cp, idx) => (cp.classId === id ? idx : -1))
    .filter(idx => idx !== -1)
    .sort((a, b) => b - a)

  for (const idx of existingIndices) {
    course_plans.splice(idx, 1)
  }

  let nextCourseId = course_plans.length > 0 ? Math.max(...course_plans.map(cp => cp.id)) + 1 : 1

  for (const course of courses) {
    const newCourse: CoursePlan = {
      id: course.id || nextCourseId++,
      classId: id,
      weekDay: course.weekDay,
      period: course.period,
      name: course.name,
      category: course.category,
      description: course.description,
    }
    course_plans.push(newCourse)
  }

  const updatedCourses = course_plans.filter(cp => cp.classId === id)
  res.json(success(updatedCourses, '课程计划已更新'))
})

export default router
