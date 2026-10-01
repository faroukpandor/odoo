/**
 * Stationery generators.
 *
 * Every item is a real print size expressed in millimetres, drawn in SVG user
 * units of 0.1 mm so geometry stays exact: a business card really is 85×55 mm
 * with a 3 mm bleed and a 4 mm safe margin, and a letterhead really is A4.
 * The output can be printed, downloaded as SVG, or rasterised to PNG in the
 * browser — all without a server, a font download or a design licence.
 */
import { BrandContext, lighten, darken, surface, knockoutLogo, Pattern } from './brand'
import { Company } from './db'

export interface Piece {
  id: string
  label: string
  /** Finished size in millimetres. */
  w: number
  h: number
  group: 'print' | 'digital' | 'document'
  blurb: string
  svg: string
}

/** 1 mm = 10 user units, so a 0.1 mm grid. */
const U = 10
const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function doc(wmm: number, hmm: number, body: string, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${wmm}mm" height="${hmm}mm" ` +
    `viewBox="0 0 ${wmm * U} ${hmm * U}" role="img">${defs}${body}</svg>`
}

const text = (
  x: number, y: number, s: string,
  o: { size?: number; weight?: number; fill?: string; font?: string; anchor?: string; spacing?: number; opacity?: number } = {},
) =>
  `<text x="${x}" y="${y}" font-family="${o.font ?? ''}" font-size="${o.size ?? 30}" ` +
  `font-weight="${o.weight ?? 400}" fill="${o.fill ?? '#111827'}" ` +
  `text-anchor="${o.anchor ?? 'start'}" letter-spacing="${o.spacing ?? 0}" ` +
  `opacity="${o.opacity ?? 1}">${esc(s)}</text>`

/** Decorative furniture shared by every piece, so the family looks related. */
function pattern(kind: Pattern, w: number, h: number, colour: string, accent: string): string {
  switch (kind) {
    case 'corner':
      return `<path d="M0 0 H${w * 0.34} L0 ${h * 0.5} Z" fill="${colour}" opacity=".16"/>
        <path d="M${w} ${h} H${w * 0.66} L${w} ${h * 0.5} Z" fill="${accent}" opacity=".16"/>`
    case 'stripes':
      return `<g opacity=".5">${Array.from({ length: 6 }, (_, i) =>
        `<rect x="${w - (i + 1) * 26}" y="0" width="10" height="${h}" fill="${i % 2 ? accent : colour}" opacity=".3"/>`).join('')}</g>`
    case 'dots':
      return `<g fill="${colour}" opacity=".22">${Array.from({ length: 28 }, (_, i) =>
        `<circle cx="${40 + (i % 7) * 34}" cy="${h - 40 - Math.floor(i / 7) * 34}" r="6"/>`).join('')}</g>`
    case 'wave':
      return `<path d="M0 ${h} C ${w * 0.3} ${h * 0.72}, ${w * 0.62} ${h * 1.05}, ${w} ${h * 0.74} L${w} ${h} Z"
        fill="${colour}" opacity=".18"/>
        <path d="M0 ${h} C ${w * 0.35} ${h * 0.82}, ${w * 0.7} ${h * 1.1}, ${w} ${h * 0.86} L${w} ${h} Z"
        fill="${accent}" opacity=".22"/>`
    case 'grid':
      return `<g stroke="${colour}" stroke-width="1.6" opacity=".18">${Array.from({ length: 9 }, (_, i) =>
        `<line x1="${(i + 1) * (w / 10)}" y1="0" x2="${(i + 1) * (w / 10)}" y2="${h}"/>`).join('')}</g>`
    default:
      return ''
  }
}

const contactLine = (c: Company) =>
  [c.phone, c.email, c.address].filter(Boolean).join('   ·   ')

const legalLine = (c: Company) =>
  [c.vatId && `${c.taxLabel || 'VAT'} ${c.vatId}`, c.regNo && `Reg. ${c.regNo}`]
    .filter(Boolean).join('   ·   ')

