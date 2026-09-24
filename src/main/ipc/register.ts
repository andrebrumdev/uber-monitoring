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
