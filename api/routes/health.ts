import { Router, type Request, type Response } from 'express'
import { morning_checks, health_trackings, children, classes, users } from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import type {
  MorningCheck,
  HealthTracking,
  TrackingRecord,
  HealthAlertLevel,
  CheckItem,
} from '@shared/types'

const router = Router()

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let morningCheckIdCounter = 1000
const nextMorningCheckId = () => morningCheckIdCounter++

let trackingIdCounter = 1000
const nextTrackingId = () => trackingIdCounter++

let recordIdCounter = 1000
const nextRecordId = () => recordIdCounter++

function enrichMorningCheck(check: MorningCheck): MorningCheck {
  const child = children.find(c => c.id === check.childId)
  const teacher = users.find(u => u.id === check.teacherId)
  const cls = classes.find(c => c.id === check.classId)
  return {
    ...check,
    childName: child?.name ?? check.childName,
    teacherName: teacher?.name ?? check.teacherName,
    className: cls?.name ?? check.className,
  }
}

function enrichHealthTracking(tracking: HealthTracking): HealthTracking {
  const child = children.find(c => c.id === tracking.childId)
  return {
    ...tracking,
    childName: child?.name ?? tracking.childName,
  }
}

function calcAlertLevel(
  temperature: number,
  oralCheck: CheckItem,
  handCheck: CheckItem,
  skinCheck: CheckItem,
  spiritCheck: CheckItem,
): HealthAlertLevel {
  const abnormalCount = [oralCheck, handCheck, skinCheck, spiritCheck].filter(
    item => item === 'abnormal'
  ).length

  if (temperature >= 38) {
    return 'danger'
  }

  if (temperature >= 37.5 || abnormalCount > 0) {
    if (abnormalCount >= 3) {
      return 'danger'
    }
    return 'warning'
  }

  return 'normal'
}

router.get('/morning-checks', verifyToken, (req: Request, res: Response): void => {
  const { date, childId, classId, alertLevel } = req.query
  const today = formatDate(new Date())
  const filterDate = (date as string) || today

  let results = [...morning_checks]

  results = results.filter(c => {
    const checkDate = c.createdAt.split(' ')[0]
    return checkDate === filterDate
  })

  if (childId) {
    const cid = parseInt(childId as string, 10)
    results = results.filter(c => c.childId === cid)
  }

  if (classId) {
    const clid = parseInt(classId as string, 10)
    results = results.filter(c => c.classId === clid)
  }

  if (alertLevel) {
    results = results.filter(c => c.alertLevel === (alertLevel as HealthAlertLevel))
  }

  const enriched = results.map(enrichMorningCheck)
  res.json(success(enriched))
})

