import { describe, it, expect, beforeEach } from 'vitest'
import { resetDB, getDB, update } from './db'
import {
  defaultBrand, brandContext, withPalette, withStyle, contrast, luminance,
  readableOn, mix, lighten, darken, hexToRgb, surface, knockoutLogo,
  FONTS, PATTERNS, fontById, paletteById,
} from './brand'
import {
  stationerySet, businessCardFront, businessCardBack, letterhead, complimentSlip,
  envelopeDL, invoiceTheme, quoteCover, socialAvatar, socialBanner, rubberStamp,
  idBadge, emailSignature, cardSheet, fileNameFor,
} from './stationery'
import { PALETTES } from './logo'

const ctxOf = () => brandContext(getDB().company)

beforeEach(() => {
  resetDB()
  update(d => {
    d.company.name = 'Kalahari Trading'
    d.company.email = 'hello@kalahari.co.bw'
    d.company.phone = '+267 71 000 000'
    d.company.address = 'Plot 123, Gaborone'
    d.company.vatId = 'C1234567890'
    d.company.regNo = 'BW00001234567'
  })
})

describe('the brand kit', () => {
  it('invents a complete, usable identity from just a name', () => {
    const b = defaultBrand({ name: 'Kalahari Trading', logo: '' })
    expect(b.logo.startsWith('data:image/svg+xml')).toBe(true)
    expect(PALETTES.some(p => p.id === b.paletteId)).toBe(true)
    expect(FONTS.some(f => f.id === b.fontId)).toBe(true)
    expect(PATTERNS.some(p => p.id === b.pattern)).toBe(true)
  })

  it('is deterministic, so the same business always gets the same identity', () => {
    expect(defaultBrand({ name: 'Kalahari Trading', logo: '' }))
      .toEqual(defaultBrand({ name: 'Kalahari Trading', logo: '' }))
  })

  it('keeps an uploaded logo instead of overwriting it', () => {
    const b = defaultBrand({ name: 'Kalahari Trading', logo: 'data:image/png;base64,AAA' })
    expect(b.logo).toBe('data:image/png;base64,AAA')
  })

  it('redraws the mark when the palette changes, keeping the shape', () => {
    const b = defaultBrand({ name: 'Kalahari Trading', logo: '' })
    const next = withPalette(b, 'emerald', 'Kalahari Trading')
    expect(next.paletteId).toBe('emerald')
    expect(next.primary).toBe(paletteById('emerald').from)
    expect(next.logoStyle).toBe(b.logoStyle)
    expect(next.logo).not.toBe(b.logo)
  })

  it('changes the shape while keeping the colours', () => {
    const b = withStyle(defaultBrand({ name: 'Nova', logo: '' }), 'shield', 'Nova')
    expect(b.logoStyle).toBe('shield')
    expect(b.primary).toBe(paletteById(b.paletteId).from)
  })

  it('falls back safely for unknown ids', () => {
    expect(fontById('nope').id).toBe(FONTS[0].id)
    expect(paletteById('nope').id).toBe(PALETTES[0].id)
  })
})

