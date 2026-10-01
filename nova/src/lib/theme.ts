/**
 * Appearance. A display preference, not business data: it lives in
 * localStorage so it never travels inside an exported workspace, and it
 * follows the operating system until the user decides otherwise.
 */
export type Theme = 'auto' | 'dark' | 'light'

const KEY = 'nova-theme'

export const THEMES: { id: Theme; label: string; icon: string }[] = [
  { id: 'auto', label: 'Match system', icon: '◐' },
  { id: 'dark', label: 'Dark', icon: '☾' },
  { id: 'light', label: 'Light', icon: '☀' },
]

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light' || v === 'auto') return v
  } catch { /* storage blocked */ }
  return 'auto'
}

export function prefersLight(): boolean {
  try { return !!window.matchMedia?.('(prefers-color-scheme: light)').matches } catch { return false }
}

export const resolveTheme = (t: Theme = getTheme()): 'dark' | 'light' =>
  t === 'auto' ? (prefersLight() ? 'light' : 'dark') : t

export function applyTheme(t: Theme) {
  try { localStorage.setItem(KEY, t) } catch { /* storage blocked */ }
  try {
    document.documentElement.dataset.theme = resolveTheme(t)
  } catch { /* no DOM, e.g. a unit test */ }
}

/** Called once at boot, before first paint, so there is no flash of dark. */
export function initTheme() { applyTheme(getTheme()) }
