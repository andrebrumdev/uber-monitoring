import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthProvider } from '../auth/AuthProvider'
import { AppError } from '../errors'
import { createAuthHandlers } from './auth'
import { createEmailHandlers } from './emails'

function fakeAuth(overrides: Partial<AuthProvider> = {}): AuthProvider {
  return {
    status: vi.fn(async () => ({ configured: false })),
    getImapAuth: vi.fn(async () => ({ user: 'eu@gmail.com', pass: 'p' })),
    login: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    ...overrides
  }
}

describe('auth handlers', () => {
  it('rejeita e-mail inválido sem chamar o provider', async () => {
    const auth = fakeAuth()
    const result = await createAuthHandlers(auth).login('nao-e-email', 'abcd')
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    expect(auth.login).not.toHaveBeenCalled()
  })

  it.each([['   '], [''], [123], [undefined]])('rejeita senha %j', async (password) => {
    const auth = fakeAuth()
    const result = await createAuthHandlers(auth).login('eu@gmail.com', password)
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('repassa login válido', async () => {
    const auth = fakeAuth()
    const result = await createAuthHandlers(auth).login('eu@gmail.com', 'abcd efgh')
    expect(result).toEqual({ ok: true, data: undefined })
    expect(auth.login).toHaveBeenCalledWith('eu@gmail.com', 'abcd efgh')
  })

  it('propaga AUTH_FAILED do provider', async () => {
    const auth = fakeAuth({
      login: vi.fn(async () => {
        throw new AppError('AUTH_FAILED', 'E-mail ou senha de app incorretos.')
      })
    })
    const result = await createAuthHandlers(auth).login('eu@gmail.com', 'x')
    expect(result).toMatchObject({ ok: false, error: { code: 'AUTH_FAILED' } })
  })
})

describe('emails handler', () => {
  const currentYear = new Date().getFullYear()
  let fetchEmails: ReturnType<typeof vi.fn>
  let listPeriods: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchEmails = vi.fn(async () => [])
    listPeriods = vi.fn(async () => [])
  })

  it.each([
    [13, currentYear],
    [0, currentYear],
    [1.5, currentYear],
    ['3', currentYear],
    [Number.NaN, currentYear],
    [3, 2003],
    [3, currentYear + 1]
  ])('rejeita mês %j / ano %j', async (month, year) => {
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails, listPeriods }).fetch(
      month,
      year
    )
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    expect(fetchEmails).not.toHaveBeenCalled()
  })

  it('exige login', async () => {
    const auth = fakeAuth({ getImapAuth: vi.fn(async () => null) })
    const result = await createEmailHandlers({ auth, fetchEmails, listPeriods }).fetch(
      3,
      currentYear
    )
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_AUTHENTICATED' } })
    expect(fetchEmails).not.toHaveBeenCalled()
  })

  it('busca com a credencial do provider', async () => {
    fetchEmails.mockResolvedValue([{ subject: 's' }])
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails, listPeriods }).fetch(
      3,
      2025
    )
    expect(fetchEmails).toHaveBeenCalledWith({ user: 'eu@gmail.com', pass: 'p' }, 3, 2025)
    expect(result).toEqual({ ok: true, data: [{ subject: 's' }] })
  })

  it('senha revogada vira AUTH_FAILED', async () => {
    fetchEmails.mockRejectedValue(new AppError('AUTH_FAILED', 'E-mail ou senha de app incorretos.'))
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails, listPeriods }).fetch(
      3,
      2025
    )
    expect(result).toMatchObject({ ok: false, error: { code: 'AUTH_FAILED' } })
  })

  it('erro inesperado não vaza mensagem interna', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchEmails.mockRejectedValue(new Error('stack interna'))
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails, listPeriods }).fetch(
      3,
      2025
    )
    expect(result).toEqual({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Erro inesperado. Tente novamente.' }
    })
  })
})

describe('periods handler', () => {
  let fetchEmails: ReturnType<typeof vi.fn>
  let listPeriods: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchEmails = vi.fn(async () => [])
    listPeriods = vi.fn(async () => [])
  })

  it('exige login', async () => {
    const auth = fakeAuth({ getImapAuth: vi.fn(async () => null) })
    const result = await createEmailHandlers({ auth, fetchEmails, listPeriods }).periods()
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_AUTHENTICATED' } })
    expect(listPeriods).not.toHaveBeenCalled()
  })

  it('retorna os períodos com recibo usando a credencial do provider', async () => {
    listPeriods.mockResolvedValue([{ year: 2025, months: [8, 7] }])
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails, listPeriods }).periods()
    expect(listPeriods).toHaveBeenCalledWith({ user: 'eu@gmail.com', pass: 'p' })
    expect(result).toEqual({ ok: true, data: [{ year: 2025, months: [8, 7] }] })
  })

  it('propaga AUTH_FAILED do provider', async () => {
    listPeriods.mockRejectedValue(new AppError('AUTH_FAILED', 'E-mail ou senha de app incorretos.'))
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails, listPeriods }).periods()
    expect(result).toMatchObject({ ok: false, error: { code: 'AUTH_FAILED' } })
  })
})
