import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { z } from 'zod'
import { AppError } from '../errors'

export interface Credentials {
  email: string
  password: string
}

export interface Encryptor {
  isEncryptionAvailable(): boolean
  encryptString(plain: string): Buffer
  decryptString(encrypted: Buffer): string
}

export interface CredentialStore {
  save(credentials: Credentials): Promise<void>
  load(): Promise<Credentials | null>
  clear(): Promise<void>
}

const credentialsSchema = z.object({ email: z.string(), password: z.string() })

export function createCredentialStore(filePath: string, encryptor: Encryptor): CredentialStore {
  return {
    async save(credentials) {
      if (!encryptor.isEncryptionAvailable()) {
        throw new AppError(
          'ENCRYPTION_UNAVAILABLE',
          'Este computador não oferece armazenamento seguro de senhas. A credencial não foi salva.'
        )
      }
      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, encryptor.encryptString(JSON.stringify(credentials)), {
        mode: 0o600
      })
    },

    async load() {
      let raw: Buffer
      try {
        raw = await readFile(filePath)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw error
      }
      // Keyring travado não significa arquivo inválido: não apagar.
      if (!encryptor.isEncryptionAvailable()) return null
      try {
        return credentialsSchema.parse(JSON.parse(encryptor.decryptString(raw)))
      } catch {
        await rm(filePath, { force: true })
        return null
      }
    },

    async clear() {
      await rm(filePath, { force: true })
    }
  }
}
