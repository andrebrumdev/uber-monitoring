import '@/assets/base.css'
import { APP_NAME } from '@/components/brand'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

document.title = APP_NAME

// Os tokens claro/escuro seguem o tema do sistema.
const darkScheme = window.matchMedia('(prefers-color-scheme: dark)')
const applyScheme = (): void => {
  document.documentElement.classList.toggle('dark', darkScheme.matches)
}
applyScheme()
darkScheme.addEventListener('change', applyScheme)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
