# Segurança e Credenciais — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar a senha do Gmail do binário, guardá-la cifrada pelo sistema operacional e endurecer a fronteira Electron (TLS, sandbox, preload tipado, IPC validado, e-mail isolado em iframe).

**Architecture:** O main ganha um `AuthProvider` (implementação `AppPasswordProvider`) sobre um `credentialStore` que usa `safeStorage`. Todo IPC passa por handlers puros e testáveis que validam com Zod e devolvem `Result<T>`; um arquivo `register.ts` os liga ao `ipcMain`. O preload expõe só `window.api` com o contrato de `src/shared/api.ts`. O renderer ganha uma raiz `App` que alterna entre `Login` e `Home`, e o e-mail original abre num `Dialog` com `<iframe sandbox>`.

**Tech Stack:** Electron 34, electron-vite 3, React 18, TypeScript, imapflow, Zod 4, Vitest 3, Radix Dialog, Tailwind 4, yarn.

**Spec:** `docs/superpowers/specs/2026-09-24-seguranca-credenciais-design.md`

## Global Constraints

- Branch: `feat/seguranca-credenciais`. Gerenciador de pacotes: `yarn`.
- Commits no formato `tipo: :gitmoji: descrição` (ex.: `feat: :sparkles: ...`, `test: :white_check_mark: ...`). **Nunca** incluir `Co-Authored-By` nem qualquer atribuição ao Claude.
- Textos visíveis ao usuário em português do Brasil, com acentuação correta.
- Credencial nunca é gravada em texto puro nem aparece em log (`console.*`).
- TLS do IMAP sempre verificado — nenhum `rejectUnauthorized: false`.
- Fora de escopo: reescrever `fetchEmails`/parser (só muda a assinatura para receber a credencial), OAuth, toasts, TanStack Query, atualização do Electron, limpeza geral de dependências, README.
- Versões: `zod@^4`, `vitest@^3.2`, `@radix-ui/react-dialog@^1.1`.
- `appId`: `br.com.andrebrum.uber-monitoring`.

## Review Focus

1. **Keyring indisponível ao ler (Linux sem libsecret destravado):** a credencial salva não pode ser apagada; `load()` retorna `null` e mantém o arquivo. → teste na Task 2.
2. **Senha de app colada como o Google mostra (`abcd efgh ijkl mnop`):** precisa funcionar — espaços removidos antes de testar e salvar. → teste na Task 4.
3. **Senha de app revogada depois do login:** a busca devolve `AUTH_FAILED` com mensagem clara, não `UNKNOWN`. → teste na Task 5.
4. **URL maliciosa vinda do conteúdo (`javascript:`, `file:`, `http:`, domínio parecido com o dev server):** nunca abre nem navega. → testes na Task 6.
5. **Entrada inválida no IPC (mês `13`, `1.5`, `"3"`, ano futuro) e erro inesperado:** vira `INVALID_INPUT`/`UNKNOWN` com mensagem genérica, sem vazar a mensagem interna. → testes nas Tasks 1 e 5.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/shared/api.ts` (novo) | Contrato do preload: canais, `Result<T>`, `ErrorCode`, `AuthStatus`, `Api` |
| `src/main/errors.ts` (novo) | `AppError`, `toErrorResult`, `toResult` |
| `src/main/auth/AuthProvider.ts` (novo) | Interfaces `AuthProvider` e `ImapAuth` |
| `src/main/auth/credentialStore.ts` (novo) | Salvar/ler/apagar credencial cifrada (agnóstico de Electron) |
| `src/main/auth/safeStorageEncryptor.ts` (novo) | Adaptador do `safeStorage` para a interface `Encryptor` |
| `src/main/auth/AppPasswordProvider.ts` (novo) | Login com senha de app: normaliza, testa IMAP, salva |
| `src/main/imap/client.ts` (novo) | Criar cliente IMAP, testar credencial, traduzir erros do imapflow |
| `src/main/emailHandler.ts` (modificar) | Recebe `ImapAuth`, usa `createImapClient`, TLS ligado |
| `src/main/ipc/schemas.ts` (novo) | Schemas Zod e `parseArgs` |
| `src/main/ipc/auth.ts` (novo) | Handlers puros de `auth:*` |
| `src/main/ipc/emails.ts` (novo) | Handler puro de `emails:fetch` |
| `src/main/ipc/register.ts` (novo) | Liga handlers ao `ipcMain` |
| `src/main/navigation.ts` (novo) | `isHttpsUrl`, `isAllowedNavigation` |
| `src/main/window.ts` (novo) | `BrowserWindow` endurecida |
| `src/main/index.ts` (modificar) | Só bootstrap |
| `src/preload/index.ts`, `index.d.ts` (modificar) | Expõe e tipa só `window.api` |
| `src/renderer/src/App.tsx` (novo) | Sessão: carregando / Login / Home |
| `src/renderer/src/pages/Login/index.tsx` (novo) | Formulário de login |
| `src/renderer/src/components/ui/input.tsx`, `dialog.tsx` (novos) | Primitivos de UI |
| `src/renderer/src/components/EmailPreview.tsx` (novo) | Modal com iframe isolado |
| `src/renderer/src/pages/Home/index.tsx` (modificar) | `window.api`, banner de erro, botão Sair |
| `src/renderer/src/pages/Home/ui/TableDetails/TableViagem.tsx` (modificar) | Usa `EmailPreview` |
| `docs/superpowers/specs/2026-09-24-ui-seguranca-design.md` (novo) | Direção visual definida com `impeccable` |

---

### Task 1: Contrato compartilhado, erros e Vitest

**Files:**
- Create: `src/shared/api.ts`, `src/main/errors.ts`, `src/main/errors.test.ts`, `vitest.config.ts`
- Modify: `package.json`, `tsconfig.node.json`, `tsconfig.web.json`

**Interfaces:**
- Consumes: tipo global `Email` de `src/types/email.d.ts`.
- Produces:
  - `IPC` (constantes `authStatus`, `authLogin`, `authLogout`, `emailsFetch`)
  - `type ErrorCode`, `type AppErrorShape = { code: ErrorCode; message: string }`, `type Result<T>`, `type AuthStatus = { configured: boolean; email?: string }`, `interface Api`
  - `class AppError(code: ErrorCode, message: string)`
  - `toErrorResult(error: unknown): { ok: false; error: AppErrorShape }`
  - `toResult<T>(fn: () => Promise<T>): Promise<Result<T>>`

- [ ] **Step 1: Instalar dependências e registrar a linha de base**

```bash
yarn install
yarn add zod@^4
yarn add -D vitest@^3.2
yarn typecheck; yarn lint
```

Anote os erros de typecheck/lint que já existem antes de qualquer mudança. Eles não bloqueiam este plano, mas nenhuma task pode **aumentar** essa lista.

- [ ] **Step 2: Configurar o Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
})
```

