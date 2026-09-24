import { ImapFlow } from 'imapflow'
import type { ImapAuth } from '../auth/AuthProvider'
import { AppError } from '../errors'

const NETWORK_CODES = new Set([
  'ENOTFOUND',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'CONNECT_TIMEOUT',
  'GREETING_TIMEOUT',
  'NoConnection'
])

export function createImapClient(auth: ImapAuth): ImapFlow {
  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth,
    logger: false
  })
}

export function toImapAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  const details = (error ?? {}) as {
    authenticationFailed?: boolean
    serverResponseCode?: string
    code?: string
  }
  if (details.authenticationFailed || details.serverResponseCode === 'AUTHENTICATIONFAILED') {
    return new AppError('AUTH_FAILED', 'E-mail ou senha de app incorretos.')
  }
  if (details.code && NETWORK_CODES.has(details.code)) {
    return new AppError('NETWORK', 'Não foi possível conectar ao Gmail. Verifique sua internet.')
  }
  console.error('Erro IMAP inesperado:', details.code ?? error)
  return new AppError('UNKNOWN', 'Erro inesperado ao falar com o Gmail. Tente novamente.')
}

export async function verifyImapAuth(auth: ImapAuth): Promise<void> {
  const client = createImapClient(auth)
  try {
    await client.connect()
  } catch (error) {
    throw toImapAppError(error)
  }
  await client.logout().catch(() => undefined)
}
