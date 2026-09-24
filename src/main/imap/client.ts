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

const TLS_CODES = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID'
])

export function createImapClient(auth: ImapAuth): ImapFlow {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth,
    logger: false
  })
  // Sem este listener, um erro de socket após a conexão (queda de Wi-Fi, sleep)
  // derruba o processo principal por falta de handler para 'error'.
  client.on('error', (err) =>
    console.error('Erro IMAP:', (err as { code?: string })?.code ?? 'sem código')
  )
  return client
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
  if (details.code && TLS_CODES.has(details.code)) {
    return new AppError(
      'NETWORK',
      'A conexão segura com o Gmail foi bloqueada. Um antivírus ou proxy pode estar interceptando a conexão.'
    )
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