Em `package.json`, dentro de `scripts`, adicione:

```json
"test": "vitest run",
"test:watch": "vitest",
```

Em `tsconfig.node.json`, troque o `include` por:

```json
"include": [
  "electron.vite.config.*",
  "vitest.config.*",
  "src/main/**/*",
  "src/preload/**/*",
  "src/shared/**/*",
  "src/types/*.d.ts",
  "src/types/*.ts"
],
```

Em `tsconfig.web.json`, adicione `"src/shared/**/*"` ao `include`.

- [ ] **Step 3: Escrever o teste que falha**

`src/main/errors.test.ts`:

```ts
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
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `yarn test src/main/errors.test.ts`
Expected: FAIL — `Failed to resolve import "./errors"`.

- [ ] **Step 5: Implementar**

`src/shared/api.ts`:

```ts
export const IPC = {
  authStatus: 'auth:status',
  authLogin: 'auth:login',
  authLogout: 'auth:logout',
  emailsFetch: 'emails:fetch'
} as const

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_AUTHENTICATED'
  | 'AUTH_FAILED'
  | 'ENCRYPTION_UNAVAILABLE'
  | 'NETWORK'
  | 'UNKNOWN'

export type AppErrorShape = { code: ErrorCode; message: string }

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorShape }

export type AuthStatus = { configured: boolean; email?: string }

export interface Api {
  auth: {
    status(): Promise<Result<AuthStatus>>
    login(email: string, password: string): Promise<Result<void>>
    logout(): Promise<Result<void>>
  }
  emails: {
    fetch(month: number, year: number): Promise<Result<Email[]>>
  }
}
```

`src/main/errors.ts`:

```ts
import type { AppErrorShape, ErrorCode, Result } from '../shared/api'

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function toErrorResult(error: unknown): { ok: false; error: AppErrorShape } {
  if (error instanceof AppError) {
    return { ok: false, error: { code: error.code, message: error.message } }
  }
  console.error('Erro inesperado:', error)
  return { ok: false, error: { code: 'UNKNOWN', message: 'Erro inesperado. Tente novamente.' } }
}

export async function toResult<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    return toErrorResult(error)
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `yarn test src/main/errors.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 7: Commit**

```bash
git add package.json yarn.lock vitest.config.ts tsconfig.node.json tsconfig.web.json src/shared/api.ts src/main/errors.ts src/main/errors.test.ts
git commit -m "feat: :sparkles: add contrato IPC com Result tipado e Vitest"
```

---

### Task 2: Armazenamento cifrado da credencial

**Files:**
- Create: `src/main/auth/credentialStore.ts`, `src/main/auth/credentialStore.test.ts`, `src/main/auth/safeStorageEncryptor.ts`

**Interfaces:**
- Consumes: `AppError` (Task 1).
- Produces:
  - `interface Credentials { email: string; password: string }`
  - `interface Encryptor { isEncryptionAvailable(): boolean; encryptString(plain: string): Buffer; decryptString(encrypted: Buffer): string }`
  - `interface CredentialStore { save(c: Credentials): Promise<void>; load(): Promise<Credentials | null>; clear(): Promise<void> }`
  - `createCredentialStore(filePath: string, encryptor: Encryptor): CredentialStore`
  - `safeStorageEncryptor: Encryptor`

- [ ] **Step 1: Escrever o teste que falha**

`src/main/auth/credentialStore.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `yarn test src/main/auth/credentialStore.test.ts`
Expected: FAIL — `Failed to resolve import "./credentialStore"`.

- [ ] **Step 3: Implementar**

`src/main/auth/credentialStore.ts`:

```ts
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
```

`src/main/auth/safeStorageEncryptor.ts`:

