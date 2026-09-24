import type { AppErrorShape, ErrorCode, Result } from '../shared/api'

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function toErrorResult(error: unknown): { ok: false; error: AppErrorShape } {
  if (error instanceof AppError) {
    return { ok: false, error: { code: error.code, message: error.message } }
  }
  console.error('Erro inesperado:', error)
  return { ok: false, error: { code: 'UNKNOWN', message: 'Erro inesperado. Tente novamente.' } }
}

export async function toResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    return toErrorResult(error)
  }
}