/** <image> of the brand mark — data URLs embed, so the file stays standalone. */
const mark = (href: string, x: number, y: number, w: number, h: number) =>
  href ? `<image href="${esc(href)}" x="${x}" y="${y}" width="${w}" height="${h}"
    preserveAspectRatio="xMinYMid meet"/>` : ''

/* ---------------------------- the pieces ---------------------------- */

export function businessCardFront(ctx: BrandContext): string {
  const { brand: b, company: c, font, name } = ctx
  const w = 85 * U, h = 55 * U
  return doc(85, 55, `
    <rect width="${w}" height="${h}" fill="${b.paper}"/>
    ${pattern(b.pattern, w, h, b.primary, b.accent)}
    ${mark(b.logo, 40, 40, 170, 120)}
    ${text(40, 240, name, { size: 42, weight: 700, fill: b.ink, font: font.heading })}
    ${b.tagline ? text(40, 282, b.tagline, { size: 24, fill: b.primary, font: font.body }) : ''}
    <line x1="40" y1="330" x2="${w - 40}" y2="330" stroke="${lighten(b.primary, 0.6)}" stroke-width="2"/>
    ${text(40, 380, c.phone || '', { size: 24, fill: b.ink, font: font.body, opacity: 0.85 })}
    ${text(40, 420, c.email || '', { size: 24, fill: b.ink, font: font.body, opacity: 0.85 })}
    ${text(40, 460, c.address || '', { size: 22, fill: b.ink, font: font.body, opacity: 0.6 })}
    <rect x="0" y="${h - 18}" width="${w}" height="18" fill="${b.primary}"/>`)
}

export function businessCardBack(ctx: BrandContext): string {
  const { brand: b, company: c, font, name, initials } = ctx
  const w = 85 * U, h = 55 * U
  const sf = surface(b.primary, b.accent)
  const ink = sf.ink
  return doc(85, 55, `
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${sf.from}"/><stop offset="1" stop-color="${sf.to}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    ${pattern(b.pattern === 'none' ? 'dots' : b.pattern, w, h, ink, ink)}
    ${text(w / 2, h / 2 - 10, initials, { size: 150, weight: 800, fill: ink, anchor: 'middle', font: font.heading, opacity: 0.95 })}
    ${text(w / 2, h / 2 + 60, name, { size: 26, fill: ink, anchor: 'middle', font: font.body, opacity: 0.9, spacing: 2 })}
    ${c.vatId || c.regNo
      ? text(w / 2, h - 50, legalLine(c), { size: 17, fill: ink, anchor: 'middle', font: font.body, opacity: 0.75 })
      : ''}`)
}

export function letterhead(ctx: BrandContext, body?: string): string {
  const { brand: b, company: c, font, name } = ctx
  const w = 210 * U, h = 297 * U
  const lines = (body ?? defaultLetter(ctx)).split('\n')
  return doc(210, 297, `
    <rect width="${w}" height="${h}" fill="${b.paper}"/>
    <rect x="0" y="0" width="${w}" height="14" fill="${b.primary}"/>
    ${pattern(b.pattern, w, h, b.primary, b.accent)}
    ${mark(b.logo, 150, 110, 420, 230)}
    ${text(w - 150, 180, name, { size: 34, weight: 700, fill: b.ink, anchor: 'end', font: font.heading })}
    ${b.tagline ? text(w - 150, 220, b.tagline, { size: 22, fill: b.primary, anchor: 'end', font: font.body }) : ''}
    ${text(w - 150, 258, contactLine(c), { size: 19, fill: b.ink, anchor: 'end', font: font.body, opacity: 0.7 })}
    <line x1="150" y1="360" x2="${w - 150}" y2="360" stroke="${lighten(b.primary, 0.55)}" stroke-width="2"/>
    <g>${lines.map((l, i) =>
      text(150, 470 + i * 46, l, { size: l.endsWith(':') ? 26 : 24, weight: l.endsWith(':') ? 700 : 400, fill: b.ink, font: font.body, opacity: l ? 0.9 : 0 })).join('')}</g>
    <rect x="0" y="${h - 240}" width="${w}" height="240" fill="${b.paper}" opacity=".88"/>
    <line x1="150" y1="${h - 210}" x2="${w - 150}" y2="${h - 210}" stroke="${lighten(b.primary, 0.55)}" stroke-width="2"/>
    ${text(w / 2, h - 160, contactLine(c), { size: 18, fill: b.ink, anchor: 'middle', font: font.body, opacity: 0.65 })}
    ${text(w / 2, h - 126, legalLine(c), { size: 17, fill: b.ink, anchor: 'middle', font: font.body, opacity: 0.5 })}
    <rect x="0" y="${h - 30}" width="${w}" height="30" fill="${b.primary}" opacity=".9"/>`)
}