```ts
import { safeStorage } from 'electron'
import type { Encryptor } from './credentialStore'

// No Linux sem keyring o Electron cai para 'basic_text', que não é criptografia real.
function isRealEncryption(): boolean {
  if (!safeStorage.isEncryptionAvailable()) return false
  return !(process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
}

export const safeStorageEncryptor: Encryptor = {
  isEncryptionAvailable: isRealEncryption,
  encryptString: (plain) => safeStorage.encryptString(plain),
  decryptString: (encrypted) => safeStorage.decryptString(encrypted)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `yarn test src/main/auth/credentialStore.test.ts`
Expected: PASS (7 testes; 6 no Windows).

- [ ] **Step 5: Commit**

```bash
git add src/main/auth/credentialStore.ts src/main/auth/credentialStore.test.ts src/main/auth/safeStorageEncryptor.ts
git commit -m "feat: :lock: add armazenamento cifrado de credenciais com safeStorage"
```

---

### Task 3: Cliente IMAP com TLS verificado e erros traduzidos

**Files:**
- Create: `src/main/auth/AuthProvider.ts`, `src/main/imap/client.ts`, `src/main/imap/client.test.ts`
- Modify: `src/main/emailHandler.ts:1-28` e `:135-137`

**Interfaces:**
- Consumes: `AppError` (Task 1).
- Produces:
  - `interface ImapAuth { user: string; pass: string }`
  - `interface AuthProvider { status(): Promise<AuthStatus>; getImapAuth(): Promise<ImapAuth | null>; login(email: string, password: string): Promise<void>; logout(): Promise<void> }`
  - `createImapClient(auth: ImapAuth): ImapFlow`
  - `toImapAppError(error: unknown): AppError`
  - `verifyImapAuth(auth: ImapAuth): Promise<void>`
  - `fetchEmails(auth: ImapAuth, month: number, year: number): Promise<Email[]>`

- [ ] **Step 1: Escrever o teste que falha**

`src/main/imap/client.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `yarn test src/main/imap/client.test.ts`
Expected: FAIL — `Failed to resolve import "./client"`.

- [ ] **Step 3: Implementar**

`src/main/auth/AuthProvider.ts`:

```ts
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
```

`src/main/imap/client.ts`:

```ts
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
```

Em `src/main/emailHandler.ts`, substitua as linhas 1–28 (imports + `connectToGmail`) por:

```ts
import * as cheerio from 'cheerio'
import { ParsedMail, simpleParser } from 'mailparser'
import { Readable, Transform, TransformCallback } from 'stream'
import type { ImapAuth } from './auth/AuthProvider'
import { createImapClient, toImapAppError } from './imap/client'

async function connectToGmail(auth: ImapAuth) {
  const client = createImapClient(auth)
  try {
    await client.connect()
  } catch (error) {
    throw toImapAppError(error)
  }
  await client.mailboxOpen('INBOX')
  return client
}
```

E troque a assinatura/primeira linha de `fetchEmails` por:

```ts
export const fetchEmails = async (auth: ImapAuth, month: number, year: number): Promise<Email[]> => {
  const client = await connectToGmail(auth)
```

(O resto do corpo fica igual — a reescrita é do subprojeto 2.)

- [ ] **Step 4: Rodar e ver passar**

Run: `yarn test src/main/imap/client.test.ts`
Expected: PASS (10 testes).

Run: `grep -rn "rejectUnauthorized\|MAIN_VITE" src/main`
Expected: sem resultados.

- [ ] **Step 5: Commit**

```bash
git add src/main/auth/AuthProvider.ts src/main/imap src/main/emailHandler.ts
git commit -m "fix: :lock: liga verificação TLS e recebe credencial do AuthProvider no IMAP"
```

`yarn typecheck:node` ainda falha em `src/main/index.ts` (chamada antiga de `fetchEmails`), o que é esperado até a Task 6.

---

### Task 4: `AppPasswordProvider`

**Files:**
- Create: `src/main/auth/AppPasswordProvider.ts`, `src/main/auth/AppPasswordProvider.test.ts`

**Interfaces:**
- Consumes: `AuthProvider`, `ImapAuth` (Task 3), `CredentialStore`, `Credentials` (Task 2), `AppError` (Task 1).
- Produces: `createAppPasswordProvider(deps: { store: CredentialStore; verify: (auth: ImapAuth) => Promise<void> }): AuthProvider`

- [ ] **Step 1: Escrever o teste que falha**

`src/main/auth/AppPasswordProvider.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `yarn test src/main/auth/AppPasswordProvider.test.ts`
Expected: FAIL — `Failed to resolve import "./AppPasswordProvider"`.

- [ ] **Step 3: Implementar**

`src/main/auth/AppPasswordProvider.ts`:

```ts
import type { AuthProvider, ImapAuth } from './AuthProvider'
import type { CredentialStore } from './credentialStore'

interface Deps {
  store: CredentialStore
  verify: (auth: ImapAuth) => Promise<void>
}