router.post('/morning-checks', verifyToken, (req: Request, res: Response): void => {
  const {
    childId,
    teacherId,
    classId,
    temperature,
    oralCheck,
    handCheck,
    skinCheck,
    spiritCheck,
    note,
  } = req.body

  if (!childId || !teacherId || temperature === undefined) {
    res.status(400).json(error('缺少必要参数：childId, teacherId, temperature'))
    return
  }

  const alertLevel = calcAlertLevel(
    temperature,
    oralCheck || 'normal',
    handCheck || 'normal',
    skinCheck || 'normal',
    spiritCheck || 'normal'
  )

  const child = children.find(c => c.id === childId)
  const teacher = users.find(u => u.id === teacherId)
  const cls = classes.find(c => c.id === classId)

  const newCheck: MorningCheck = {
    id: nextMorningCheckId(),
    childId,
    childName: child?.name,
    teacherId,
    teacherName: teacher?.name,
    classId,
    className: cls?.name,
    temperature,
    oralCheck: oralCheck || 'normal',
    handCheck: handCheck || 'normal',
    skinCheck: skinCheck || 'normal',
    spiritCheck: spiritCheck || 'normal',
    note,
    alertLevel,
    createdAt: formatDateTime(new Date()),
  }

  morning_checks.push(newCheck)

  let notifications: {
    level: HealthAlertLevel
    parentNotified: boolean
    principalNotified: boolean
    parentNames: string[]
    principalNames: string[]
    trackingCreated: boolean
    message: string
  } | undefined

  if (alertLevel === 'warning' || alertLevel === 'danger') {
    const initialRecord: TrackingRecord = {
      id: nextRecordId(),
      date: formatDate(new Date()),
      status: '晨检异常，已通知家长',
      note: note || (alertLevel === 'danger' ? '异常情况严重，需立即处理' : '需要持续观察'),
      operator: teacher?.name || '老师',
    }

    const newTracking: HealthTracking = {
      id: nextTrackingId(),
      childId,
      childName: child?.name,
      checkId: newCheck.id,
      records: [initialRecord],
      status: 'tracking',
      createdAt: formatDateTime(new Date()),
    }

    health_trackings.push(newTracking)

    const parentNames = child?.guardians?.map(g => g.name) || []
    const campusId = child?.campusId ?? cls?.campusId
    const principalNames = users
      .filter(u => u.role === 'principal' && (!campusId || u.campusId === campusId))
      .map(u => u.name)

    const abnormalItems: string[] = []
    if (temperature >= 37.5) abnormalItems.push(`体温 ${temperature.toFixed(1)}°C`)
    if (oralCheck === 'abnormal') abnormalItems.push('口腔异常')
    if (handCheck === 'abnormal') abnormalItems.push('手部异常')
    if (skinCheck === 'abnormal') abnormalItems.push('皮肤异常')
    if (spiritCheck === 'abnormal') abnormalItems.push('精神异常')

    notifications = {
      level: alertLevel,
      parentNotified: true,
      principalNotified: alertLevel === 'danger',
      parentNames,
      principalNames,
      trackingCreated: true,
      message: `【晨检${alertLevel === 'danger' ? '高危' : '预警'}】${child?.name || '该幼儿'}：${abnormalItems.join('、')}。已通知家长${alertLevel === 'danger' ? '和园长' : ''}，并创建健康追踪记录。`,
    }
  }

  res.json(success({
    ...newCheck,
    notifications,
  }, '晨检记录创建成功'))
})

router.get('/trackings', verifyToken, (req: Request, res: Response): void => {
  const { status, childId } = req.query

  let results = [...health_trackings]

  if (status) {
    results = results.filter(t => t.status === (status as 'tracking' | 'recovered'))
  }

  if (childId) {
    const cid = parseInt(childId as string, 10)
    results = results.filter(t => t.childId === cid)
  }

  const enriched = results.map(enrichHealthTracking)
  res.json(success(enriched))
})

router.get('/trackings/:id', verifyToken, (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const tracking = health_trackings.find(t => t.id === id)

  if (!tracking) {
    res.status(404).json(error('追踪记录不存在', 404))
    return
  }

  res.json(success(enrichHealthTracking(tracking)))
})

router.put('/trackings/:id', verifyToken, (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const { records, status } = req.body
  const tracking = health_trackings.find(t => t.id === id)

  if (!tracking) {
    res.status(404).json(error('追踪记录不存在', 404))
    return
  }

  if (status) {
    if (status !== 'tracking' && status !== 'recovered') {
      res.status(400).json(error('无效的状态值，应为 tracking 或 recovered'))
      return
    }
    tracking.status = status
  }

  if (records && Array.isArray(records) && records.length > 0) {
    for (const rec of records) {
      const newRecord: TrackingRecord = {
        id: nextRecordId(),
        date: rec.date || formatDate(new Date()),
        status: rec.status,
        note: rec.note,
        operator: rec.operator || '保健医',
      }
      tracking.records.push(newRecord)
    }
  }

  res.json(success(enrichHealthTracking(tracking), '追踪记录更新成功'))
})

router.get('/trackings/:id/records', verifyToken, (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const tracking = health_trackings.find(t => t.id === id)

  if (!tracking) {
    res.status(404).json(error('追踪记录不存在', 404))
    return
  }

  res.json(success(tracking.records))
})

export default router
