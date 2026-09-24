import { electronApp, optimizer } from '@electron-toolkit/utils'
import { BrowserWindow, app, session } from 'electron'
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

  // O app não precisa de câmera, microfone, geolocalização etc.; negar tudo
  // reduz a superfície de ataque caso algum conteúdo tente solicitar permissão.
  session.defaultSession.setPermissionRequestHandler((_wc, _perm, callback) => callback(false))

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
