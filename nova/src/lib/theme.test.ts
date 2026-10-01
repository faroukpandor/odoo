import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, applyTheme, resolveTheme, initTheme, THEMES } from './theme'

beforeEach(() => { localStorage.clear(); delete document.documentElement.dataset.theme })

describe('appearance', () => {
  it('follows the system until the user chooses', () => {
    expect(getTheme()).toBe('auto')
    expect(['dark', 'light']).toContain(resolveTheme('auto'))
  })

  it('remembers an explicit choice and paints the document', () => {
    applyTheme('light')
    expect(getTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('offers exactly the three sane options', () => {
    expect(THEMES.map(t => t.id)).toEqual(['auto', 'dark', 'light'])
  })

  it('ignores a corrupted preference', () => {
    localStorage.setItem('nova-theme', 'neon')
    expect(getTheme()).toBe('auto')
  })

  it('never travels inside the workspace data', () => {
    applyTheme('light')
    expect(localStorage.getItem('nova-theme')).toBe('light')
    expect(localStorage.getItem('nova-erp-db-v1') ?? '').not.toContain('nova-theme')
  })

  it('boots without throwing when storage is blocked', () => {
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true, get() { throw new Error('blocked') },
    })
    expect(() => initTheme()).not.toThrow()
    if (orig) Object.defineProperty(window, 'localStorage', orig)
  })
})
