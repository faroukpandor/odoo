/**
 * Brand kit.
 *
 * A logo on its own does not make a business look established — the stationery
 * around it does. This module holds the brand: mark, colours, type pairing,
 * shape language, pattern and tagline. Everything downstream (business cards,
 * letterheads, invoices, email signatures) is generated from this one object,
 * so changing a colour restyles the whole identity at once.
 *
 * All of it is plain SVG and system fonts: nothing downloads, nothing is
 * licensed, and it prints the same offline as online.
 */
import { Company } from './db'
import { PALETTES, Palette, logoSVG, logoOptions, initialsOf, shortName, hash, LogoStyle, svgDataUrl } from './logo'

export interface FontPair {
  id: string
  label: string
  /** System stacks only — no webfont request, no licence, no layout shift. */
  heading: string
  body: string
  mood: string
}

export const FONTS: FontPair[] = [
  {
    id: 'modern', label: 'Modern sans', mood: 'Tech, services, startups',
    heading: "ui-sans-serif,system-ui,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    body: "ui-sans-serif,system-ui,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },
  {
    id: 'classic', label: 'Classic serif', mood: 'Law, finance, consulting',
    heading: "ui-serif,Georgia,'Times New Roman',Times,serif",
    body: "ui-sans-serif,system-ui,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },
  {
    id: 'editorial', label: 'Editorial', mood: 'Agencies, studios, hospitality',
    heading: "ui-serif,Georgia,'Iowan Old Style','Times New Roman',serif",
    body: "ui-serif,Georgia,'Times New Roman',Times,serif",
  },
  {
    id: 'technical', label: 'Technical mono', mood: 'Engineering, trades, logistics',
    heading: "ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace",
    body: "ui-sans-serif,system-ui,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  },
]

export type Pattern = 'none' | 'corner' | 'stripes' | 'dots' | 'wave' | 'grid'

export const PATTERNS: { id: Pattern; label: string }[] = [
  { id: 'none', label: 'Clean' },
  { id: 'corner', label: 'Corner block' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'dots', label: 'Dots' },
  { id: 'wave', label: 'Wave' },
  { id: 'grid', label: 'Grid' },
]

export interface Brand {
  /** Data-URL mark, shared with Company.logo so documents stay consistent. */
  logo: string
  logoStyle: LogoStyle
  paletteId: string
  primary: string
  accent: string
  ink: string
  paper: string
  fontId: string
  pattern: Pattern
  tagline: string
}

export const paletteById = (id: string): Palette =>
  PALETTES.find(p => p.id === id) ?? PALETTES[0]

export const fontById = (id: string): FontPair =>
  FONTS.find(f => f.id === id) ?? FONTS[0]

/** A complete, sensible brand inferred from nothing but the company name. */
export function defaultBrand(company: Pick<Company, 'name' | 'logo'>): Brand {
  const name = company.name || 'Nova'
  const options = logoOptions(name)
  const seed = hash(name)
  const chosen = options[seed % options.length]
  return {
    logo: company.logo || chosen.dataUrl,
    logoStyle: chosen.style,
    paletteId: chosen.palette.id,
    primary: chosen.palette.from,
    accent: chosen.palette.to,
    ink: '#111827',
    paper: '#ffffff',
    fontId: FONTS[seed % FONTS.length].id,
    pattern: (['corner', 'stripes', 'dots', 'wave', 'grid'] as Pattern[])[seed % 5],
    tagline: '',
  }
}

/** Applies a palette to a brand and redraws the mark to match. */
export function withPalette(brand: Brand, paletteId: string, name: string): Brand {
  const p = paletteById(paletteId)
  return {
    ...brand,
    paletteId: p.id,
    primary: p.from,
    accent: p.to,
    logo: svgDataUrl(logoSVG(name, brand.logoStyle, p)),
  }
}

/**
 * Knockout mark for placing on a brand-coloured header: the shape goes white
 * and the letters take the background colour, instead of a coloured mark
 * disappearing into a coloured block.
 */
export function knockoutLogo(name: string, style: LogoStyle, on: string): string {
  return svgDataUrl(logoSVG(name, style, { id: 'knockout', from: '#ffffff', to: '#f3f4f6', ink: on }))
}

/** Applies a logo shape to a brand, keeping the colours. */
export function withStyle(brand: Brand, style: LogoStyle, name: string): Brand {
  return { ...brand, logoStyle: style, logo: svgDataUrl(logoSVG(name, style, paletteById(brand.paletteId))) }
}

/* ---------- colour maths, so generated stationery is always legible ---------- */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) || 0) as [number, number, number]
}

const channel = (c: number) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Black or white text, whichever can actually be read on this background. */
export const readableOn = (bg: string) => (contrast('#ffffff', bg) >= 4.5 ? '#ffffff' : '#111827')

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const to = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0')
  return `#${to(r1, r2)}${to(g1, g2)}${to(b1, b2)}`
}

export const lighten = (hex: string, t = 0.85) => mix(hex, '#ffffff', t)
export const darken = (hex: string, t = 0.4) => mix(hex, '#000000', t)

/**
 * A brand-coloured surface that is guaranteed readable.
 *
 * A gradient can pass contrast at one end and fail at the other, which is how
 * generated stationery ends up with unreadable type. So: try white; if it
 * fails against either end, deepen the gradient until it passes. The identity
 * keeps its hue, the text stays legible, and nobody has to think about it.
 */
export function surface(primary: string, accent: string): { from: string; to: string; ink: string } {
  let from = primary, to = accent
  for (let i = 0; i < 8; i++) {
    const worst = Math.min(contrast('#ffffff', from), contrast('#ffffff', to), contrast('#ffffff', mix(from, to, 0.5)))
    if (worst >= 4.5) return { from, to, ink: '#ffffff' }
    from = darken(from, 0.12)
    to = darken(to, 0.12)
  }
  return { from, to, ink: '#ffffff' }
}

/** Everything a generator needs, resolved once. */
export interface BrandContext {
  brand: Brand
  company: Company
  font: FontPair
  name: string
  short: string
  initials: string
}

export function brandContext(company: Company, brand?: Brand): BrandContext {
  const b = brand ?? (company.brand as Brand | undefined) ?? defaultBrand(company)
  return {
    brand: b,
    company,
    font: fontById(b.fontId),
    name: company.name || 'Your Company',
    short: shortName(company.name || 'Your Company'),
    initials: initialsOf(company.name || 'Your Company'),
  }
}
