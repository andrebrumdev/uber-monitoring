import { describe, expect, it } from 'vitest'
import { AppError } from '../errors'
import { createImapClient, toImapAppError } from './client'

describe('createImapClient', () => {
  it('registra um listener de erro para evitar crash em erro de socket pós-conexão', () => {
    const client = createImapClient({ user: 'a@b.com', pass: 'senha' })
    expect(client.listenerCount('error')).toBeGreaterThan(0)
  })
})

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

  it.each([
    'SELF_SIGNED_CERT_IN_CHAIN',
    'DEPTH_ZERO_SELF_SIGNED_CERT',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'CERT_HAS_EXPIRED',
    'ERR_TLS_CERT_ALTNAME_INVALID'
  ])('trata %s como bloqueio de conexão segura (TLS)', (code) => {
    const result = toImapAppError(Object.assign(new Error('x'), { code }))
    expect(result.code).toBe('NETWORK')
    expect(result.message).toBe(
      'A conexão segura com o Gmail foi bloqueada. Um antivírus ou proxy pode estar interceptando a conexão.'
    )
  })

  it('mantém AppError como está', () => {
    const original = new AppError('INVALID_INPUT', 'x')
    expect(toImapAppError(original)).toBe(original)
  })

  it('usa UNKNOWN para o resto', () => {
    expect(toImapAppError(new Error('x')).code).toBe('UNKNOWN')
  })
})
