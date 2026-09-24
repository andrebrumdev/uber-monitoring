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
