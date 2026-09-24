import type { AuthStatus } from '../../shared/api'

export interface ImapAuth {
  user: string
  pass: string
}

export interface AuthProvider {
  status(): Promise<AuthStatus>
  getImapAuth(): Promise<ImapAuth | null>
  /** Lança AppError (AUTH_FAILED, NETWORK, ENCRYPTION_UNAVAILABLE...) */
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
}
