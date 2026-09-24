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
