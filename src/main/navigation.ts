function parse(url: string): URL | null {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

export function isHttpsUrl(url: string): boolean {
  return parse(url)?.protocol === 'https:'
}

export function isAllowedNavigation(url: string, devServerUrl?: string): boolean {
  if (!devServerUrl) return false
  const target = parse(url)
  const dev = parse(devServerUrl)
  return !!target && !!dev && target.origin === dev.origin
}

const ALLOWED_FRAME_NAVIGATION_URLS = new Set(['about:srcdoc', 'about:blank'])

// O frame principal já é tratado pelo listener de 'will-navigate'; aqui cobrimos
// apenas subframes, como o iframe sandbox do e-mail original, que podem navegar
// a si mesmos ao clicar em um link (ex.: dentro do srcDoc).
export function isAllowedFrameNavigation(url: string, isMainFrame: boolean): boolean {
  if (isMainFrame) return true
  return ALLOWED_FRAME_NAVIGATION_URLS.has(url)
}
