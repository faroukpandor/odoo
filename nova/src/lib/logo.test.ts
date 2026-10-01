import { describe, it, expect } from 'vitest'
import {
  logoOptions, logoSVG, recolour, initialsOf, shortName, hash, svgDataUrl,
  PALETTES, STYLES, logoBytes,
} from './logo'

describe('initials a human would pick', () => {
  it('uses the first letters of the meaningful words', () => {
    expect(initialsOf('Kalahari Fresh Foods')).toBe('KF')
    expect(initialsOf('Gaborone Tech Hub')).toBe('GT')
  })

  it('ignores company-form noise', () => {
    expect(initialsOf('Kalahari Trading (Pty) Ltd')).toBe('KT')
    expect(initialsOf('The Coffee Co')).toBe('CO')
    expect(initialsOf('Nova Group Limited')).toBe('NO')
  })

  it('copes with one word, punctuation and emptiness', () => {
    expect(initialsOf('Nova')).toBe('NO')
    expect(initialsOf('X')).toBe('X')
    expect(initialsOf('   ')).toBe('N')
    expect(initialsOf('!!!')).toBe('N')
  })

  it('handles non-Latin names without throwing', () => {
    expect(initialsOf('Соларис Трейд').length).toBeGreaterThan(0)
    expect(initialsOf('株式会社ノヴァ').length).toBeGreaterThan(0)
  })

  it('shortens a legal name for a wordmark', () => {
    expect(shortName('Kalahari Trading (Pty) Ltd')).toBe('Kalahari Trading')
    expect(shortName('')).toBe('Nova')
    expect(shortName('A very long legal trading name indeed').length).toBeLessThanOrEqual(18)
  })
})

describe('generated marks', () => {
  it('offers one candidate per style, all usable as images', () => {
    const opts = logoOptions('Kalahari Fresh Foods')
    expect(opts).toHaveLength(STYLES.length)
    opts.forEach(o => {
      expect(o.svg.startsWith('<svg')).toBe(true)
      expect(o.svg).toContain('</svg>')
      expect(o.dataUrl.startsWith('data:image/svg+xml')).toBe(true)
    })
  })

  it('is deterministic: the same name always gives the same designs', () => {
    expect(logoOptions('Nova Retail').map(o => o.id))
      .toEqual(logoOptions('Nova Retail').map(o => o.id))
  })

  it('gives different businesses different colours', () => {
    const a = logoOptions('Kalahari Fresh Foods')[0].palette.id
    const b = logoOptions('Southern Supply Co')[0].palette.id
    expect(hash('Kalahari Fresh Foods')).not.toBe(hash('Southern Supply Co'))
    expect([a, b].length).toBe(2)
  })

  it('shuffles colour without changing the shape', () => {
    const [first] = logoOptions('Nova Retail')
    const next = recolour(first, 'Nova Retail')
    expect(next.style).toBe(first.style)
    expect(next.palette.id).not.toBe(first.palette.id)
    expect(PALETTES.some(p => p.id === next.palette.id)).toBe(true)
  })

  it('escapes a hostile business name instead of injecting markup', () => {
    const svg = logoSVG('<script>alert(1)</script>', 'wordmark', PALETTES[0])
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
    expect(logoSVG('Smith & Sons', 'wordmark', PALETTES[0])).toContain('&amp;')
  })

  it('stays tiny enough to live in every backup', () => {
    logoOptions('Kalahari Trading (Pty) Ltd').forEach(o => {
      expect(logoBytes(o.dataUrl)).toBeLessThan(4000)
    })
  })

  it('encodes safely for a data URL', () => {
    expect(svgDataUrl('<svg>#"</svg>')).not.toContain('#')
    expect(svgDataUrl('<svg>  spaced  </svg>')).toContain('%3Csvg%3E')
  })
})