const defaultLetter = (ctx: BrandContext) => [
  `${new Date().toISOString().slice(0, 10)}`,
  '',
  'Dear Customer,',
  '',
  'Thank you for your business. This letterhead is generated from your brand',
  'kit, so every colour, typeface and mark here matches your invoices, quotes',
  'and statements exactly.',
  '',
  'Replace this text with your own before printing, or export the file and',
  'use it as a template in any word processor.',
  '',
  'Kind regards,',
  '',
  ctx.name,
].join('\n')

export function complimentSlip(ctx: BrandContext): string {
  const { brand: b, company: c, font, name } = ctx
  const w = 210 * U, h = 99 * U
  return doc(210, 99, `
    <rect width="${w}" height="${h}" fill="${b.paper}"/>
    ${pattern(b.pattern, w, h, b.primary, b.accent)}
    ${mark(b.logo, 120, 90, 260, 150)}
    ${text(w - 120, 150, name, { size: 32, weight: 700, fill: b.ink, anchor: 'end', font: font.heading })}
    ${text(w - 120, 190, contactLine(c), { size: 18, fill: b.ink, anchor: 'end', font: font.body, opacity: 0.7 })}
    ${text(120, 420, 'With compliments', { size: 46, fill: b.primary, font: font.heading, weight: 600 })}
    <line x1="120" y1="470" x2="${w - 120}" y2="470" stroke="${lighten(b.primary, 0.6)}" stroke-width="2"/>
    ${text(120, 560, '.....................................................................................',
      { size: 22, fill: b.ink, font: font.body, opacity: 0.35 })}
    <rect x="0" y="${h - 16}" width="${w}" height="16" fill="${b.accent}"/>`)
}

export function envelopeDL(ctx: BrandContext): string {
  const { brand: b, company: c, font, name } = ctx
  const w = 220 * U, h = 110 * U
  return doc(220, 110, `
    <rect width="${w}" height="${h}" fill="${b.paper}"/>
    ${pattern(b.pattern, w, h, b.primary, b.accent)}
    ${mark(b.logo, 110, 90, 230, 130)}
    ${text(110, 300, name, { size: 28, weight: 700, fill: b.ink, font: font.heading })}
    ${text(110, 336, c.address || '', { size: 20, fill: b.ink, font: font.body, opacity: 0.75 })}
    ${text(110, 368, contactLine(c), { size: 18, fill: b.ink, font: font.body, opacity: 0.55 })}
    <g opacity=".5"><rect x="${w - 340}" y="80" width="230" height="170" fill="none"
      stroke="${b.ink}" stroke-width="2" stroke-dasharray="10 8"/>
      ${text(w - 225, 175, 'STAMP', { size: 20, fill: b.ink, anchor: 'middle', font: font.body, opacity: 0.5, spacing: 3 })}</g>
    ${text(w * 0.52, h - 300, 'To:', { size: 22, fill: b.ink, font: font.body, opacity: 0.6 })}
    <g opacity=".3">${[0, 1, 2, 3].map(i =>
      `<line x1="${w * 0.52}" y1="${h - 250 + i * 55}" x2="${w - 110}" y2="${h - 250 + i * 55}"
         stroke="${b.ink}" stroke-width="1.6"/>`).join('')}</g>
    <rect x="0" y="${h - 14}" width="${w}" height="14" fill="${b.primary}"/>`)
}

