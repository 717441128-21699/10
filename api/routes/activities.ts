import { Router, type Request, type Response } from 'express'
import { activities, activity_registrations, children, users, campuses } from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import type { Activity, ActivityMaterial, ActivityRegistration } from '@shared/types'

const router = Router()

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let nextActivityId = 1
function getNextActivityId(): number {
  if (activities.length > 0) {
    nextActivityId = Math.max(...activities.map(a => a.id)) + 1
  }
  return nextActivityId++
}

let nextRegistrationId = 1
function getNextRegistrationId(): number {
  if (activity_registrations.length > 0) {
    nextRegistrationId = Math.max(...activity_registrations.map(r => r.id)) + 1
  }
  return nextRegistrationId++
}

function updateActivityRegistrations(activityId: number): void {
  const activity = activities.find(a => a.id === activityId)
  if (activity) {
    activity.registrations = activity_registrations.filter(r => r.activityId === activityId)
  }
}

function updateMaterialsTotalQuantity(activity: Activity): void {
  const registrationCount = activity_registrations.filter(r => r.activityId === activity.id).length
  activity.materials.forEach(m => {
    m.totalQuantity = m.quantityPerPerson * registrationCount
  })
}

router.get('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { campusId, upcoming, keyword } = req.query as {
      campusId?: string
      upcoming?: string
      keyword?: string
    }

    let filteredActivities = [...activities]

    if (campusId) {
      const cid = parseInt(campusId, 10)
      filteredActivities = filteredActivities.filter(a => a.campusId === cid)
    }

    if (upcoming === 'true') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      filteredActivities = filteredActivities.filter(a => new Date(a.date) >= today)
    }

    if (keyword) {
      const kw = keyword.toLowerCase()
      filteredActivities = filteredActivities.filter(
        a => a.title.toLowerCase().includes(kw) || a.description.toLowerCase().includes(kw),
      )
    }

    const activitiesWithRegistrations = filteredActivities.map(activity => {
      const registrations = activity_registrations.filter(r => r.activityId === activity.id)
      return {
        ...activity,
        registrations,
        registrationCount: registrations.length,
      }
    })

    res.json(success(activitiesWithRegistrations, '获取成功'))
  } catch (err) {
    res.status(500).json(error('获取活动列表失败'))
  }
})

router.get('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10)
    const activity = activities.find(a => a.id === id)

    if (!activity) {
      res.status(404).json(error('活动不存在'))
      return
    }

    const registrations = activity_registrations.filter(r => r.activityId === id)
    const campus = campuses.find(c => c.id === activity.campusId)
    const creator = users.find(u => u.id === activity.createdBy)

    const materialsWithCalculatedQuantity = activity.materials.map(m => ({
      ...m,
      totalQuantity: m.quantityPerPerson * registrations.length,
    }))

    const detail = {
      ...activity,
      registrations,
      registrationCount: registrations.length,
      materials: materialsWithCalculatedQuantity,
      campusName: activity.campusName ?? campus?.name,
      creatorName: creator?.name,
    }

    res.json(success(detail, '获取成功'))
  } catch (err) {
    res.status(500).json(error('获取活动详情失败'))
  }
})

router.post('/', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as {
      title: string
      description: string
      campusId: number
      classIds?: number[]
      date: string
      location: string
      maxParticipants: number
      materials?: ActivityMaterial[]
    }

    if (!body.title || !body.campusId || !body.date || !body.location || !body.maxParticipants) {
      res.status(400).json(error('缺少必填字段'))
      return
    }

    const campus = campuses.find(c => c.id === body.campusId)
    if (!campus) {
      res.status(404).json(error('校区不存在'))
      return
    }

    const materials = (body.materials ?? []).map(m => ({
      ...m,
      totalQuantity: m.quantityPerPerson * body.maxParticipants,
    }))

    const activity: Activity = {
      id: getNextActivityId(),
      title: body.title,
      description: body.description,
      campusId: body.campusId,
      campusName: campus.name,
      classIds: body.classIds,
      date: body.date,
      location: body.location,
      maxParticipants: body.maxParticipants,
      registrations: [],
      materials,
      createdBy: req.user?.id ?? 1,
      createdAt: formatDateTime(new Date()),
    }

    activities.push(activity)

    res.json(success(activity, '活动创建成功'))
  } catch (err) {
    res.status(500).json(error('创建活动失败'))
  }
})

