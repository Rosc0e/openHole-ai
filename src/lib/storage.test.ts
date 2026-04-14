import { readStoredValue, writeStoredValue } from './storage'

describe('storage helpers', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value)
        },
        clear: () => {
          storage.clear()
        },
      },
    })
  })

  it('returns fallback when missing or invalid', () => {
    expect(readStoredValue('missing', 'fallback')).toBe('fallback')

    window.localStorage.setItem('bad', '{')
    expect(readStoredValue('bad', 'fallback')).toBe('fallback')
  })

  it('reads and writes stored json values', () => {
    writeStoredValue('settings', { enabled: true, count: 2 })

    expect(readStoredValue('settings', { enabled: false, count: 0 })).toEqual({
      enabled: true,
      count: 2,
    })
  })

  it('no-ops safely when window is unavailable', () => {
    const originalWindow = globalThis.window

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    })

    expect(readStoredValue('settings', 'fallback')).toBe('fallback')
    expect(() => writeStoredValue('settings', { enabled: true })).not.toThrow()

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    })
  })
})