export function invoiceTheme(ctx: BrandContext): string {
  const { brand: b, company: c, font, name } = ctx
  const knockout = knockoutLogo(name, b.logoStyle as never, b.primary)
  const w = 210 * U, h = 148 * U     // top half of A4: the part the brand owns
  const sf = surface(b.primary, b.accent)
  const ink = sf.ink
  return doc(210, 148, `
    <rect width="${w}" height="${h}" fill="${b.paper}"/>
    <rect width="${w}" height="320" fill="${sf.from}"/>
    ${mark(knockout, 120, 80, 300, 170)}
    ${text(w - 120, 150, 'TAX INVOICE', { size: 40, weight: 800, fill: ink, anchor: 'end', font: font.heading, spacing: 3 })}
    ${text(w - 120, 200, 'INV-0001', { size: 24, fill: ink, anchor: 'end', font: font.body, opacity: 0.85 })}
    ${text(w - 120, 240, new Date().toISOString().slice(0, 10), { size: 22, fill: ink, anchor: 'end', font: font.body, opacity: 0.7 })}
    ${text(120, 420, name, { size: 30, weight: 700, fill: b.ink, font: font.heading })}
    ${text(120, 456, contactLine(c), { size: 19, fill: b.ink, font: font.body, opacity: 0.7 })}
    ${text(120, 488, legalLine(c), { size: 18, fill: b.ink, font: font.body, opacity: 0.5 })}
    <rect x="120" y="560" width="${w - 240}" height="60" fill="${lighten(b.primary, 0.88)}"/>
    ${text(140, 600, 'DESCRIPTION', { size: 20, weight: 700, fill: darken(b.primary, 0.25), font: font.body, spacing: 2 })}
    ${text(w - 140, 600, 'AMOUNT', { size: 20, weight: 700, fill: darken(b.primary, 0.25), anchor: 'end', font: font.body, spacing: 2 })}
    ${[0, 1, 2].map(i => `
      ${text(140, 680 + i * 70, ['Implementation day', 'POS terminal', 'Support retainer'][i],
        { size: 22, fill: b.ink, font: font.body, opacity: 0.85 })}
      ${text(w - 140, 680 + i * 70, ['4 500.00', '12 400.00', '1 100.00'][i],
        { size: 22, fill: b.ink, anchor: 'end', font: font.body, opacity: 0.85 })}
      <line x1="120" y1="${706 + i * 70}" x2="${w - 120}" y2="${706 + i * 70}"
        stroke="${lighten(b.primary, 0.75)}" stroke-width="1.5"/>`).join('')}
    ${text(w - 140, 960, 'TOTAL', { size: 22, weight: 700, fill: b.ink, anchor: 'end', font: font.body })}
    ${text(w - 140, 1010, '18 000.00', { size: 34, weight: 800, fill: b.primary, anchor: 'end', font: font.heading })}
    <rect x="0" y="${h - 22}" width="${w}" height="22" fill="${b.accent}"/>`)
}