router.put('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10)
    const activity = activities.find(a => a.id === id)

    if (!activity) {
      res.status(404).json(error('活动不存在'))
      return
    }

    const body = req.body as Partial<{
      title: string
      description: string
      campusId: number
      classIds: number[]
      date: string
      location: string
      maxParticipants: number
      materials: ActivityMaterial[]
    }>

    if (body.campusId !== undefined) {
      const campus = campuses.find(c => c.id === body.campusId)
      if (!campus) {
        res.status(404).json(error('校区不存在'))
        return
      }
      activity.campusId = body.campusId
      activity.campusName = campus.name
    }

    if (body.title !== undefined) activity.title = body.title
    if (body.description !== undefined) activity.description = body.description
    if (body.classIds !== undefined) activity.classIds = body.classIds
    if (body.date !== undefined) activity.date = body.date
    if (body.location !== undefined) activity.location = body.location
    if (body.maxParticipants !== undefined) activity.maxParticipants = body.maxParticipants

    if (body.materials !== undefined) {
      const registrationCount = activity_registrations.filter(r => r.activityId === id).length
      activity.materials = body.materials.map(m => ({
        ...m,
        totalQuantity: m.quantityPerPerson * registrationCount,
      }))
    }

    res.json(success(activity, '活动更新成功'))
  } catch (err) {
    res.status(500).json(error('更新活动失败'))
  }
})

router.delete('/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10)
    const index = activities.findIndex(a => a.id === id)

    if (index === -1) {
      res.status(404).json(error('活动不存在'))
      return
    }

    activities.splice(index, 1)
    for (let i = activity_registrations.length - 1; i >= 0; i--) {
      if (activity_registrations[i].activityId === id) {
        activity_registrations.splice(i, 1)
      }
    }

    res.json(success(null, '活动删除成功'))
  } catch (err) {
    res.status(500).json(error('删除活动失败'))
  }
})

router.post('/:id/register', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const activityId = parseInt(req.params.id, 10)
    const activity = activities.find(a => a.id === activityId)

    if (!activity) {
      res.status(404).json(error('活动不存在'))
      return
    }

    const { childId, parentId, note } = req.body as {
      childId: number
      parentId: number
      note?: string
    }

    if (!childId || !parentId) {
      res.status(400).json(error('缺少 childId 或 parentId'))
      return
    }

    const child = children.find(c => c.id === childId)
    if (!child) {
      res.status(404).json(error('幼儿不存在'))
      return
    }

    const parent = users.find(u => u.id === parentId)
    if (!parent) {
      res.status(404).json(error('家长不存在'))
      return
    }

    const currentRegistrations = activity_registrations.filter(r => r.activityId === activityId)
    if (currentRegistrations.length >= activity.maxParticipants) {
      res.status(400).json(error('活动名额已满'))
      return
    }

    const alreadyRegistered = currentRegistrations.some(r => r.childId === childId)
    if (alreadyRegistered) {
      res.status(400).json(error('该幼儿已报名此活动'))
      return
    }

    const registration: ActivityRegistration = {
      id: getNextRegistrationId(),
      activityId,
      childId,
      childName: child.name,
      parentId,
      note,
      createdAt: formatDateTime(new Date()),
    }

    activity_registrations.push(registration)
    updateActivityRegistrations(activityId)
    updateMaterialsTotalQuantity(activity)

    res.json(success(registration, '报名成功'))
  } catch (err) {
    res.status(500).json(error('活动报名失败'))
  }
})

router.delete('/:id/register/:registrationId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const activityId = parseInt(req.params.id, 10)
    const registrationId = parseInt(req.params.registrationId, 10)

    const activity = activities.find(a => a.id === activityId)
    if (!activity) {
      res.status(404).json(error('活动不存在'))
      return
    }

    const regIndex = activity_registrations.findIndex(r => r.id === registrationId && r.activityId === activityId)
    if (regIndex === -1) {
      res.status(404).json(error('报名记录不存在'))
      return
    }

    activity_registrations.splice(regIndex, 1)
    updateActivityRegistrations(activityId)
    updateMaterialsTotalQuantity(activity)

    res.json(success(null, '取消报名成功'))
  } catch (err) {
    res.status(500).json(error('取消报名失败'))
  }
})

router.get('/:id/materials', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10)
    const activity = activities.find(a => a.id === id)

    if (!activity) {
      res.status(404).json(error('活动不存在'))
      return
    }

    const registrationCount = activity_registrations.filter(r => r.activityId === id).length
    const materials = activity.materials.map(m => ({
      ...m,
      totalQuantity: m.quantityPerPerson * registrationCount,
    }))

    res.json(
      success(
        {
          materials,
          registrationCount,
          maxParticipants: activity.maxParticipants,
        },
        '获取成功',
      ),
    )
  } catch (err) {
    res.status(500).json(error('获取活动物资清单失败'))
  }
})

export default router
