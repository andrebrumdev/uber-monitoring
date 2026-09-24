import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppError, toErrorResult, toResult } from './errors'

describe('toResult', () => {
  afterEach(() => vi.restoreAllMocks())

  it('embrulha o valor em ok', async () => {
    expect(await toResult(async () => 42)).toEqual({ ok: true, data: 42 })
  })

  it('preserva código e mensagem de AppError', async () => {
    const result = await toResult(async () => {
      throw new AppError('AUTH_FAILED', 'E-mail ou senha de app incorretos.')
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'AUTH_FAILED', message: 'E-mail ou senha de app incorretos.' }
    })
  })

  it('esconde a mensagem de erros inesperados', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const result = await toResult(async () => {
      throw new Error('detalhe interno com /Users/segredo')
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Erro inesperado. Tente novamente.' }
    })
  })
})

describe('toErrorResult', () => {
  it('aceita valores que não são Error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(toErrorResult('texto').error.code).toBe('UNKNOWN')
  })
})