export function quoteCover(ctx: BrandContext): string {
  const { brand: b, font, name } = ctx
  const w = 210 * U, h = 297 * U
  const sf = surface(b.primary, b.accent)
  const ink = sf.ink
  return doc(210, 297, `
    <defs><linearGradient id="cv" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${sf.from}"/><stop offset="1" stop-color="${sf.to}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#cv)"/>
    ${pattern(b.pattern === 'none' ? 'wave' : b.pattern, w, h, ink, ink)}
    ${mark(b.logo, 150, 200, 360, 210)}
    ${text(150, h * 0.52, 'PROPOSAL', { size: 92, weight: 800, fill: ink, font: font.heading, spacing: 6 })}
    ${text(150, h * 0.52 + 70, 'Prepared for', { size: 26, fill: ink, font: font.body, opacity: 0.8 })}
    ${text(150, h * 0.52 + 120, 'Client name', { size: 44, weight: 600, fill: ink, font: font.heading, opacity: 0.95 })}
    <line x1="150" y1="${h - 420}" x2="${w - 150}" y2="${h - 420}" stroke="${ink}" stroke-opacity=".45" stroke-width="2"/>
    ${text(150, h - 350, name, { size: 30, weight: 700, fill: ink, font: font.heading })}
    ${b.tagline ? text(150, h - 310, b.tagline, { size: 22, fill: ink, font: font.body, opacity: 0.85 }) : ''}
    ${text(150, h - 200, new Date().toISOString().slice(0, 10), { size: 22, fill: ink, font: font.body, opacity: 0.7 })}`)
}

export function socialAvatar(ctx: BrandContext): string {
  const { brand: b, font, initials } = ctx
  const s = 100 * U
  const sf = surface(b.primary, b.accent)
  const ink = sf.ink
  return doc(100, 100, `
    <defs><linearGradient id="av" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${sf.from}"/><stop offset="1" stop-color="${sf.to}"/>
    </linearGradient></defs>
    <rect width="${s}" height="${s}" fill="url(#av)"/>
    ${text(s / 2, s / 2 + 110, initials, { size: 340, weight: 800, fill: ink, anchor: 'middle', font: font.heading })}`)
}

export function socialBanner(ctx: BrandContext): string {
  const { brand: b, company: c, font, name } = ctx
  const knockout = knockoutLogo(name, b.logoStyle as never, b.primary)
  const w = 150 * U, h = 50 * U
  const sf = surface(b.primary, b.accent)
  const ink = sf.ink
  return doc(150, 50, `
    <defs><linearGradient id="bn" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${sf.from}"/><stop offset="1" stop-color="${sf.to}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#bn)"/>
    ${pattern(b.pattern === 'none' ? 'grid' : b.pattern, w, h, ink, ink)}
    ${mark(knockout, 80, 150, 300, 200)}
    ${text(430, 250, name, { size: 68, weight: 800, fill: ink, font: font.heading })}
    ${text(430, 310, b.tagline || contactLine(c), { size: 30, fill: ink, font: font.body, opacity: 0.85 })}`)
}

export function rubberStamp(ctx: BrandContext): string {
  const { brand: b, company: c, font, name } = ctx
  const s = 45 * U, r = s / 2
  return doc(45, 45, `
    <circle cx="${r}" cy="${r}" r="${r - 8}" fill="none" stroke="${b.primary}" stroke-width="10"/>
    <circle cx="${r}" cy="${r}" r="${r - 40}" fill="none" stroke="${b.primary}" stroke-width="4"/>
    <path id="arc" d="M 45 ${r} a ${r - 60} ${r - 60} 0 1 1 ${s - 90} 0" fill="none"/>
    <text font-family="${font.heading}" font-size="26" font-weight="700" fill="${b.primary}" letter-spacing="3">
      <textPath href="#arc" startOffset="50%" text-anchor="middle">${esc(name.toUpperCase())}</textPath>
    </text>
    ${text(r, r + 10, 'PAID', { size: 64, weight: 800, fill: b.primary, anchor: 'middle', font: font.heading, spacing: 4 })}
    ${text(r, r + 55, c.regNo || c.vatId || new Date().toISOString().slice(0, 10),
      { size: 20, fill: b.primary, anchor: 'middle', font: font.body })}
    ${text(r, s - 70, '...................', { size: 20, fill: b.primary, anchor: 'middle', font: font.body, opacity: 0.6 })}`)
}

