import { Router, type Request, type Response } from 'express'
import { pickup_codes, pickup_records, children } from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import { generatePickupCode } from '../utils/helpers.js'
import type { PickupCode, PickupRecord, Guardian, Child } from '@shared/types'

const router = Router()

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let nextPickupCodeId = 1
function getNextPickupCodeId(): number {
  if (pickup_codes.length > 0) {
    nextPickupCodeId = Math.max(...pickup_codes.map(c => c.id)) + 1
  }
  return nextPickupCodeId++
}

let nextPickupRecordId = 1
function getNextPickupRecordId(): number {
  if (pickup_records.length > 0) {
    nextPickupRecordId = Math.max(...pickup_records.map(r => r.id)) + 1
  }
  return nextPickupRecordId++
}

router.post('/generate-code', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { childId, guardianId } = req.body as { childId: number; guardianId: number }

    if (!childId || !guardianId) {
      res.status(400).json(error('缺少 childId 或 guardianId'))
      return
    }

    const child = children.find(c => c.id === childId)
    if (!child) {
      res.status(404).json(error('幼儿不存在'))
      return
    }

    const guardian = child.guardians.find((g: Guardian) => g.id === guardianId)
    if (!guardian) {
      res.status(404).json(error('接送人不存在'))
      return
    }

    const code = generatePickupCode()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000)

    const pickupCode: PickupCode = {
      id: getNextPickupCodeId(),
      childId,
      guardianId,
      guardianName: guardian.name,
      guardianPhoto: guardian.photo,
      code,
      expiresAt: formatDateTime(expiresAt),
      createdAt: formatDateTime(now),
    }

    pickup_codes.push(pickupCode)

    res.json(
      success({
        code,
        expiresAt: pickupCode.expiresAt,
        guardianInfo: {
          id: guardian.id,
          name: guardian.name,
          relation: guardian.relation,
          phone: guardian.phone,
          photo: guardian.photo,
        },
      }, '接送码生成成功'),
    )
  } catch (err) {
    res.status(500).json(error('生成接送码失败'))
  }
})

router.get('/codes/:childId', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const childId = parseInt(req.params.childId, 10)

    const child = children.find(c => c.id === childId)
    if (!child) {
      res.status(404).json(error('幼儿不存在'))
      return
    }

    const now = new Date()
    const validCodes = pickup_codes.filter(c => {
      if (c.childId !== childId) return false
      const expiresAt = new Date(c.expiresAt)
      return expiresAt > now
    })

    res.json(success(validCodes, '获取成功'))
  } catch (err) {
    res.status(500).json(error('获取接送码列表失败'))
  }
})

