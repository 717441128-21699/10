import { Router, type Request, type Response } from 'express'
import {
  users,
  morning_checks,
  health_trackings,
  activities,
  activity_registrations,
  recipe_feedbacks,
  pickup_records,
  bills,
  children,
  classes,
} from '../db.js'
import { success } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import type { DashboardStats, WarningItem } from '@shared/types'

const router = Router()

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

router.get('/dashboard', verifyToken, (req: Request, res: Response): void => {
  const { campusId } = req.query
  const todayStr = formatDate(new Date())

  let campusChildren = [...children]
  let campusClasses = [...classes]
  let campusMorningChecks = [...morning_checks]
  let campusHealthTrackings = [...health_trackings]
  let campusActivities = [...activities]
  let campusRegistrations = [...activity_registrations]
  let campusFeedbacks = [...recipe_feedbacks]
  let campusPickups = [...pickup_records]
  let campusBills = [...bills]

  if (campusId) {
    const cid = Number(campusId)
    campusChildren = campusChildren.filter(c => c.campusId === cid)
    campusClasses = campusClasses.filter(c => c.campusId === cid)
    campusMorningChecks = campusMorningChecks.filter(mc => {
      const child = campusChildren.find(c => c.id === mc.childId)
      return child?.campusId === cid
    })
    campusHealthTrackings = campusHealthTrackings.filter(ht => {
      const child = campusChildren.find(c => c.id === ht.childId)
      return child?.campusId === cid
    })
    campusActivities = campusActivities.filter(a => a.campusId === cid)
    campusRegistrations = activity_registrations.filter(ar =>
      campusActivities.some(a => a.id === ar.activityId)
    )
    campusBills = campusBills.filter(b => b.campusId === cid)
  }

  const todayTotal = campusChildren.length
  const todayPresent = campusMorningChecks.filter(mc => mc.createdAt.startsWith(todayStr)).length
  const todayRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0

  const trend: number[] = []
  for (let i = 29; i >= 0; i--) {
    const dateStr = formatDate(daysAgo(i))
    const dayChecks = campusMorningChecks.filter(mc => mc.createdAt.startsWith(dateStr)).length
    const dayTotal = campusChildren.length
    trend.push(dayTotal > 0 ? Math.round((dayChecks / dayTotal) * 100) : 0)
  }

  const byClass = campusClasses.map(cls => {
    const classChildren = campusChildren.filter(c => c.classId === cls.id)
    const classTotal = classChildren.length
    const classPresent = campusMorningChecks.filter(mc =>
      classChildren.some(c => c.id === mc.childId) && mc.createdAt.startsWith(todayStr)
    ).length
    return {
      name: cls.name,
      rate: classTotal > 0 ? Math.round((classPresent / classTotal) * 100) : 0,
      present: classPresent,
      total: classTotal,
    }
  })

  const todayEvents = campusMorningChecks.filter(
    mc => mc.alertLevel !== 'normal' && mc.createdAt.startsWith(todayStr)
  ).length

  const activeAlerts = campusHealthTrackings.filter(ht => ht.status === 'tracking').length

  const eventDistribution = [
    {
      name: '发热',
      value: campusMorningChecks.filter(mc => mc.temperature >= 37.5).length,
    },
    {
      name: '咳嗽',
      value: campusMorningChecks.filter(mc => mc.oralCheck === 'abnormal').length,
    },
    {
      name: '皮疹',
      value: campusMorningChecks.filter(mc => mc.skinCheck === 'abnormal').length,
    },
    {
      name: '精神差',
      value: campusMorningChecks.filter(mc => mc.spiritCheck === 'abnormal').length,
    },
    {
      name: '其他',
      value: campusMorningChecks.filter(mc => mc.handCheck === 'abnormal').length,
    },
  ]

  const trackingCount = campusHealthTrackings.length

  const ongoingCount = campusActivities.filter(a => {
    const activityDate = new Date(a.date)
    const today = new Date()
    return activityDate >= today
  }).length

  const totalRegistrations = campusRegistrations.length

  const popularity = campusActivities
    .map(a => ({
      name: a.title,
      count: campusRegistrations.filter(r => r.activityId === a.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const totalCount = campusFeedbacks.length
  const average = totalCount > 0
    ? Math.round((campusFeedbacks.reduce((sum, f) => sum + f.rating, 0) / totalCount) * 10) / 10
    : 0

  const distribution: number[] = [0, 0, 0, 0, 0]
  for (const fb of campusFeedbacks) {
    if (fb.rating >= 1 && fb.rating <= 5) {
      distribution[fb.rating - 1]++
    }
  }

  const warnings: WarningItem[] = []

  let warningId = 1
  for (const ht of campusHealthTrackings.filter(h => h.status === 'tracking')) {
    warnings.push({
      id: warningId++,
      type: 'health',
      level: 'warning',
      message: `${ht.childName} 健康追踪中`,
      createdAt: ht.createdAt,
    })
  }

  for (const pr of campusPickups.filter(p => p.isAbnormal)) {
    warnings.push({
      id: warningId++,
      type: 'pickup',
      level: 'danger',
      message: `${pr.childName} 接送异常: ${pr.abnormalNote || '未知原因'}`,
      createdAt: pr.createdAt,
    })
  }

  for (const b of campusBills.filter(bill => bill.status === 'suspended')) {
    warnings.push({
      id: warningId++,
      type: 'billing',
      level: 'warning',
      message: `${b.childName} ${b.month} 账单已暂停`,
      createdAt: b.suspendedAt || b.createdAt,
    })
  }

  warnings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const stats: DashboardStats = {
    attendance: {
      todayRate,
      todayPresent,
      todayTotal,
      trend,
      byClass,
    },
    health: {
      todayEvents,
      activeAlerts,
      eventDistribution,
      trackingCount,
    },
    activities: {
      ongoingCount,
      totalRegistrations,
      popularity,
    },
    satisfaction: {
      average,
      totalCount,
      distribution,
    },
    warnings,
  }

  res.json(success(stats))
})

export default router