export function idBadge(ctx: BrandContext): string {
  const { brand: b, font, name, initials } = ctx
  const knockout = knockoutLogo(name, b.logoStyle as never, b.primary)
  const w = 54 * U, h = 86 * U
  const sf = surface(b.primary, b.accent)
  const ink = sf.ink
  return doc(54, 86, `
    <rect width="${w}" height="${h}" rx="30" fill="${b.paper}"/>
    <rect width="${w}" height="240" rx="30" fill="${sf.from}"/>
    <rect y="180" width="${w}" height="60" fill="${sf.from}"/>
    <rect x="${w / 2 - 50}" y="40" width="100" height="26" rx="13" fill="${b.paper}" opacity=".9"/>
    ${mark(knockout, w / 2 - 70, 100, 140, 90)}
    <circle cx="${w / 2}" cy="340" r="90" fill="${lighten(b.primary, 0.82)}"/>
    ${text(w / 2, 372, initials, { size: 72, weight: 800, fill: b.primary, anchor: 'middle', font: font.heading })}
    ${text(w / 2, 500, 'Team member', { size: 26, weight: 700, fill: b.ink, anchor: 'middle', font: font.heading })}
    ${text(w / 2, 540, 'Role', { size: 22, fill: b.ink, anchor: 'middle', font: font.body, opacity: 0.6 })}
    <line x1="60" y1="600" x2="${w - 60}" y2="600" stroke="${lighten(b.primary, 0.6)}" stroke-width="2"/>
    ${text(w / 2, 660, name, { size: 22, fill: b.ink, anchor: 'middle', font: font.body, opacity: 0.8 })}
    <rect x="0" y="${h - 60}" width="${w}" height="60" fill="${sf.to}"/>
    ${text(w / 2, h - 20, 'STAFF', { size: 26, weight: 700, fill: ink, anchor: 'middle', font: font.heading, spacing: 4 })}`)
}

/* ---------------------------- the set ---------------------------- */

export function stationerySet(ctx: BrandContext): Piece[] {
  return [
    { id: 'card-front', label: 'Business card — front', w: 85, h: 55, group: 'print',
      blurb: 'Standard 85 × 55 mm. Print 10-up on A4 with crop marks.', svg: businessCardFront(ctx) },
    { id: 'card-back', label: 'Business card — back', w: 85, h: 55, group: 'print',
      blurb: 'Reverse side in full brand colour.', svg: businessCardBack(ctx) },
    { id: 'letterhead', label: 'Letterhead', w: 210, h: 297, group: 'print',
      blurb: 'A4 with editable body copy, footer and legal line.', svg: letterhead(ctx) },
    { id: 'comp-slip', label: 'Compliment slip', w: 210, h: 99, group: 'print',
      blurb: 'DL slip for deliveries and thank-you notes.', svg: complimentSlip(ctx) },
    { id: 'envelope', label: 'DL envelope', w: 220, h: 110, group: 'print',
      blurb: 'Return address, stamp box and addressee rules.', svg: envelopeDL(ctx) },
    { id: 'id-badge', label: 'Staff badge', w: 54, h: 86, group: 'print',
      blurb: 'Lanyard badge for staff and site visitors.', svg: idBadge(ctx) },
    { id: 'stamp', label: 'Rubber stamp', w: 45, h: 45, group: 'print',
      blurb: 'Circular PAID stamp artwork for a stamp maker.', svg: rubberStamp(ctx) },
    { id: 'invoice-theme', label: 'Invoice theme', w: 210, h: 148, group: 'document',
      blurb: 'How your invoices, quotes and statements will look.', svg: invoiceTheme(ctx) },
    { id: 'quote-cover', label: 'Proposal cover', w: 210, h: 297, group: 'document',
      blurb: 'A4 cover page for quotes and tenders.', svg: quoteCover(ctx) },
    { id: 'avatar', label: 'Social avatar', w: 100, h: 100, group: 'digital',
      blurb: 'Square mark for WhatsApp, Instagram and LinkedIn.', svg: socialAvatar(ctx) },
    { id: 'banner', label: 'Social banner', w: 150, h: 50, group: 'digital',
      blurb: '3:1 cover image for Facebook, LinkedIn and X.', svg: socialBanner(ctx) },
  ]
}

