/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_EMAIL: string
  readonly MAIN_VITE_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
