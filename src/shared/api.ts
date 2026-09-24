export const IPC = {
  authStatus: 'auth:status',
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  emailsFetch: 'emails:fetch'
} as const

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_AUTHENTICATED'
  | 'AUTH_FAILED'
  | 'ENCRYPTION_UNAVAILABLE'
  | 'NETWORK'
  | 'UNKNOWN'

export type AppErrorShape = { code: ErrorCode; message: string }

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorShape }

export type AuthStatus = { configured: boolean; email?: string }

export interface Api {
  auth: {
    status(): Promise<Result<AuthStatus>>
    login(email: string, password: string): Promise<Result<void>>
    logout(): Promise<Result<void>>
  }
  emails: {
    fetch(month: number, year: number): Promise<Result<Email[]>>
  }
}
