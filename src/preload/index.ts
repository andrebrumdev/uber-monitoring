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
