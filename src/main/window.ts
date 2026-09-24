import { is } from '@electron-toolkit/utils'
import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import icon from '../../resources/icon.png?asset'
import { isAllowedFrameNavigation, isAllowedNavigation, isHttpsUrl } from './navigation'

function openExternalIfSafe(url: string): void {
  if (isHttpsUrl(url)) void shell.openExternal(url).catch(() => undefined)
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

  // 'will-navigate' só cobre o frame principal. O iframe sandbox do e-mail
  // (sandbox="" srcDoc) ainda pode navegar a si mesmo ao clicar em um link;
  // sem este listener, apenas o CSP bloqueia, mostrando uma página de erro.
  mainWindow.webContents.on('will-frame-navigate', (details) => {
    if (isAllowedFrameNavigation(details.url, details.isMainFrame)) return
    details.preventDefault()
    openExternalIfSafe(details.url)
  })

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