export function createAppPasswordProvider({ store, verify }: Deps): AuthProvider {
  return {
    async status() {
      const credentials = await store.load()
      return credentials ? { configured: true, email: credentials.email } : { configured: false }
    },

    async getImapAuth() {
      const credentials = await store.load()
      return credentials ? { user: credentials.email, pass: credentials.password } : null
    },

    async login(email, password) {
      // O Google exibe a senha de app em blocos de 4 separados por espaço.
      const user = email.trim()
      const pass = password.replace(/\s+/g, '')
      await verify({ user, pass })
      await store.save({ email: user, password: pass })
    },

    async logout() {
      await store.clear()
    }
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `yarn test src/main/auth/AppPasswordProvider.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/main/auth/AppPasswordProvider.ts src/main/auth/AppPasswordProvider.test.ts
git commit -m "feat: :sparkles: add AppPasswordProvider com verificação antes de salvar"
```

---

### Task 5: Handlers IPC validados com Zod

**Files:**
- Create: `src/main/ipc/schemas.ts`, `src/main/ipc/auth.ts`, `src/main/ipc/emails.ts`, `src/main/ipc/register.ts`, `src/main/ipc/handlers.test.ts`

**Interfaces:**
- Consumes: `IPC`, `Result`, `AuthStatus` (Task 1), `AppError`, `toResult` (Task 1), `AuthProvider`, `ImapAuth` (Task 3).
- Produces:
  - `parseArgs<T>(schema: z.ZodType<T>, args: unknown, message: string): T`
  - `createAuthHandlers(auth: AuthProvider): { status(): Promise<Result<AuthStatus>>; login(email: unknown, password: unknown): Promise<Result<void>>; logout(): Promise<Result<void>> }`
  - `type FetchEmails = (auth: ImapAuth, month: number, year: number) => Promise<Email[]>`
  - `createEmailHandlers(deps: { auth: AuthProvider; fetchEmails: FetchEmails }): { fetch(month: unknown, year: unknown): Promise<Result<Email[]>> }`
  - `registerIpc(deps: { auth: AuthProvider; fetchEmails: FetchEmails }): void`

- [ ] **Step 1: Escrever o teste que falha**

`src/main/ipc/handlers.test.ts`:

```ts
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

  beforeEach(() => {
    fetchEmails = vi.fn(async () => [])
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
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails }).fetch(month, year)
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } })
    expect(fetchEmails).not.toHaveBeenCalled()
  })

  it('exige login', async () => {
    const auth = fakeAuth({ getImapAuth: vi.fn(async () => null) })
    const result = await createEmailHandlers({ auth, fetchEmails }).fetch(3, currentYear)
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_AUTHENTICATED' } })
    expect(fetchEmails).not.toHaveBeenCalled()
  })

  it('busca com a credencial do provider', async () => {
    fetchEmails.mockResolvedValue([{ subject: 's' }])
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails }).fetch(3, 2025)
    expect(fetchEmails).toHaveBeenCalledWith({ user: 'eu@gmail.com', pass: 'p' }, 3, 2025)
    expect(result).toEqual({ ok: true, data: [{ subject: 's' }] })
  })

  it('senha revogada vira AUTH_FAILED', async () => {
    fetchEmails.mockRejectedValue(new AppError('AUTH_FAILED', 'E-mail ou senha de app incorretos.'))
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails }).fetch(3, 2025)
    expect(result).toMatchObject({ ok: false, error: { code: 'AUTH_FAILED' } })
  })

  it('erro inesperado não vaza mensagem interna', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchEmails.mockRejectedValue(new Error('stack interna'))
    const result = await createEmailHandlers({ auth: fakeAuth(), fetchEmails }).fetch(3, 2025)
    expect(result).toEqual({
      ok: false,
      error: { code: 'UNKNOWN', message: 'Erro inesperado. Tente novamente.' }
    })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `yarn test src/main/ipc/handlers.test.ts`
Expected: FAIL — `Failed to resolve import "./auth"`.

- [ ] **Step 3: Implementar**

`src/main/ipc/schemas.ts`:

```ts
import { z } from 'zod'
import { AppError } from '../errors'

export const loginArgsSchema = z.tuple([
  z.string().trim().pipe(z.email()),
  z.string().refine((value) => value.trim().length > 0)
])

export const fetchArgsSchema = z.tuple([
  z.number().int().min(1).max(12),
  z
    .number()
    .int()
    .min(2004)
    .refine((year) => year <= new Date().getFullYear())
])

export function parseArgs<T>(schema: z.ZodType<T>, args: unknown, message: string): T {
  const result = schema.safeParse(args)
  if (!result.success) throw new AppError('INVALID_INPUT', message)
  return result.data
}
```

`src/main/ipc/auth.ts`:

```ts
import type { AuthProvider } from '../auth/AuthProvider'
import { toResult } from '../errors'
import { loginArgsSchema, parseArgs } from './schemas'

export function createAuthHandlers(auth: AuthProvider) {
  return {
    status: () => toResult(() => auth.status()),

    login: (email: unknown, password: unknown) =>
      toResult(async () => {
        const [validEmail, validPassword] = parseArgs(
          loginArgsSchema,
          [email, password],
          'Informe um e-mail válido e a senha de app.'
        )
        await auth.login(validEmail, validPassword)
      }),

    logout: () => toResult(() => auth.logout())
  }
}
```

`src/main/ipc/emails.ts`:

```ts
import type { AuthProvider, ImapAuth } from '../auth/AuthProvider'
import { AppError, toResult } from '../errors'
import { fetchArgsSchema, parseArgs } from './schemas'

export type FetchEmails = (auth: ImapAuth, month: number, year: number) => Promise<Email[]>

export function createEmailHandlers(deps: { auth: AuthProvider; fetchEmails: FetchEmails }) {
  return {
    fetch: (month: unknown, year: unknown) =>
      toResult(async () => {
        const [validMonth, validYear] = parseArgs(
          fetchArgsSchema,
          [month, year],
          'Mês ou ano inválido.'
        )
        const imapAuth = await deps.auth.getImapAuth()
        if (!imapAuth) {
          throw new AppError('NOT_AUTHENTICATED', 'Entre com sua conta para buscar os recibos.')
        }
        return deps.fetchEmails(imapAuth, validMonth, validYear)
      })
  }
}
```

`src/main/ipc/register.ts`:

```ts
import { ipcMain } from 'electron'
import { IPC } from '../../shared/api'
import type { AuthProvider } from '../auth/AuthProvider'
import { createAuthHandlers } from './auth'
import { type FetchEmails, createEmailHandlers } from './emails'

export function registerIpc(deps: { auth: AuthProvider; fetchEmails: FetchEmails }): void {
  const auth = createAuthHandlers(deps.auth)
  const emails = createEmailHandlers(deps)

  ipcMain.handle(IPC.authStatus, () => auth.status())
  ipcMain.handle(IPC.authLogin, (_event, email, password) => auth.login(email, password))
  ipcMain.handle(IPC.authLogout, () => auth.logout())
  ipcMain.handle(IPC.emailsFetch, (_event, month, year) => emails.fetch(month, year))
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `yarn test src/main/ipc/handlers.test.ts`
Expected: PASS (18 testes).

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc
git commit -m "feat: :sparkles: add handlers IPC validados com Zod"
```

---

### Task 6: Janela endurecida, bootstrap e preload tipado

**Files:**
- Create: `src/main/navigation.ts`, `src/main/navigation.test.ts`, `src/main/window.ts`
- Modify: `src/main/index.ts` (reescrita), `src/preload/index.ts` (reescrita), `src/preload/index.d.ts` (reescrita), `src/types/env.d.ts`, `src/renderer/src/pages/Home/index.tsx:59-73`, `electron-builder.yml:1`, `package.json` (remover `@electron-toolkit/preload`)
- Delete: `.env.example`

**Interfaces:**
- Consumes: tudo das Tasks 1–5.
- Produces:
  - `isHttpsUrl(url: string): boolean`
  - `isAllowedNavigation(url: string, devServerUrl?: string): boolean`
  - `createMainWindow(): BrowserWindow`
  - `window.api: Api` no renderer

- [ ] **Step 1: Escrever o teste que falha**

`src/main/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isAllowedNavigation, isHttpsUrl } from './navigation'

describe('isHttpsUrl', () => {
  it.each([
    ['https://help.uber.com/x', true],
    ['http://uber.com', false],
    ['javascript:alert(1)', false],
    ['file:///etc/passwd', false],
    ['mailto:a@b.com', false],
    ['não é url', false]
  ])('%s → %s', (url, expected) => {
    expect(isHttpsUrl(url)).toBe(expected)
  })
})

describe('isAllowedNavigation', () => {
  const dev = 'http://localhost:5173'

  it('permite o próprio dev server', () => {
    expect(isAllowedNavigation('http://localhost:5173/index.html', dev)).toBe(true)
  })

  it.each([
    ['https://evil.com', dev],
    ['http://localhost:5173.evil.com/', dev],
    ['http://localhost:5174/', dev],
    ['file:///x/index.html', undefined],
    ['https://uber.com', undefined]
  ])('bloqueia %s', (url, devUrl) => {
    expect(isAllowedNavigation(url, devUrl)).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `yarn test src/main/navigation.test.ts`
Expected: FAIL — `Failed to resolve import "./navigation"`.

- [ ] **Step 3: Implementar a navegação**

`src/main/navigation.ts`:

```ts
function parse(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export function isHttpsUrl(url: string): boolean {
  return parse(url)?.protocol === 'https:'
}

export function isAllowedNavigation(url: string, devServerUrl?: string): boolean {
  if (!devServerUrl) return false
  const target = parse(url)
  const dev = parse(devServerUrl)
  return !!target && !!dev && target.origin === dev.origin
}
```

Run: `yarn test src/main/navigation.test.ts`
Expected: PASS (12 testes).

- [ ] **Step 4: Janela e bootstrap**

`src/main/window.ts`:

```ts
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import icon from '../../resources/icon.png?asset'
import { isAllowedNavigation, isHttpsUrl } from './navigation'

function openExternalIfSafe(url: string): void {
  if (isHttpsUrl(url)) void shell.openExternal(url)
}

export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.setMenuBarVisibility(false)
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalIfSafe(url)
    return { action: 'deny' }
  })

  const devServerUrl = is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedNavigation(url, devServerUrl)) return
    event.preventDefault()
    openExternalIfSafe(url)
  })

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
```

`src/main/index.ts` (arquivo inteiro):

```ts
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { BrowserWindow, app } from 'electron'
import { join } from 'node:path'
import { createAppPasswordProvider } from './auth/AppPasswordProvider'
import { createCredentialStore } from './auth/credentialStore'
import { safeStorageEncryptor } from './auth/safeStorageEncryptor'
import { fetchEmails } from './emailHandler'
import { verifyImapAuth } from './imap/client'
import { registerIpc } from './ipc/register'
import { createMainWindow } from './window'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('br.com.andrebrum.uber-monitoring')

  // F12 abre DevTools em dev; Ctrl/Cmd+R é ignorado em produção.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const store = createCredentialStore(
    join(app.getPath('userData'), 'credentials.bin'),
    safeStorageEncryptor
  )
  const auth = createAppPasswordProvider({ store, verify: verifyImapAuth })
  registerIpc({ auth, fetchEmails })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

Em `electron-builder.yml`, linha 1: `appId: br.com.andrebrum.uber-monitoring`.

- [ ] **Step 5: Preload e tipos**

`src/preload/index.ts` (arquivo inteiro):

```ts
import { contextBridge, ipcRenderer } from 'electron'
import { type Api, IPC } from '../shared/api'

const api: Api = {
  auth: {
    status: () => ipcRenderer.invoke(IPC.authStatus),
    login: (email, password) => ipcRenderer.invoke(IPC.authLogin, email, password),
    logout: () => ipcRenderer.invoke(IPC.authLogout)
  },
  emails: {
    fetch: (month, year) => ipcRenderer.invoke(IPC.emailsFetch, month, year)
  }
}

contextBridge.exposeInMainWorld('api', api)
```

`src/preload/index.d.ts` (arquivo inteiro):

```ts
import type { Api } from '../shared/api'

declare global {
  interface Window {
    api: Api
  }
}

export {}
```

`src/types/env.d.ts` (arquivo inteiro — mantém só a referência de tipos do Vite, sem as variáveis de credencial):

```ts
/// <reference types="vite/client" />
```

```bash
git rm .env.example
yarn remove @electron-toolkit/preload
```

- [ ] **Step 6: Renderer mínimo usando `window.api`**

Em `src/renderer/src/pages/Home/index.tsx`, troque a função `fetchEmails` (linhas 59–73) por:

```tsx
  const fetchEmails = async (data: FormData): Promise<void> => {
    setLoading(true)
    try {
      const result = await window.api.emails.fetch(Number(data.month), Number(data.year))
      if (result.ok) setEmails(result.data)
      else console.error('Erro ao buscar emails:', result.error.message)
    } finally {
      setLoading(false)
    }
  }
```

(Banner de erro e botão Sair entram na Task 8.)

- [ ] **Step 7: Verificar**

Run: `yarn test && yarn typecheck && yarn lint`
Expected: testes PASS; typecheck/lint sem erros novos em relação à linha de base da Task 1.

Run: `grep -rn "window.electron\|MAIN_VITE\|sandbox: false\|about:blank" src`
Expected: sem resultados.

Run: `yarn dev`. Expected: o app abre, o DevTools console não mostra erro de preload, e `window.api` existe (digite `window.api` no console). Buscar e-mails agora loga `Entre com sua conta para buscar os recibos.` (ainda não há tela de login).

- [ ] **Step 8: Commit**

```bash
git add -A src electron-builder.yml package.json yarn.lock
git commit -m "feat: :lock: endurece janela, liga sandbox e expõe só window.api tipado"
```

---

### Task 7: Direção visual com `impeccable`

**Files:**
- Create: `docs/superpowers/specs/2026-09-24-ui-seguranca-design.md`

**Interfaces:**
- Consumes: comportamento das telas definido na spec e nas Tasks 8–9.
- Produces: documento de design que as Tasks 8 e 9 seguem para classes Tailwind, layout, estados e textos.

- [ ] **Step 1: Invocar a skill `impeccable` para planejar (não implementar)**

Invoque a skill `impeccable` com este briefing:

> Planejar o design visual (sem escrever código de produção) de 4 superfícies de um app desktop Electron + React 18 + Tailwind 4 + shadcn/ui (tokens oklch em `src/renderer/src/assets/base.css`, tema zinc, suporte a dark), textos em pt-BR:
> 1. **Tela de Login**: e-mail, senha de app, link "Gere uma senha de app" (https://myaccount.google.com/apppasswords), nota de que a senha fica cifrada no computador, botão Entrar com estado "Verificando…", mensagem de erro inline (`role="alert"`).
> 2. **Cabeçalho da Home**: e-mail logado + botão "Sair".
> 3. **Banner de erro da Home**: mensagens vindas do main (rede, senha revogada, erro inesperado).
> 4. **Modal "E-mail original"**: Dialog grande com `<iframe sandbox>` do HTML do recibo, nota de que scripts e imagens externas estão bloqueados.
> Restrições: usar só componentes existentes (`Button`) e os novos `Input` e `Dialog` do shadcn; nada de dependência nova; acessível por teclado; funciona em claro e escuro.
> Entregável: para cada superfície, layout, classes Tailwind/tokens, estados (vazio, carregando, erro, sucesso), textos finais e notas de acessibilidade.

- [ ] **Step 2: Salvar o resultado**

Grave a direção aprovada em `docs/superpowers/specs/2026-09-24-ui-seguranca-design.md`, com uma seção por superfície (1–4) contendo: layout, classes/tokens, estados, textos finais e notas de acessibilidade.

- [ ] **Step 3: Aprovação do usuário (gate)**

Mostre o documento ao usuário e **pare** até ele aprovar. Ajustes pedidos entram no documento antes de seguir.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-09-24-ui-seguranca-design.md
git commit -m "docs: :lipstick: add direção visual das telas de login e preview"
```

---

### Task 8: Login, sessão, botão Sair e banner de erro

**Files:**
- Create: `src/renderer/src/components/ui/input.tsx`, `src/renderer/src/pages/Login/index.tsx`, `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/main.tsx`, `src/renderer/src/pages/Home/index.tsx`

**Interfaces:**
- Consumes: `window.api` (Task 6), documento de design (Task 7).
- Produces:
  - `Input` (forwardRef, compatível com `register` do react-hook-form)
  - `Login({ onLoggedIn: (email: string) => void })`
  - `Home({ email: string; onSignedOut: () => void })`
  - `App()`

O código abaixo é a base **estrutural e de comportamento**. Classes Tailwind e textos devem ser ajustados para seguir `docs/superpowers/specs/2026-09-24-ui-seguranca-design.md`. Os invariantes abaixo não podem mudar:
- `Input` usa `forwardRef`.
- O erro aparece em elemento com `role="alert"`.
- O botão fica desabilitado enquanto envia.
- O link de senha de app usa `href` `https://` e `target="_blank"`.
- `NOT_AUTHENTICATED` e logout bem-sucedido chamam `onSignedOut`.

- [ ] **Step 1: `Input`**

`src/renderer/src/components/ui/input.tsx`:

```tsx
import { cn } from '@/lib/utils'
import * as React from 'react'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **Step 2: Página de Login**

`src/renderer/src/pages/Login/index.tsx`:

```tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

interface LoginForm {
  email: string
  password: string
}

export function Login({ onLoggedIn }: { onLoggedIn: (email: string) => void }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<LoginForm>({ defaultValues: { email: '', password: '' } })
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (data: LoginForm): Promise<void> => {
    setError(null)
    const result = await window.api.auth.login(data.email, data.password)
    if (result.ok) onLoggedIn(data.email.trim())
    else setError(result.error.message)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Entrar no Gmail</h1>
          <p className="text-sm text-muted-foreground">
            O app lê só os recibos enviados pela Uber. Sua senha fica guardada cifrada neste
            computador.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          E-mail
          <Input type="email" autoComplete="username" autoFocus {...register('email')} />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Senha de app
          <Input type="password" autoComplete="current-password" {...register('password')} />
        </label>

        <p className="text-xs text-muted-foreground">
          Não é a senha normal do Google.{' '}
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            Gere uma senha de app
          </a>{' '}
          (exige verificação em duas etapas).
        </p>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Verificando…' : 'Entrar'}
        </Button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Raiz de sessão**

`src/renderer/src/App.tsx`:

```tsx
import { useEffect, useState } from 'react'
import Home from './pages/Home'
import { Login } from './pages/Login'

type Session =
  | { state: 'loading' }
  | { state: 'anonymous' }
  | { state: 'authenticated'; email: string }

export function App() {
  const [session, setSession] = useState<Session>({ state: 'loading' })

  useEffect(() => {
    window.api.auth.status().then((result) => {
      if (result.ok && result.data.configured) {
        setSession({ state: 'authenticated', email: result.data.email ?? '' })
      } else {
        setSession({ state: 'anonymous' })
      }
    })
  }, [])

  if (session.state === 'loading') return null

  if (session.state === 'anonymous') {
    return <Login onLoggedIn={(email) => setSession({ state: 'authenticated', email })} />
  }

  return <Home email={session.email} onSignedOut={() => setSession({ state: 'anonymous' })} />
}
```

`src/renderer/src/main.tsx`: troque `import App from './pages/Home'` por `import { App } from './App'`.

- [ ] **Step 4: Home com cabeçalho, Sair e banner**

Em `src/renderer/src/pages/Home/index.tsx`:

1. Troque a assinatura `const App: React.FC = () => {` por:

```tsx
interface HomeProps {
  email: string
  onSignedOut: () => void
}

const Home: React.FC<HomeProps> = ({ email, onSignedOut }) => {
```

e a última linha `export default App` por `export default Home`.

2. Logo abaixo de `const [loading, setLoading] = useState(false)`, adicione:

```tsx
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async (): Promise<void> => {
    const result = await window.api.auth.logout()
    if (result.ok) onSignedOut()
    else setError(result.error.message)
  }
```

3. Substitua a função `fetchEmails` (versão da Task 6) por:

```tsx
  const fetchEmails = async (data: FormData): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.emails.fetch(Number(data.month), Number(data.year))
      if (result.ok) setEmails(result.data)
      else if (result.error.code === 'NOT_AUTHENTICATED') onSignedOut()
      else setError(result.error.message)
    } finally {
      setLoading(false)
    }
  }
```

4. Logo depois de `<div className="p-4 gap-4 flex flex-col min-h-screen">`, insira:

```tsx
      <header className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
        <span>{email}</span>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sair
        </Button>
      </header>
```

5. Logo depois do `</form>` de busca (antes do `</div>` que fecha o bloco `p-4`), insira:

```tsx
        {error && (
          <div
            role="alert"
            className="mx-auto mt-4 w-full max-w-2xl rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}
```

- [ ] **Step 5: Aplicar a direção visual**

Ajuste classes e textos de `Login`, do cabeçalho e do banner conforme as seções 1–3 do documento da Task 7, preservando os invariantes listados no início desta task.

- [ ] **Step 6: Verificar**

Run: `yarn typecheck && yarn lint && yarn test`
Expected: sem erros novos em relação à linha de base; testes PASS.

Run: `yarn dev` e confira:
1. Sem credencial salva, o app abre na tela de Login.
2. Clicar em "Gere uma senha de app" abre o navegador do sistema, não uma janela do Electron.
3. Uma senha errada mostra "E-mail ou senha de app incorretos." e o botão volta a ficar habilitado.

- [ ] **Step 7: Commit**

```bash
git add src/renderer
git commit -m "feat: :sparkles: add tela de login, sessão e botão sair"
```

---

### Task 9: E-mail original em modal isolado

**Files:**
- Create: `src/renderer/src/components/ui/dialog.tsx`, `src/renderer/src/components/EmailPreview.tsx`
- Modify: `src/renderer/src/pages/Home/ui/TableDetails/TableViagem.tsx:84-94`, `package.json`

**Interfaces:**
- Consumes: documento de design, seção 4 (Task 7).
- Produces: `EmailPreview({ html: string; trigger: React.ReactElement })`

Invariantes, que não podem mudar ao aplicar o visual:
- O `iframe` tem `sandbox=""`, sem nenhum `allow-*`.
- O conteúdo entra por `srcDoc`.
- O `iframe` tem `title`.
- Nenhum `window.open` resta no renderer.

- [ ] **Step 1: Dependência e `Dialog`**

```bash
yarn add @radix-ui/react-dialog@^1.1
```

`src/renderer/src/components/ui/dialog.tsx`:

```tsx
import { cn } from '@/lib/utils'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import * as React from 'react'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        <X className="size-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger }
```

- [ ] **Step 2: `EmailPreview`**

`src/renderer/src/components/EmailPreview.tsx`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import type { ReactElement } from 'react'

interface EmailPreviewProps {
  html: string
  trigger: ReactElement
}

export function EmailPreview({ html, trigger }: EmailPreviewProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>E-mail original</DialogTitle>
          <DialogDescription>
            Scripts e imagens externas ficam bloqueados por segurança.
          </DialogDescription>
        </DialogHeader>
        {/* sandbox vazio: sem scripts, sem acesso ao app, sem popups nem navegação do topo */}
        <iframe
          title="Conteúdo do e-mail"
          sandbox=""
          srcDoc={html}
          className="w-full flex-1 rounded-md border bg-white"
        />
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Usar em `TableViagem`**

Em `src/renderer/src/pages/Home/ui/TableDetails/TableViagem.tsx`, adicione o import:

```tsx
import { EmailPreview } from '@/components/EmailPreview'
```

e substitua o bloco `{/* ver email */}` + `<a onClick=...>Ver email</a>` (linhas 84–94) por:

```tsx
          <EmailPreview
            html={details.content}
            trigger={
              <button
                type="button"
                className="w-fit text-sm text-gray-400 underline hover:text-gray-300"
              >
                Ver email
              </button>
            }
          />
```

- [ ] **Step 4: Aplicar a direção visual**

Ajuste as classes de `DialogContent`, do `iframe` e do botão "Ver email" conforme a seção 4 do documento da Task 7, preservando os invariantes desta task.

- [ ] **Step 5: Verificar**

Run: `grep -rn "window.open\|document.write" src/renderer`
Expected: sem resultados.

Run: `yarn typecheck && yarn lint`
Expected: sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock src/renderer
git commit -m "feat: :lock: exibe e-mail original em modal com iframe isolado"
```

---

### Task 10: Verificação final

**Files:** nenhum arquivo novo, salvo correções que a verificação apontar.

- [ ] **Step 1: Suíte completa**

Run: `yarn test && yarn typecheck && yarn lint`
Expected: todos os testes PASS; typecheck/lint sem erros novos em relação à linha de base.

- [ ] **Step 2: Build sem segredos**

```bash
yarn build
grep -rn "MAIN_VITE\|rejectUnauthorized" out/ ; echo "exit=$?"
```

Expected: nenhuma linha encontrada e `exit=1`.

Depois peça ao usuário para rodar, com o e-mail real dele:

```bash
! grep -rIl "SEU_EMAIL@gmail.com" out/ ; echo "exit=$?"
```

Expected: `exit=1`, ou seja, o e-mail não aparece em nenhum arquivo do build.

- [ ] **Step 3: Checklist manual (usuário, conta real)**

Peça ao usuário para rodar `yarn dev` e confirmar cada item:
1. Com uma senha de app errada, aparece "E-mail ou senha de app incorretos." e nada é salvo.
2. Com a senha certa (pode colar com espaços), o app entra na Home e mostra o e-mail no cabeçalho.
3. Ao fechar e abrir o app de novo, ele continua logado.
4. Buscar um mês traz os recibos, como antes.
5. "Ver email" abre o modal, o conteúdo aparece e clicar em links dentro dele não abre nada.
6. "Sair" volta para o Login, e ao reabrir o app ele continua no Login.

- [ ] **Step 4: Higiene da credencial antiga**

Oriente o usuário a:
1. Apagar o `.env` local, que não é mais lido.
2. **Revogar a senha de app antiga** em https://myaccount.google.com/apppasswords, porque ela ficou embutida em qualquer build gerado antes desta mudança. Depois, gerar uma nova senha de app para usar na tela de Login.

- [ ] **Step 5: Commit das correções (se houver)**

```bash
git add -A
git commit -m "fix: :bug: ajustes da verificação final de segurança"
```