describe('colour maths keeps stationery readable', () => {
  it('computes WCAG contrast correctly at the extremes', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 1)
  })

  it('picks ink that can actually be read on any brand colour', () => {
    PALETTES.forEach(p => {
      const ink = readableOn(p.from)
      expect(contrast(ink, p.from)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('mixes, lightens and darkens predictably', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(luminance('#ffffff')).toBeCloseTo(1, 2)
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
    expect(luminance(lighten('#123456'))).toBeGreaterThan(luminance('#123456'))
    expect(luminance(darken('#abcdef'))).toBeLessThan(luminance('#abcdef'))
  })
})

describe('the stationery set', () => {
  it('produces every piece a new business is asked for', () => {
    const ids = stationerySet(ctxOf()).map(p => p.id)
    expect(ids).toEqual(expect.arrayContaining([
      'card-front', 'card-back', 'letterhead', 'comp-slip', 'envelope',
      'id-badge', 'stamp', 'invoice-theme', 'quote-cover', 'avatar', 'banner',
    ]))
    expect(ids.length).toBeGreaterThanOrEqual(11)
  })

  it('uses real print sizes, declared in millimetres', () => {
    const by = Object.fromEntries(stationerySet(ctxOf()).map(p => [p.id, p]))
    expect([by['card-front'].w, by['card-front'].h]).toEqual([85, 55])
    expect([by['letterhead'].w, by['letterhead'].h]).toEqual([210, 297])
    expect([by['comp-slip'].w, by['comp-slip'].h]).toEqual([210, 99])
    expect([by['envelope'].w, by['envelope'].h]).toEqual([220, 110])
    expect([by['id-badge'].w, by['id-badge'].h]).toEqual([54, 86])
  })

  it('declares those millimetres in the SVG itself, so printers obey', () => {
    const card = businessCardFront(ctxOf())
    expect(card).toContain('width="85mm"')
    expect(card).toContain('height="55mm"')
    expect(card).toContain('viewBox="0 0 850 550"')
    expect(letterhead(ctxOf())).toContain('width="210mm"')
  })

  it('every piece is well-formed, self-contained SVG', () => {
    stationerySet(ctxOf()).forEach(p => {
      expect(p.svg.startsWith('<svg')).toBe(true)
      expect(p.svg.trim().endsWith('</svg>')).toBe(true)
      expect(p.svg).not.toContain('http://localhost')
      expect((p.svg.match(/<svg/g) ?? []).length).toBe(1)
    })
  })

  it('carries the business details onto the pieces that need them', () => {
    const card = businessCardFront(ctxOf())
    expect(card).toContain('Kalahari Trading')
    expect(card).toContain('+267 71 000 000')
    expect(card).toContain('hello@kalahari.co.bw')
    expect(businessCardBack(ctxOf())).toContain('C1234567890')
    expect(envelopeDL(ctxOf())).toContain('Plot 123, Gaborone')
    expect(idBadge(ctxOf())).toContain('KT')
  })

  it('shows the tagline everywhere it is set, and nowhere when it is not', () => {
    const plain = ctxOf()
    expect(businessCardFront(plain)).not.toContain('Before dawn')
    const branded = brandContext(getDB().company, { ...defaultBrand(getDB().company), tagline: 'Before dawn' })
    expect(businessCardFront(branded)).toContain('Before dawn')
    expect(quoteCover(branded)).toContain('Before dawn')
  })

  it('never breaks on a business with no details at all', () => {
    resetDB()
    update(d => {
      d.company = { ...d.company, name: '', email: '', phone: '', address: '', vatId: '', regNo: '' }
    })
    const pieces = stationerySet(ctxOf())
    expect(pieces).toHaveLength(11)
    pieces.forEach(p => expect(p.svg.length).toBeGreaterThan(200))
  })

  it('escapes a hostile company name rather than injecting markup', () => {
    update(d => { d.company.name = '<script>alert(1)</script>' })
    stationerySet(ctxOf()).forEach(p => expect(p.svg).not.toContain('<script>'))
  })

  it('restyles the whole family when one colour changes', () => {
    const a = brandContext(getDB().company, withPalette(defaultBrand(getDB().company), 'emerald', 'Kalahari Trading'))
    const b = brandContext(getDB().company, withPalette(defaultBrand(getDB().company), 'sunset', 'Kalahari Trading'))
    expect(businessCardFront(a)).not.toBe(businessCardFront(b))
    expect(letterhead(a)).toContain(paletteById('emerald').from)
    const sunset = paletteById('sunset')
    expect(socialBanner(b)).toContain(surface(sunset.from, sunset.to).from)
  })

  it('draws the specialised pieces properly', () => {
    expect(rubberStamp(ctxOf())).toContain('textPath')
    expect(rubberStamp(ctxOf())).toContain('KALAHARI TRADING')
    expect(socialAvatar(ctxOf())).toContain('viewBox="0 0 1000 1000"')
    expect(socialBanner(ctxOf())).toContain('viewBox="0 0 1500 500"')
    expect(invoiceTheme(ctxOf())).toContain('TAX INVOICE')
    expect(complimentSlip(ctxOf())).toContain('With compliments')
    expect(quoteCover(ctxOf())).toContain('PROPOSAL')
  })
})

describe('imposition and export', () => {
  it('lays ten cards on an A4 sheet with crop marks', () => {
    const sheet = cardSheet(ctxOf())
    expect(sheet).toContain('width="210mm"')
    expect((sheet.match(/<g transform="translate/g) ?? []).length).toBe(10)
    expect(sheet).toContain('stroke="#9ca3af"')      // crop marks
    expect((sheet.match(/<svg/g) ?? []).length).toBe(1)   // one document, not nested
  })

  it('can impose the reverse side too', () => {
    expect(cardSheet(ctxOf(), 'back')).not.toBe(cardSheet(ctxOf(), 'front'))
  })

  it('names downloads after the business and the piece', () => {
    expect(fileNameFor('Kalahari Trading (Pty) Ltd', 'card-front')).toBe('kalahari-trading-pty-ltd-card-front')
    expect(fileNameFor('', 'letterhead')).toBe('nova-letterhead')
  })
})

describe('email signature', () => {
  it('is pasteable HTML with the mark embedded, not hotlinked', () => {
    const sig = emailSignature(ctxOf())
    expect(sig).toContain('<table')
    expect(sig).toContain('Kalahari Trading')
    expect(sig).toContain('mailto:hello@kalahari.co.bw')
    expect(sig).toContain('src="data:image/svg+xml')
    expect(sig).not.toContain('src="http')
  })

  it('leaves out rows the business has not filled in', () => {
    update(d => { d.company.phone = ''; d.company.address = '' })
    const sig = emailSignature(ctxOf())
    expect(sig).toContain('mailto:')
    expect(sig).not.toContain('Plot 123')
  })
})

describe('type is readable on every brand colour, automatically', () => {
  it('deepens a pale gradient until white type passes WCAG AA', () => {
    const gold = paletteById('gold')
    expect(contrast('#ffffff', gold.from)).toBeLessThan(4.5)      // the raw colour fails
    const sf = surface(gold.from, gold.to)
    expect(contrast(sf.ink, sf.from)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(sf.ink, sf.to)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(sf.ink, mix(sf.from, sf.to, 0.5))).toBeGreaterThanOrEqual(4.5)
  })

  it('leaves an already-dark palette alone', () => {
    const slate = paletteById('slate')
    expect(surface(slate.from, slate.to).from).toBe(slate.from)
  })

  it('guarantees it for every palette in the kit', () => {
    PALETTES.forEach(p => {
      const sf = surface(p.from, p.to)
      expect(contrast(sf.ink, sf.from)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(sf.ink, sf.to)).toBeGreaterThanOrEqual(4.5)
    })
  })

  it('knocks the mark out in white when it sits on a coloured header', () => {
    const ko = knockoutLogo('Kalahari Trading', 'monogram', '#f43f5e')
    expect(ko.startsWith('data:image/svg+xml')).toBe(true)
    const svg = decodeURIComponent(ko.split(',')[1])
    expect(svg).toContain('#ffffff')
    expect(svg).toContain('#f43f5e')
  })

  it('uses the knockout on every coloured header, not the coloured mark', () => {
    const ctx = brandContext(getDB().company, withPalette(defaultBrand(getDB().company), 'gold', 'Kalahari Trading'))
    const header = invoiceTheme(ctx)
    expect(header).toContain('%23ffffff')          // encoded white in the embedded mark
    expect(socialBanner(ctx)).toContain('%23ffffff')
  })
})
