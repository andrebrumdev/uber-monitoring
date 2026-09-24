import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { IPC, type Result } from '../../shared/api'
import type { AuthProvider } from '../auth/AuthProvider'
import { createAuthHandlers } from './auth'
import { type FetchEmails, type ListPeriods, createEmailHandlers } from './emails'

// Defesa em profundidade: um preload comprometido em um frame que não seja o
// principal (ex.: um iframe malicioso) não deve conseguir invocar os handlers de IPC.
function guardMainFrame<Args extends unknown[], T>(
  handler: (...args: Args) => Promise<Result<T>>
): (event: IpcMainInvokeEvent, ...args: Args) => Promise<Result<T>> {
  return (event, ...args) => {
    if (event.senderFrame !== event.sender.mainFrame) {
      return Promise.resolve({
        ok: false,
        error: { code: 'INVALID_INPUT', message: 'Origem não permitida.' }
      })
    }
    return handler(...args)
  }
}

export function registerIpc(deps: {
  auth: AuthProvider
  fetchEmails: FetchEmails
  listPeriods: ListPeriods
}): void {
  const auth = createAuthHandlers(deps.auth)
  const emails = createEmailHandlers(deps)

  ipcMain.handle(IPC.authStatus, guardMainFrame(() => auth.status()))
  ipcMain.handle(
    IPC.authLogin,
    guardMainFrame((email: unknown, password: unknown) => auth.login(email, password))
  )
  ipcMain.handle(IPC.authLogout, guardMainFrame(() => auth.logout()))
  ipcMain.handle(
    IPC.emailsFetch,
    guardMainFrame((month: unknown, year: unknown) => emails.fetch(month, year))
  )
  ipcMain.handle(IPC.emailsPeriods, guardMainFrame(() => emails.periods()))
}
