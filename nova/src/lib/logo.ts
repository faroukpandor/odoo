/**
 * Logo studio.
 *
 * A new business usually has no logo, and uploading one is the step that stalls
 * onboarding. So Nova draws one: deterministic SVG marks built from the company
 * name, rendered as data URLs that print on documents exactly like an uploaded
 * file. No network, no AI service, no licence questions — the output is plain
 * geometry the user owns.
 */

export type LogoStyle = 'monogram' | 'badge' | 'wordmark' | 'shield' | 'orbit' | 'stack'

export interface Palette { id: string; from: string; to: string; ink: string }

export const PALETTES: Palette[] = [
  { id: 'indigo', from: '#5b8cff', to: '#9b5bff', ink: '#ffffff' },
  { id: 'emerald', from: '#19c37d', to: '#0ea5a5', ink: '#ffffff' },
  { id: 'sunset', from: '#ff8a3d', to: '#ff4d6d', ink: '#ffffff' },
  { id: 'ocean', from: '#1e6fd9', to: '#19b6d9', ink: '#ffffff' },
  { id: 'plum', from: '#7c3aed', to: '#db2777', ink: '#ffffff' },
  { id: 'savanna', from: '#d9a521', to: '#c2410c', ink: '#ffffff' },
  { id: 'forest', from: '#166534', to: '#65a30d', ink: '#ffffff' },
  { id: 'slate', from: '#334155', to: '#0f172a', ink: '#ffffff' },
  { id: 'rose', from: '#f43f5e', to: '#7c3aed', ink: '#ffffff' },
  { id: 'gold', from: '#facc15', to: '#f97316', ink: '#1f2937' },
]

export const STYLES: { id: LogoStyle; label: string }[] = [
  { id: 'monogram', label: 'Monogram' },
  { id: 'badge', label: 'Badge' },
  { id: 'wordmark', label: 'Wordmark' },
  { id: 'shield', label: 'Shield' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'stack', label: 'Stack' },
]

/** Stable hash so the same company name always starts from the same palette. */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

const STOP = new Set(['the', 'and', 'of', 'pty', 'ltd', 'inc', 'llc', 'co', 'limited', 'cc', 'plc', 'group'])

/** Initials a human would choose: meaningful words only, at most two letters. */
export function initialsOf(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s&-]/gu, ' ').split(/[\s-]+/)
    .map(w => w.trim()).filter(Boolean)
    .filter(w => !STOP.has(w.toLowerCase().replace(/[^a-z]/g, '')))
  if (words.length === 0) return 'N'
  if (words.length === 1) {
    const w = words[0]
    return (w.length > 1 ? w.slice(0, 2) : w).toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Short display name for wordmarks, so long legal names stay legible. */
export function shortName(name: string): string {
  const clean = name.replace(/\((pty|ltd|inc|llc)\)?/gi, '').replace(/\b(pty|ltd|inc|llc|limited|cc|plc)\b\.?/gi, '')
    .replace(/\s+/g, ' ').trim()
  return (clean || name || 'Nova').slice(0, 18)
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const FONT = "font-family='ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif'"

/** Draws one logo as a standalone SVG string (square unless it is a wordmark). */
export function logoSVG(name: string, style: LogoStyle, palette: Palette): string {
  const ini = esc(initialsOf(name))
  const grad = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.from}"/><stop offset="1" stop-color="${palette.to}"/>
    </linearGradient></defs>`
  const letters = (size: number, y: number) =>
    `<text x="64" y="${y}" text-anchor="middle" ${FONT} font-size="${size}" font-weight="700" fill="${palette.ink}">${ini}</text>`

  switch (style) {
    case 'monogram':
      return wrap(128, 128, `${grad}<rect width="128" height="128" rx="28" fill="url(#g)"/>${letters(56, 84)}`)
    case 'badge':
      return wrap(128, 128, `${grad}<circle cx="64" cy="64" r="60" fill="url(#g)"/>
        <circle cx="64" cy="64" r="52" fill="none" stroke="${palette.ink}" stroke-opacity=".45" stroke-width="2"/>
        ${letters(48, 81)}`)
    case 'shield':
      return wrap(128, 128, `${grad}<path d="M64 6 118 28v44c0 30-23 46-54 50C33 118 10 102 10 72V28z" fill="url(#g)"/>
        ${letters(46, 82)}`)
    case 'orbit':
      return wrap(128, 128, `${grad}<circle cx="64" cy="64" r="40" fill="url(#g)"/>
        <ellipse cx="64" cy="64" rx="60" ry="26" fill="none" stroke="${palette.to}" stroke-width="5"
          transform="rotate(-28 64 64)"/>
        <circle cx="112" cy="40" r="7" fill="${palette.from}"/>${letters(34, 76)}`)
    case 'stack':
      return wrap(128, 128, `${grad}
        <rect x="16" y="18" width="96" height="26" rx="8" fill="url(#g)"/>
        <rect x="16" y="51" width="96" height="26" rx="8" fill="url(#g)" opacity=".72"/>
        <rect x="16" y="84" width="96" height="26" rx="8" fill="url(#g)" opacity=".44"/>
        <text x="64" y="71" text-anchor="middle" ${FONT} font-size="20" font-weight="800"
          fill="${palette.ink}">${ini}</text>`)
    case 'wordmark':
    default: {
      const word = esc(shortName(name))
      const width = Math.max(220, 42 + word.length * 19)
      return wrap(width, 72, `${grad}
        <rect x="6" y="14" width="44" height="44" rx="12" fill="url(#g)"/>
        <text x="28" y="46" text-anchor="middle" ${FONT} font-size="22" font-weight="800"
          fill="${palette.ink}">${esc(initialsOf(name)[0] ?? 'N')}</text>
        <text x="62" y="46" ${FONT} font-size="26" font-weight="700" fill="${palette.from}">${word}</text>`)
    }
  }
}

const wrap = (w: number, h: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">${body}</svg>`

/** data: URL that works in <img>, in print and in an exported backup. */
export const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`

export interface LogoOption {
  id: string
  style: LogoStyle
  palette: Palette
  svg: string
  dataUrl: string
}

/** A spread of candidates: every style, each in a colour chosen from the name. */
export function logoOptions(name: string, count = 6): LogoOption[] {
  const seed = hash(name || 'Nova')
  return STYLES.slice(0, count).map((s, i) => {
    const palette = PALETTES[(seed + i * 3) % PALETTES.length]
    const svg = logoSVG(name, s.id, palette)
    return { id: `${s.id}-${palette.id}`, style: s.id, palette, svg, dataUrl: svgDataUrl(svg) }
  })
}

/** Re-colours one option without changing its shape — the "shuffle" button. */
export function recolour(option: LogoOption, name: string, step = 1): LogoOption {
  const i = PALETTES.findIndex(p => p.id === option.palette.id)
  const palette = PALETTES[(i + step + PALETTES.length) % PALETTES.length]
  const svg = logoSVG(name, option.style, palette)
  return { id: `${option.style}-${palette.id}`, style: option.style, palette, svg, dataUrl: svgDataUrl(svg) }
}

/** Rough byte cost of storing a logo, so the UI can warn before the quota does. */
export const logoBytes = (dataUrl: string) => new Blob([dataUrl]).size
