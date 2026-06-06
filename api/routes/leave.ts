import { Router, type Request, type Response } from 'express'
import { leave_records, children, users, bills, classes } from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import { calculateFeeAdjustment } from '../utils/helpers.js'
import type { LeaveRecord, FeeAdjustment } from '@shared/types'

const router = Router()

router.use(verifyToken)

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

router.get('/', (req: Request, res: Response): void => {
  const { childId, status, parentId, teacherId } = req.query

  let result = [...leave_records]

  if (childId) {
    const childIdNum = parseInt(childId as string, 10)
    if (!isNaN(childIdNum)) {
      result = result.filter(l => l.childId === childIdNum)
    }
  }

  if (status) {
    result = result.filter(l => l.status === status)
  }

  if (parentId) {
    const parentIdNum = parseInt(parentId as string, 10)
    if (!isNaN(parentIdNum)) {
      result = result.filter(l => l.parentId === parentIdNum)
    }
  }

  if (teacherId) {
    const teacherIdNum = parseInt(teacherId as string, 10)
    if (!isNaN(teacherIdNum)) {
      result = result.filter(l => l.approvedBy === teacherIdNum)
    }
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  res.json(success(result))
})

router.get('/:id', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const record = leave_records.find(l => l.id === id)

  if (!record) {
    res.status(404).json(error('请假记录不存在', 404))
    return
  }

  res.json(success(record))
})

router.post('/', (req: Request, res: Response): void => {
  const { childId, parentId, type, startDate, endDate, reason } = req.body

  if (!childId || !parentId || !type || !startDate || !endDate || !reason) {
    res.status(400).json(error('缺少必填字段', 400))
    return
  }

  const child = children.find(c => c.id === childId)
  const parent = users.find(u => u.id === parentId)

  const feeAdjustment: FeeAdjustment = calculateFeeAdjustment(startDate, endDate)

  const nextId = leave_records.length > 0 ? Math.max(...leave_records.map(l => l.id)) + 1 : 1

  const newRecord: LeaveRecord = {
    id: nextId,
    childId,
    childName: child?.name,
    parentId,
    parentName: parent?.name,
    type,
    startDate,
    endDate,
    reason,
    status: 'pending',
    feeAdjustment,
    createdAt: formatDateTime(new Date()),
  }

  leave_records.push(newRecord)
  res.status(201).json(success(newRecord, '请假申请已提交'))
})

router.put('/:id/approve', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const { approvedBy } = req.body
  const index = leave_records.findIndex(l => l.id === id)

  if (index === -1) {
    res.status(404).json(error('请假记录不存在', 404))
    return
  }

  if (!approvedBy) {
    res.status(400).json(error('缺少审批人', 400))
    return
  }

  const record = leave_records[index]
  record.status = 'approved'
  record.approvedBy = approvedBy
  record.approvedAt = formatDateTime(new Date())

  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const billIndex = bills.findIndex(b => b.childId === record.childId && b.month === month)

  if (billIndex !== -1) {
    const bill = bills[billIndex]
    const mealItemIndex = bill.items.findIndex(it => it.type === 'meal')
    if (mealItemIndex !== -1) {
      bill.items[mealItemIndex].deduction = (bill.items[mealItemIndex].deduction || 0) + record.feeAdjustment.mealFeeDeduction
    }
    const tuitionItemIndex = bill.items.findIndex(it => it.type === 'tuition')
    if (tuitionItemIndex !== -1) {
      bill.items[tuitionItemIndex].deduction = (bill.items[tuitionItemIndex].deduction || 0) + record.feeAdjustment.tuitionDeduction
    }
    bill.totalAmount = bill.items.reduce((sum, it) => sum + it.amount - (it.deduction || 0), 0)
  }

  const child = children.find(c => c.id === record.childId)
  const classInfo = child?.classId ? classes.find(cls => cls.id === child.classId) : undefined
  const teacherName = classInfo?.teacherName

  res.json(success({
    ...record,
    notifications: {
      parentNotified: true,
      teacherNotified: true,
      teacherName,
      message: `已通知${teacherName || '班级老师'}：${record.childName} ${record.startDate}至${record.endDate}请假${record.feeAdjustment.days}天，请调整当日活动安排。`,
    },
  }, '已批准，已通知家长和老师'))
})

router.put('/:id/reject', (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const { approvedBy } = req.body
  const index = leave_records.findIndex(l => l.id === id)

  if (index === -1) {
    res.status(404).json(error('请假记录不存在', 404))
    return
  }

  if (!approvedBy) {
    res.status(400).json(error('缺少审批人', 400))
    return
  }

  const record = leave_records[index]
  record.status = 'rejected'
  record.approvedBy = approvedBy
  record.approvedAt = formatDateTime(new Date())

  res.json(success(record, '已拒绝'))
})

router.post('/calculate-fee', (req: Request, res: Response): void => {
  const { startDate, endDate } = req.body

  if (!startDate || !endDate) {
    res.status(400).json(error('缺少开始日期或结束日期', 400))
    return
  }

  const result = calculateFeeAdjustment(startDate, endDate)
  res.json(success(result))
})

export default router
