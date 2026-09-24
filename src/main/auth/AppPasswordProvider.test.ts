import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors'
import { createAppPasswordProvider } from './AppPasswordProvider'
import type { CredentialStore, Credentials } from './credentialStore'

function memoryStore(initial: Credentials | null = null) {
  let value = initial
  const store: CredentialStore = {
    save: vi.fn(async (c: Credentials) => {
      value = c
    }),
    load: vi.fn(async () => value),
    clear: vi.fn(async () => {
      value = null
    })
  }
  return { store, current: () => value }
}

describe('AppPasswordProvider', () => {
  it('remove espaços da senha e do e-mail antes de testar e salvar', async () => {
    const { store, current } = memoryStore()
    const verify = vi.fn(async () => undefined)
    const provider = createAppPasswordProvider({ store, verify })

    await provider.login('  eu@gmail.com ', 'abcd efgh ijkl mnop')

    expect(verify).toHaveBeenCalledWith({ user: 'eu@gmail.com', pass: 'abcdefghijklmnop' })
    expect(current()).toEqual({ email: 'eu@gmail.com', password: 'abcdefghijklmnop' })
  })

  it('não salva quando a verificação falha', async () => {
    const { store, current } = memoryStore()
    const verify = vi.fn(async () => {
      throw new AppError('AUTH_FAILED', 'E-mail ou senha de app incorretos.')
    })
    const provider = createAppPasswordProvider({ store, verify })

    await expect(provider.login('eu@gmail.com', 'errada')).rejects.toMatchObject({
      code: 'AUTH_FAILED'
    })
    expect(store.save).not.toHaveBeenCalled()
    expect(current()).toBeNull()
  })

  it('informa status e credencial IMAP a partir do store', async () => {
    const empty = createAppPasswordProvider({ store: memoryStore().store, verify: vi.fn() })
    expect(await empty.status()).toEqual({ configured: false })
    expect(await empty.getImapAuth()).toBeNull()

    const filled = createAppPasswordProvider({
      store: memoryStore({ email: 'eu@gmail.com', password: 'p' }).store,
      verify: vi.fn()
    })
    expect(await filled.status()).toEqual({ configured: true, email: 'eu@gmail.com' })
    expect(await filled.getImapAuth()).toEqual({ user: 'eu@gmail.com', pass: 'p' })
  })

  it('logout limpa o store', async () => {
    const { store, current } = memoryStore({ email: 'eu@gmail.com', password: 'p' })
    await createAppPasswordProvider({ store, verify: vi.fn() }).logout()
    expect(current()).toBeNull()
  })
})
