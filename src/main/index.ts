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
