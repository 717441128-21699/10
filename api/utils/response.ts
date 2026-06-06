import type { ApiResponse } from '@shared/types'

export function success<T>(data: T, message: string = 'success'): ApiResponse<T> {
  return {
    code: 200,
    message,
    data,
  }
}

export function error(message: string, code: number = 400): ApiResponse<null> {
  return {
    code,
    message,
    data: null,
  }
}
