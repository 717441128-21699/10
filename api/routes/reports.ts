import { Router, type Request, type Response } from 'express'
import {
  morning_checks,
  health_trackings,
  bills,
  activities,
  activity_registrations,
  children,
} from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

type ReportType = 'attendance' | 'health' | 'billing' | 'activity'
type ReportFormat = 'json' | 'csv'

function toCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const headerRow = headers.join(',')

  const dataRows = data.map(row =>
    headers
      .map(h => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(',')
  )

  return [headerRow, ...dataRows].join('\n')
}

router.get('/export', verifyToken, (req: Request, res: Response): void => {
  const { type, startDate, endDate, campusId, format } = req.query

  if (!type) {
    res.status(400).json(error('缺少报表类型', 400))
    return
  }

  const validTypes: ReportType[] = ['attendance', 'health', 'billing', 'activity']
  if (!validTypes.includes(type as ReportType)) {
    res.status(400).json(error('无效的报表类型', 400))
    return
  }

  const reportFormat: ReportFormat = (format as ReportFormat) || 'json'
  if (reportFormat !== 'json' && reportFormat !== 'csv') {
    res.status(400).json(error('无效的导出格式', 400))
    return
  }

  let data: Record<string, any>[] = []

  switch (type as ReportType) {
    case 'attendance': {
      let filtered = [...morning_checks]

      if (startDate) {
        filtered = filtered.filter(mc => mc.createdAt >= String(startDate))
      }
      if (endDate) {
        filtered = filtered.filter(mc => mc.createdAt <= String(endDate) + ' 23:59:59')
      }
      if (campusId) {
        const cid = Number(campusId)
        filtered = filtered.filter(mc => {
          const child = children.find(c => c.id === mc.childId)
          return child?.campusId === cid
        })
      }

      data = filtered.map(mc => ({
        id: mc.id,
        儿童ID: mc.childId,
        儿童姓名: mc.childName,
        班级: mc.className,
        体温: mc.temperature,
        口腔检查: mc.oralCheck,
        手部检查: mc.handCheck,
        皮肤检查: mc.skinCheck,
        精神状态: mc.spiritCheck,
        异常级别: mc.alertLevel,
        备注: mc.note || '',
        检查时间: mc.createdAt,
      }))
      break
    }

    case 'health': {
      let filtered = [...health_trackings]

      if (startDate) {
        filtered = filtered.filter(ht => ht.createdAt >= String(startDate))
      }
      if (endDate) {
        filtered = filtered.filter(ht => ht.createdAt <= String(endDate) + ' 23:59:59')
      }
      if (campusId) {
        const cid = Number(campusId)
        filtered = filtered.filter(ht => {
          const child = children.find(c => c.id === ht.childId)
          return child?.campusId === cid
        })
      }

      data = filtered.map(ht => ({
        id: ht.id,
        儿童ID: ht.childId,
        儿童姓名: ht.childName,
        关联晨检ID: ht.checkId,
        状态: ht.status === 'tracking' ? '追踪中' : '已康复',
        追踪记录数: ht.records.length,
        最新状态: ht.records[ht.records.length - 1]?.status || '',
        创建时间: ht.createdAt,
      }))
      break
    }

    case 'billing': {
      let filtered = [...bills]

      if (startDate) {
        filtered = filtered.filter(b => b.createdAt >= String(startDate))
      }
      if (endDate) {
        filtered = filtered.filter(b => b.createdAt <= String(endDate) + ' 23:59:59')
      }
      if (campusId) {
        filtered = filtered.filter(b => b.campusId === Number(campusId))
      }

      const statusMap: Record<string, string> = {
        unpaid: '未支付',
        partial: '部分支付',
        paid: '已支付',
        suspended: '已暂停',
      }

      data = filtered.map(b => ({
        id: b.id,
        儿童ID: b.childId,
        儿童姓名: b.childName,
        月份: b.month,
        校区ID: b.campusId,
        总金额: b.totalAmount,
        已支付: b.paidAmount,
        待支付: b.totalAmount - b.paidAmount,
        状态: statusMap[b.status] || b.status,
        截止日期: b.dueDate,
        逾期天数: b.overdueDays,
        支付时间: b.paidAt || '',
        暂停时间: b.suspendedAt || '',
        创建时间: b.createdAt,
      }))
      break
    }

    case 'activity': {
      let filteredActivities = [...activities]
      let filteredRegistrations = [...activity_registrations]

      if (campusId) {
        const cid = Number(campusId)
        filteredActivities = filteredActivities.filter(a => a.campusId === cid)
        filteredRegistrations = activity_registrations.filter(ar =>
          filteredActivities.some(a => a.id === ar.activityId)
        )
      }

      if (startDate) {
        filteredActivities = filteredActivities.filter(a => a.date >= String(startDate))
        filteredRegistrations = filteredRegistrations.filter(ar =>
          filteredActivities.some(a => a.id === ar.activityId)
        )
      }
      if (endDate) {
        filteredActivities = filteredActivities.filter(a => a.date <= String(endDate))
        filteredRegistrations = filteredRegistrations.filter(ar =>
          filteredActivities.some(a => a.id === ar.activityId)
        )
      }

      data = filteredRegistrations.map(ar => {
        const activity = filteredActivities.find(a => a.id === ar.activityId)
        return {
          id: ar.id,
          活动ID: ar.activityId,
          活动名称: activity?.title || '',
          活动日期: activity?.date || '',
          活动地点: activity?.location || '',
          儿童ID: ar.childId,
          儿童姓名: ar.childName,
          家长ID: ar.parentId,
          备注: ar.note || '',
          报名时间: ar.createdAt,
        }
      })
      break
    }
  }

  if (reportFormat === 'csv') {
    const csv = toCSV(data)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`)
    res.send('\uFEFF' + csv)
  } else {
    res.json(success(data))
  }
})

export default router
