import type { ReceiptPeriod } from '../../shared/api'
import type { AuthProvider, ImapAuth } from '../auth/AuthProvider'
import { AppError, toResult } from '../errors'
import { fetchArgsSchema, parseArgs } from './schemas'

export type FetchEmails = (auth: ImapAuth, month: number, year: number) => Promise<Email[]>
export type ListPeriods = (auth: ImapAuth) => Promise<ReceiptPeriod[]>

export function createEmailHandlers(deps: {
  auth: AuthProvider
  fetchEmails: FetchEmails
  listPeriods: ListPeriods
}) {
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
      }),
    periods: () =>
      toResult(async () => {
        const imapAuth = await deps.auth.getImapAuth()
        if (!imapAuth) {
          throw new AppError('NOT_AUTHENTICATED', 'Entre com sua conta para buscar os recibos.')
        }
        return deps.listPeriods(imapAuth)
      })
  }
}
