import { Router, type Request, type Response } from 'express'
import { bills, children, leave_records } from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { calculateOverdueDays } from '../utils/helpers.js'
import type { Bill, BillStatus } from '@shared/types'

const router = Router()

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let idCounter = 1000
const nextId = () => idCounter++

router.get('/', verifyToken, (req: Request, res: Response): void => {
  const { childId, month, campusId, status } = req.query

  let filtered = [...bills]

  if (childId) {
    filtered = filtered.filter(b => b.childId === Number(childId))
  }
  if (month) {
    filtered = filtered.filter(b => b.month === String(month))
  }
  if (campusId) {
    filtered = filtered.filter(b => b.campusId === Number(campusId))
  }
  if (status) {
    filtered = filtered.filter(b => b.status === status)
  }

  for (const bill of filtered) {
    const overdueDays = calculateOverdueDays(bill.dueDate)
    bill.overdueDays = overdueDays

    if (bill.status !== 'suspended' && overdueDays >= 15) {
      bill.status = 'suspended' as BillStatus
      bill.suspendedAt = formatDateTime(new Date())
      const child = children.find(c => c.id === bill.childId)
      if (child && child.status === 'active') {
        child.status = 'suspended'
      }
    }
  }

  const result = filtered.map(bill => {
    const child = children.find(c => c.id === bill.childId)
    return {
      ...bill,
      childStatus: child?.status,
    }
  })

  res.json(success(result))
})

router.get('/suspended/list', verifyToken, requireRole('super_admin', 'principal', 'finance'), (req: Request, res: Response): void => {
  const suspendedBills = bills.filter(b => b.status === 'suspended')
  res.json(success(suspendedBills))
})

router.get('/:id', verifyToken, (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const bill = bills.find(b => b.id === id)

  if (!bill) {
    res.status(404).json(error('账单不存在', 404))
    return
  }

  bill.overdueDays = calculateOverdueDays(bill.dueDate)
  const child = children.find(c => c.id === bill.childId)
  res.json(success({ ...bill, childStatus: child?.status }))
})

router.post('/', verifyToken, (req: Request, res: Response): void => {
  const { childId, month, items, totalAmount, dueDate } = req.body

  if (!childId || !month || !items || !totalAmount || !dueDate) {
    res.status(400).json(error('缺少必要参数', 400))
    return
  }

  const child = children.find(c => c.id === Number(childId))
  if (!child) {
    res.status(404).json(error('儿童不存在', 404))
    return
  }

  const newBill: Bill = {
    id: nextId(),
    childId: Number(childId),
    childName: child.name,
    month: String(month),
    campusId: child.campusId,
    items,
    totalAmount: Number(totalAmount),
    paidAmount: 0,
    status: 'unpaid' as BillStatus,
    dueDate: String(dueDate),
    overdueDays: 0,
    createdAt: formatDateTime(new Date()),
  }

  bills.push(newBill)
  res.json(success(newBill, '账单创建成功'))
})

router.put('/:id/pay', verifyToken, (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const { amount } = req.body

  const bill = bills.find(b => b.id === id)
  if (!bill) {
    res.status(404).json(error('账单不存在', 404))
    return
  }

  if (!amount || Number(amount) <= 0) {
    res.status(400).json(error('支付金额无效', 400))
    return
  }

  const wasSuspended = bill.status === 'suspended'
  bill.paidAmount += Number(amount)

  if (bill.paidAmount >= bill.totalAmount) {
    bill.paidAmount = bill.totalAmount
    bill.status = 'paid' as BillStatus
    bill.paidAt = formatDateTime(new Date())
    if (wasSuspended) {
      bill.suspendedAt = undefined
      const child = children.find(c => c.id === bill.childId)
      const otherSuspended = bills.filter(b => b.childId === bill.childId && b.id !== bill.id && b.status === 'suspended')
      if (child && child.status === 'suspended' && otherSuspended.length === 0) {
        child.status = 'active'
      }
    }
  } else if (bill.paidAmount > 0) {
    bill.status = 'partial' as BillStatus
  }

  const child = children.find(c => c.id === bill.childId)
  res.json(success({ ...bill, childStatus: child?.status }, '支付成功'))
})

router.post('/:id/restore', verifyToken, requireRole('super_admin', 'principal'), (req: Request, res: Response): void => {
  const id = Number(req.params.id)
  const bill = bills.find(b => b.id === id)

  if (!bill) {
    res.status(404).json(error('账单不存在', 404))
    return
  }

  if (bill.status !== 'suspended') {
    res.status(400).json(error('账单不是暂停状态', 400))
    return
  }

  bill.status = 'unpaid' as BillStatus
  bill.suspendedAt = undefined

  const child = children.find(c => c.id === bill.childId)
  const otherSuspended = bills.filter(b => b.childId === bill.childId && b.id !== bill.id && b.status === 'suspended')
  if (child && child.status === 'suspended' && otherSuspended.length === 0) {
    child.status = 'active'
  }

  res.json(success({ ...bill, childStatus: child?.status }, '账单已恢复'))
})

export default router
