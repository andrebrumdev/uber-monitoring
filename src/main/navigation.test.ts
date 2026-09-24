import { describe, expect, it } from 'vitest'
import { isAllowedFrameNavigation, isAllowedNavigation, isHttpsUrl } from './navigation'

describe('isHttpsUrl', () => {
  it.each([
    ['https://help.uber.com/x', true],
    ['http://uber.com', false],
    ['javascript:alert(1)', false],
    ['file:///etc/passwd', false],
    ['mailto:a@b.com', false],
    ['não é url', false]
  ])('%s → %s', (url, expected) => {
    expect(isHttpsUrl(url)).toBe(expected)
  })
})

describe('isAllowedNavigation', () => {
  const dev = 'http://localhost:5173'

  it('permite o próprio dev server', () => {
    expect(isAllowedNavigation('http://localhost:5173/index.html', dev)).toBe(true)
  })

  it.each([
    ['https://evil.com', dev],
    ['http://localhost:5173.evil.com/', dev],
    ['http://localhost:5174/', dev],
    ['file:///x/index.html', undefined],
    ['https://uber.com', undefined]
  ])('bloqueia %s', (url, devUrl) => {
    expect(isAllowedNavigation(url, devUrl)).toBe(false)
  })
})

describe('isAllowedFrameNavigation', () => {
  it('permite o frame principal (tratado pelo will-navigate)', () => {
    expect(isAllowedFrameNavigation('https://qualquer.com', true)).toBe(true)
  })

  it.each(['about:srcdoc', 'about:blank'])('permite %s em subframe', (url) => {
    expect(isAllowedFrameNavigation(url, false)).toBe(true)
  })

  it.each(['https://help.uber.com/x', 'file:///etc/passwd', 'javascript:alert(1)'])(
    'bloqueia %s em subframe',
    (url) => {
      expect(isAllowedFrameNavigation(url, false)).toBe(false)
    }
  )
})