/** Email signature as HTML, because that is what mail clients paste. */
export function emailSignature(ctx: BrandContext): string {
  const { brand: b, company: c, font, name } = ctx
  return [
    `<table cellpadding="0" cellspacing="0" style="font-family:${font.body};font-size:13px;color:${b.ink}">`,
    '<tr>',
    b.logo ? `<td style="padding-right:14px;border-right:3px solid ${b.primary}">` +
      `<img src="${b.logo}" alt="${esc(name)}" width="64" height="64" style="display:block"></td>` : '',
    '<td style="padding-left:14px">',
    `<div style="font-family:${font.heading};font-size:16px;font-weight:700;color:${b.ink}">Your Name</div>`,
    `<div style="color:${b.primary};font-weight:600">Your role · ${esc(name)}</div>`,
    b.tagline ? `<div style="opacity:.7">${esc(b.tagline)}</div>` : '',
    '<div style="height:6px"></div>',
    c.phone ? `<div>${esc(c.phone)}</div>` : '',
    c.email ? `<div><a href="mailto:${esc(c.email)}" style="color:${b.primary};text-decoration:none">${esc(c.email)}</a></div>` : '',
    c.address ? `<div style="opacity:.7">${esc(c.address)}</div>` : '',
    '</td></tr></table>',
  ].filter(Boolean).join('')
}

/**
 * Imposition: lays business cards out 10-up on A4 with crop marks, so a user
 * with nothing but a home printer and a guillotine gets usable cards.
 */
export function cardSheet(ctx: BrandContext, side: 'front' | 'back' = 'front'): string {
  const cardW = 85 * U, cardH = 55 * U
  const cols = 2, rows = 5
  const w = 210 * U, h = 297 * U
  const gapX = (w - cols * cardW) / (cols + 1)
  const gapY = (h - rows * cardH) / (rows + 1)
  const card = side === 'front' ? businessCardFront(ctx) : businessCardBack(ctx)
  const inner = card.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')

  const cells: string[] = []
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = gapX + col * (cardW + gapX)
      const y = gapY + r * (cardH + gapY)
      cells.push(
        `<g transform="translate(${x} ${y})">${inner}</g>` +
        `<g stroke="#9ca3af" stroke-width="1">
           <line x1="${x - 30}" y1="${y}" x2="${x - 8}" y2="${y}"/>
           <line x1="${x}" y1="${y - 30}" x2="${x}" y2="${y - 8}"/>
           <line x1="${x + cardW + 8}" y1="${y + cardH}" x2="${x + cardW + 30}" y2="${y + cardH}"/>
           <line x1="${x + cardW}" y1="${y + cardH + 8}" x2="${x + cardW}" y2="${y + cardH + 30}"/>
         </g>`)
    }
  }
  return doc(210, 297, `<rect width="${w}" height="${h}" fill="#ffffff"/>${cells.join('')}`)
}

/* ---------------------------- export ---------------------------- */

export const svgBlobUrl = (svg: string) =>
  URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))

export function downloadSVG(svg: string, filename: string) {
  const url = svgBlobUrl(svg)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.svg') ? filename : `${filename}.svg`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Rasterises to PNG at print resolution, entirely in the browser. */
export async function svgToPNG(svg: string, wmm: number, hmm: number, dpi = 300): Promise<Blob> {
  const px = (mm: number) => Math.round((mm / 25.4) * dpi)
  const img = new Image()
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('could not rasterise'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  canvas.width = px(wmm); canvas.height = px(hmm)
  const g = canvas.getContext('2d')
  if (!g) throw new Error('no 2d context')
  g.drawImage(img, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png'))
}

export const fileNameFor = (company: string, piece: string) =>
  `${(company || 'nova').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${piece}`
