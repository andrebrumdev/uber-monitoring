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
