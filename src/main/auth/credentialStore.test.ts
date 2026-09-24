import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { type Encryptor, createCredentialStore } from './credentialStore'

function fakeEncryptor(available = true): Encryptor & { available: boolean } {
  return {
    available,
    isEncryptionAvailable() {
      return this.available
    },
    encryptString: (plain) => Buffer.from(`enc:${Buffer.from(plain).toString('base64')}`),
    decryptString: (encrypted) => {
      const text = encrypted.toString()
      if (!text.startsWith('enc:')) throw new Error('não decifrável')
      return Buffer.from(text.slice(4), 'base64').toString()
    }
  }
}

const credentials = { email: 'eu@gmail.com', password: 'abcdefghijklmnop' }

describe('credentialStore', () => {
  let dir: string
  let file: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'cred-'))
    file = join(dir, 'sub', 'credentials.bin')
  })
  afterEach(async () => rm(dir, { recursive: true, force: true }))

  it('salva cifrado e lê de volta', async () => {
    const store = createCredentialStore(file, fakeEncryptor())
    await store.save(credentials)

    const raw = await readFile(file, 'utf8')
    expect(raw).not.toContain('abcdefghijklmnop')
    expect(raw).not.toContain('eu@gmail.com')
    expect(await store.load()).toEqual(credentials)
  })

  it.skipIf(process.platform === 'win32')('grava o arquivo só para o dono (0600)', async () => {
    await createCredentialStore(file, fakeEncryptor()).save(credentials)
    expect((await stat(file)).mode & 0o777).toBe(0o600)
  })

  it('recusa salvar quando não há criptografia disponível', async () => {
    const store = createCredentialStore(file, fakeEncryptor(false))
    await expect(store.save(credentials)).rejects.toMatchObject({
      code: 'ENCRYPTION_UNAVAILABLE'
    })
    await expect(stat(file)).rejects.toThrow()
  })

  it('retorna null quando não há arquivo', async () => {
    expect(await createCredentialStore(file, fakeEncryptor()).load()).toBeNull()
  })

  it('apaga e retorna null quando o arquivo está corrompido', async () => {
    const store = createCredentialStore(file, fakeEncryptor())
    await store.save(credentials)
    await writeFile(file, 'lixo')
    expect(await store.load()).toBeNull()
    await expect(stat(file)).rejects.toThrow()
  })

  it('não apaga a credencial quando o keyring está temporariamente indisponível', async () => {
    const encryptor = fakeEncryptor()
    const store = createCredentialStore(file, encryptor)
    await store.save(credentials)

    encryptor.available = false
    expect(await store.load()).toBeNull()
    await expect(stat(file)).resolves.toBeDefined()

    encryptor.available = true
    expect(await store.load()).toEqual(credentials)
  })

  it('clear é idempotente', async () => {
    const store = createCredentialStore(file, fakeEncryptor())
    await store.clear()
    await store.save(credentials)
    await store.clear()
    await store.clear()
    expect(await store.load()).toBeNull()
  })
})
