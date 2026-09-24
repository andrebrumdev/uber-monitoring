import { describe, expect, it } from 'vitest'
import { AppError } from '../errors'
import { toImapAppError } from './client'

describe('toImapAppError', () => {
  it('reconhece falha de autenticação do imapflow', () => {
    const error = Object.assign(new Error('Command failed'), { authenticationFailed: true })
    expect(toImapAppError(error).code).toBe('AUTH_FAILED')
  })

  it('reconhece o código de resposta AUTHENTICATIONFAILED', () => {
    const error = Object.assign(new Error('x'), { serverResponseCode: 'AUTHENTICATIONFAILED' })
    expect(toImapAppError(error).code).toBe('AUTH_FAILED')
  })

  it.each(['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'CONNECT_TIMEOUT'])(
    'trata %s como erro de rede',
    (code) => {
      expect(toImapAppError(Object.assign(new Error('x'), { code })).code).toBe('NETWORK')
    }
  )

  it('mantém AppError como está', () => {
    const original = new AppError('INVALID_INPUT', 'x')
    expect(toImapAppError(original)).toBe(original)
  })

  it('usa UNKNOWN para o resto', () => {
    expect(toImapAppError(new Error('x')).code).toBe('UNKNOWN')
  })
})
