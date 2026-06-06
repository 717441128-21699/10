import type { FeeAdjustment, Season } from '@shared/types'

export function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function calculateFeeAdjustment(
  startDate: string,
  endDate: string,
  dailyMealFee: number = 25,
  dailyTuition: number = 50,
): FeeAdjustment {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let days = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      days++
    }
  }

  const mealFeeDeduction = days * dailyMealFee
  const tuitionDeduction = days * dailyTuition
  const totalDeduction = mealFeeDeduction + tuitionDeduction

  return {
    mealFeeDeduction,
    tuitionDeduction,
    totalDeduction,
    days,
  }
}

export function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getSeason(dateStr: string): Season {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1

  if (month >= 3 && month <= 5) {
    return 'spring'
  } else if (month >= 6 && month <= 8) {
    return 'summer'
  } else if (month >= 9 && month <= 11) {
    return 'autumn'
  } else {
    return 'winter'
  }
}

export function calculateOverdueDays(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  const diffTime = today.getTime() - due.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

export function isWeekday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  return dayOfWeek >= 1 && dayOfWeek <= 5
}