router.post('/verify', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as {
      code?: string
      childId?: number
      guardianId?: number
      photoMatch?: boolean
      isAbnormal?: boolean
      abnormalNote?: string
    }

    let record: PickupRecord
    let warningMessage: string | undefined
    let warningLevel: 'warning' | 'danger' | undefined
    let guardianInfo: { id: number; name: string; relation: string; phone: string; photo: string } | undefined
    let childInfo: { id: number; name: string; className?: string } | undefined

    if (body.code) {
      const now = new Date()
      const validCode = pickup_codes.find(c => {
        if (c.code !== body.code) return false
        const expiresAt = new Date(c.expiresAt)
        return expiresAt > now
      })

      if (!validCode) {
        res.status(400).json(error('接送码无效或已过期'))
        return
      }

      const child = children.find(c => c.id === validCode.childId)
      const guardian = child?.guardians.find((g: Guardian) => g.id === validCode.guardianId)

      guardianInfo = guardian ? {
        id: guardian.id,
        name: guardian.name,
        relation: guardian.relation,
        phone: guardian.phone,
        photo: guardian.photo,
      } : undefined

      childInfo = child ? {
        id: child.id,
        name: child.name,
        className: child.className,
      } : undefined

      const isAbnormal = body.isAbnormal ?? body.photoMatch === false
      if (isAbnormal) {
        warningLevel = body.photoMatch === false ? 'danger' : 'warning'
        warningMessage = body.abnormalNote || (body.photoMatch === false ? '照片比对不通过，请人工核验！' : '本次接送存在异常，请关注')
      }

      record = {
        id: getNextPickupRecordId(),
        childId: validCode.childId,
        childName: child?.name,
        guardianId: validCode.guardianId,
        guardianName: guardian?.name ?? validCode.guardianName,
        guardianPhoto: guardian?.photo ?? validCode.guardianPhoto,
        photoMatch: body.photoMatch ?? true,
        isAbnormal,
        abnormalNote: body.abnormalNote,
        operatorId: req.user?.id,
        createdAt: formatDateTime(new Date()),
      }
    } else if (body.childId !== undefined && body.guardianId !== undefined) {
      const child = children.find(c => c.id === body.childId)
      if (!child) {
        res.status(404).json(error('幼儿不存在'))
        return
      }

      const guardian = child.guardians.find((g: Guardian) => g.id === body.guardianId)
      const isAbnormal = body.isAbnormal ?? false

      guardianInfo = guardian ? {
        id: guardian.id,
        name: guardian.name,
        relation: guardian.relation,
        phone: guardian.phone,
        photo: guardian.photo,
      } : undefined

      childInfo = {
        id: child.id,
        name: child.name,
        className: child.className,
      }

      if (isAbnormal || body.photoMatch === false) {
        warningLevel = body.photoMatch === false ? 'danger' : 'warning'
        warningMessage = body.abnormalNote || (body.photoMatch === false ? '照片比对不通过，请人工核验！' : '本次接送存在异常，请关注')
      }

      record = {
        id: getNextPickupRecordId(),
        childId: body.childId,
        childName: child.name,
        guardianId: body.guardianId,
        guardianName: guardian?.name,
        guardianPhoto: guardian?.photo,
        photoMatch: body.photoMatch ?? !isAbnormal,
        isAbnormal,
        abnormalNote: body.abnormalNote,
        operatorId: req.user?.id,
        createdAt: formatDateTime(new Date()),
      }
    } else {
      res.status(400).json(error('请提供接送码或完整的接送信息(childId, guardianId)'))
      return
    }

    pickup_records.push(record)

    if (warningMessage) {
      res.json({
        code: 200,
        message: warningMessage,
        warning: true,
        warningLevel,
        data: {
          ...record,
          guardianInfo,
          childInfo,
        },
      })
    } else {
      res.json(success({
        ...record,
        guardianInfo,
        childInfo,
      }, '接送验证成功，请核对照片。'))
    }
  } catch (err) {
    res.status(500).json(error('接送验证失败'))
  }
})

router.get('/records', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { childId, date, isAbnormal } = req.query as {
      childId?: string
      date?: string
      isAbnormal?: string
    }

    let filteredRecords = [...pickup_records]

    if (childId) {
      const cid = parseInt(childId, 10)
      filteredRecords = filteredRecords.filter(r => r.childId === cid)
    }

    if (date) {
      filteredRecords = filteredRecords.filter(r => r.createdAt.startsWith(date))
    }

    if (isAbnormal !== undefined) {
      const abnormal = isAbnormal === 'true'
      filteredRecords = filteredRecords.filter(r => r.isAbnormal === abnormal)
    }

    const recordsWithDetails = filteredRecords.map(record => {
      const child = children.find(c => c.id === record.childId)
      let guardian: Guardian | undefined
      if (child) {
        guardian = child.guardians.find((g: Guardian) => g.id === record.guardianId)
      }
      return {
        ...record,
        childName: record.childName ?? child?.name,
        guardianName: record.guardianName ?? guardian?.name,
        guardianPhoto: record.guardianPhoto ?? guardian?.photo,
      }
    })

    res.json(success(recordsWithDetails, '获取成功'))
  } catch (err) {
    res.status(500).json(error('获取接送记录失败'))
  }
})

router.get('/records/:id', verifyToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10)
    const record = pickup_records.find(r => r.id === id)

    if (!record) {
      res.status(404).json(error('接送记录不存在'))
      return
    }

    const child = children.find(c => c.id === record.childId)
    let guardian: Guardian | undefined
    if (child) {
      guardian = child.guardians.find((g: Guardian) => g.id === record.guardianId)
    }

    const detail = {
      ...record,
      childName: record.childName ?? child?.name,
      guardianName: record.guardianName ?? guardian?.name,
      guardianPhoto: record.guardianPhoto ?? guardian?.photo,
      guardianRelation: guardian?.relation,
      guardianPhone: guardian?.phone,
    }

    res.json(success(detail, '获取成功'))
  } catch (err) {
    res.status(500).json(error('获取接送记录详情失败'))
  }
})

export default router
