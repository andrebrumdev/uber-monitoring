# Subprojeto 1 — Segurança e credenciais

Data: 2026-09-24
Status: aprovado em conversa, aguardando revisão da spec escrita

## Contexto

O app lê recibos da Uber do Gmail via IMAP. Hoje:

- e-mail e senha vêm de `import.meta.env.MAIN_VITE_*`, que o Vite **embute no bundle** — a senha fica legível dentro do app empacotado;
- a verificação TLS está desligada (`rejectUnauthorized: false`);
- o preload expõe o `electronAPI` inteiro (qualquer canal IPC) e a janela roda com `sandbox: false`;
- o HTML do e-mail é injetado com `window.open('')` + `document.writeln`, sem isolamento;
- `shell.openExternal` aceita qualquer URL e o IPC não valida entrada;
- o handler devolve ora um array, ora `{ error }`.

## Objetivo

Uso pessoal hoje, mas pronto para distribuição futura: cada pessoa informa o próprio Gmail, a credencial fica cifrada pelo sistema operacional e nada sensível vai para o binário.

## Fora de escopo

- Reescrita do `fetchEmails` e do parser (subprojeto 2 e 3). Aqui ele só passa a receber a credencial do `AuthProvider`.
- OAuth2 com Google (a interface fica pronta, a implementação não).
- Toasts, acabamento visual, TanStack Query (subprojeto 4).
- Limpeza de dependências, CI, README (subprojeto 5).

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Autenticação | Senha de app do Google, digitada no app | Funciona para qualquer usuário com 2FA, sem infraestrutura; OAuth com escopo Gmail exige verificação CASA para distribuir |
| Extensibilidade | Interface `AuthProvider` | OAuth entra depois como outra implementação |
| Armazenamento | `safeStorage` + `userData/credentials.bin` | Nativo (Keychain/DPAPI/libsecret), sem dependência; `keytar` está arquivado e `electron-store` com chave no código é só ofuscação |
| Criptografia indisponível | Recusar salvar | Nunca gravar em texto puro |

## Arquitetura

```
src/
  shared/
    api.ts                 # tipos de window.api, Result<T>, ErrorCode, nomes dos canais
  main/
    auth/
      AuthProvider.ts      # interface
      AppPasswordProvider.ts
      credentialStore.ts   # wrapper do safeStorage
    ipc/
      auth.ts              # auth:status, auth:login, auth:logout (Zod)
      emails.ts            # emails:fetch (Zod)
    window.ts              # BrowserWindow endurecida
    index.ts               # bootstrap
  preload/index.ts         # expõe só window.api
  renderer/src/
    pages/Login/           # formulário e-mail + senha de app
    components/EmailPreview.tsx  # modal com <iframe sandbox srcdoc>
```

### `shared/api.ts`

```ts
type ErrorCode =
  | 'INVALID_INPUT' | 'NOT_AUTHENTICATED' | 'AUTH_FAILED'
  | 'ENCRYPTION_UNAVAILABLE' | 'NETWORK' | 'UNKNOWN'

type Result<T> = { ok: true; data: T } | { ok: false; error: { code: ErrorCode; message: string } }

interface Api {
  auth: {
    status(): Promise<Result<{ configured: boolean; email?: string }>>
    login(email: string, password: string): Promise<Result<void>>
    logout(): Promise<Result<void>>
  }
  emails: {
    fetch(month: number, year: number): Promise<Result<Email[]>>
  }
}
```

### `AuthProvider`

```ts
interface ImapAuth { user: string; pass: string }

interface AuthProvider {
  status(): Promise<{ configured: boolean; email?: string }>
  getImapAuth(): Promise<ImapAuth | null>
  login(email: string, password: string): Promise<void>   // lança AppError
  logout(): Promise<void>
}
```

`AppPasswordProvider.login` remove espaços da senha, abre conexão IMAP de teste (`imap.gmail.com:993`, TLS verificado), faz logout da conexão e **só então** salva. Falha de autenticação → `AUTH_FAILED`; falha de rede → `NETWORK`.

### `credentialStore`

- `save({ email, password })`: se `!safeStorage.isEncryptionAvailable()` → `ENCRYPTION_UNAVAILABLE`; senão `encryptString(JSON)` e grava em `app.getPath('userData')/credentials.bin`.
- `load()`: arquivo ausente → `null`; arquivo corrompido/indecifrável → apaga e retorna `null`.
- `clear()`: remove o arquivo (ausente não é erro).

### IPC

Cada handler valida com Zod e devolve `Result<T>`; exceções viram `{ ok: false }`, nunca vazam.

- `emails:fetch`: `month` inteiro 1–12, `year` inteiro 2004–ano atual. Sem credencial → `NOT_AUTHENTICATED`.
- `auth:login`: `email` válido, `password` não vazia.

### Janela

- `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`.
- `setWindowOpenHandler`: sempre `deny`; se protocolo for `https:`, abre com `shell.openExternal`.
- `will-navigate`: bloqueado (exceto a URL do dev server em desenvolvimento).
- Removida a exceção de `about:blank`.
- `appId`/`setAppUserModelId` com identificador próprio (`br.com.andrebrum.uber-monitoring`).

### Preload

Expõe apenas `window.api` implementando `Api` via `ipcRenderer.invoke`. O `electronAPI` do toolkit deixa de ser exposto.

### Renderer

- Na inicialização chama `auth.status()`: não configurado → `Login`; configurado → `Home`.
- `Login`: campos e-mail e senha de app, link explicando como gerar a senha de app, erro exibido no formulário.
- `Home`: botão "Sair (email)"; banner de erro quando a busca falha; `NOT_AUTHENTICATED` volta ao Login.
- `EmailPreview`: modal com `<iframe sandbox="" srcdoc={html}>` — sem scripts, sem acesso ao pai, sem navegação. A CSP da página bloqueia imagens remotas (efeito colateral desejado: bloqueia pixels de rastreamento). Substitui o `window.open` em `TableViagem.tsx`.

### Remoções

`MAIN_VITE_EMAIL`, `MAIN_VITE_PASSWORD`, `.env.example`, `src/types/env.d.ts`, `rejectUnauthorized: false`.

## Testes

Vitest (introduzido neste subprojeto):

- `credentialStore` (com `safeStorage` e `fs` mockados): round-trip; recusa quando criptografia indisponível; arquivo corrompido retorna `null` e é apagado; `clear` idempotente.
- Schemas Zod: casos válidos e inválidos de mês, ano, e-mail e senha.
- `AppPasswordProvider` (IMAP mockado): não salva quando a conexão falha e retorna `AUTH_FAILED`/`NETWORK`; salva quando conecta; remove espaços da senha.

Verificação automatizada: após `build`, busca no diretório `out/` não encontra o e-mail nem a senha usados.

Verificação manual (conta real, feita pelo usuário): senha errada → erro; senha certa → entra; reiniciar mantém sessão; "Sair" volta ao Login; modal do e-mail abre sem executar script.

## Roteiro dos próximos subprojetos

2. Main robusto (fetch sem streams, `finally` no logout, datas ISO, busca IMAP filtrada, cache de meses fechados).
3. Parser testável (fixtures anonimizadas, generalizar além de Manaus).
4. Renderer (TanStack Query, toasts, acessibilidade, textos).
5. Tooling e documentação: dependências, Tailwind v4, Electron atual, CI, Husky, resquícios do template e **README novo em português simples, explicando o que o app faz, com prints** (usando dados fictícios para não expor endereços reais).
