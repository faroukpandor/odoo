import { useMemo, useState } from 'react'
import { useDB, update } from '../lib/db'
import {
  Brand as Kit, FONTS, PATTERNS, Pattern, defaultBrand, brandContext,
  withPalette, withStyle, contrast, paletteById,
} from '../lib/brand'
import { PALETTES, STYLES, LogoStyle, logoSVG, svgDataUrl } from '../lib/logo'
import {
  stationerySet, emailSignature, cardSheet, downloadSVG, svgToPNG, fileNameFor, Piece,
} from '../lib/stationery'
import { useToast } from '../lib/ui'
import { can } from '../lib/team'

type Tab = 'kit' | 'print' | 'document' | 'digital' | 'email'

/**
 * Brand studio — a full stationery house in a page that works offline.
 *
 * One brand object drives every piece, so the identity cannot drift: change a
 * colour and the cards, letterhead, envelope, badge, stamp, proposal cover,
 * avatar, banner, email signature and your actual invoices all move together.
 */
export default function Brand() {
  const db = useDB()
  const toast = useToast()
  const mayEdit = can(db, 'settings.write')
  const name = db.company.name || 'Your Company'
  const [kit, setKit] = useState<Kit>(() => (db.company.brand as Kit | undefined) ?? defaultBrand(db.company))
  const [tab, setTab] = useState<Tab>('kit')
  const [busy, setBusy] = useState('')

  const ctx = useMemo(() => brandContext(db.company, kit), [db.company, kit])
  const pieces = useMemo(() => stationerySet(ctx), [ctx])
  const signature = useMemo(() => emailSignature(ctx), [ctx])

  const dirty = JSON.stringify(kit) !== JSON.stringify(db.company.brand ?? {})

  function apply() {
    update(d => {
      d.company.brand = kit
      d.company.logo = kit.logo        // documents follow the brand mark
    })
    toast('Brand applied — invoices, quotes and statements now match')
  }

  async function png(piece: Piece) {
    setBusy(piece.id)
    try {
      const blob = await svgToPNG(piece.svg, piece.w, piece.h)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${fileNameFor(name, piece.id)}@300dpi.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      toast(`${piece.label} exported at 300 dpi`)
    } catch {
      toast('This browser could not rasterise it — the SVG download is lossless anyway', 'bad')
    }
    setBusy('')
  }

  const shown = pieces.filter(p => p.group === tab)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Brand studio</h1>
          <p className="sub">
            Logo, business cards, letterhead, envelopes, badges, stamps, proposal covers,
            social art and your invoice theme — all generated from one brand kit, on this
            device, at real print sizes. No designer, no subscription, no licence.
          </p>
        </div>
        <div className="nowrap">
          <button className="btn" onClick={() => setKit(defaultBrand({ name, logo: '' }))}>Surprise me</button>
          <button className="btn primary" disabled={!mayEdit || !dirty} onClick={apply}>
            {dirty ? 'Apply to my documents' : 'Applied'}
          </button>
        </div>
      </header>

      <div className="tabs">
        {([['kit', 'Brand kit'], ['print', 'Print stationery'], ['document', 'Documents'],
          ['digital', 'Digital'], ['email', 'Email signature']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'kit' && (
        <section className="card">
          <h2>Your brand kit</h2>

          <h3 className="section-title">Mark</h3>
          <div className="logo-grid">
            {STYLES.map(s => {
              const svg = logoSVG(name, s.id as LogoStyle, paletteById(kit.paletteId))
              return (
                <button key={s.id} className={'logo-option' + (kit.logoStyle === s.id ? ' on' : '')}
                  onClick={() => setKit(withStyle(kit, s.id as LogoStyle, name))}>
                  <img src={svgDataUrl(svg)} alt="" />
                  <span className="muted small">{s.label}</span>
                </button>
              )
            })}
          </div>

          <h3 className="section-title">Colour</h3>
          <div className="swatches">
            {PALETTES.map(p => (
              <button key={p.id} className={'swatch' + (kit.paletteId === p.id ? ' on' : '')}
                title={p.id} aria-label={p.id}
                style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                onClick={() => setKit(withPalette(kit, p.id, name))} />
            ))}
          </div>
          <p className="muted small">
            Contrast of white text on your primary colour: {contrast('#ffffff', kit.primary).toFixed(1)}:1
            {contrast('#ffffff', kit.primary) >= 4.5
              ? ' — passes WCAG AA, so your stationery stays readable.'
              : ' — low, so dark text is used on light fills automatically.'}
          </p>

          <h3 className="section-title">Typeface pairing</h3>
          <div className="pick-grid">
            {FONTS.map(f => (
              <button key={f.id} className={'pick' + (kit.fontId === f.id ? ' on' : '')}
                onClick={() => setKit({ ...kit, fontId: f.id })}>
                <b style={{ fontFamily: f.heading }}>{f.label}</b>
                <span className="muted small">{f.mood}</span>
              </button>
            ))}
          </div>

          <h3 className="section-title">Pattern</h3>
          <div className="pick-grid tight">
            {PATTERNS.map(p => (
              <button key={p.id} className={'pick' + (kit.pattern === p.id ? ' on' : '')}
                onClick={() => setKit({ ...kit, pattern: p.id as Pattern })}><b>{p.label}</b></button>
            ))}
          </div>

          <div className="form">
            <label className="wide">Tagline (optional)
              <input value={kit.tagline} maxLength={60} placeholder="Fresh produce, delivered before dawn"
                onChange={e => setKit({ ...kit, tagline: e.target.value })} />
            </label>
            <label>Ink
              <input type="color" value={kit.ink} onChange={e => setKit({ ...kit, ink: e.target.value })} />
            </label>
            <label>Paper
              <input type="color" value={kit.paper} onChange={e => setKit({ ...kit, paper: e.target.value })} />
            </label>
          </div>
        </section>
      )}

      {tab !== 'kit' && tab !== 'email' && (
        <div className="piece-grid">
          {shown.map(p => (
            <section className="card piece" key={p.id}>
              <div className="piece-head">
                <div>
                  <h2>{p.label}</h2>
                  <p className="muted small">{p.blurb} · {p.w} × {p.h} mm</p>
                </div>
              </div>
              <div className="piece-canvas" style={{ aspectRatio: `${p.w} / ${p.h}` }}
                dangerouslySetInnerHTML={{ __html: p.svg }} />
              <div className="form-actions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                <button className="btn tiny" onClick={() => downloadSVG(p.svg, fileNameFor(name, p.id))}>
                  Download SVG
                </button>
                <button className="btn tiny" disabled={busy === p.id} onClick={() => void png(p)}>
                  {busy === p.id ? 'Rendering…' : 'PNG 300 dpi'}
                </button>
                <button className="btn tiny" onClick={() => printPiece(p.svg)}>Print</button>
                {p.id.startsWith('card') && (
                  <button className="btn tiny" onClick={() =>
                    printPiece(cardSheet(ctx, p.id === 'card-back' ? 'back' : 'front'))}>
                    Print 10-up sheet
                  </button>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'email' && (
        <section className="card">
          <h2>Email signature</h2>
          <p className="muted">
            Paste this straight into Gmail, Outlook or Apple Mail. The mark is embedded,
            so it survives forwarding without hotlinking an image on someone else's server.
          </p>
          <div className="sig-preview" dangerouslySetInnerHTML={{ __html: signature }} />
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={() => {
              void navigator.clipboard?.writeText(signature)
              toast('HTML copied — paste into your mail client')
            }}>Copy HTML</button>
            <button className="btn" onClick={() => {
              const w = window.open('', '_blank')
              if (w) { w.document.write(signature); w.document.close() }
            }}>Open as rich text</button>
          </div>
          <details className="code-details">
            <summary className="muted small">Show the HTML</summary>
            <pre className="code-block">{signature}</pre>
          </details>
        </section>
      )}
    </>
  )
}

/** Prints one piece on its own, at its true size, without the app around it. */
function printPiece(svg: string) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(
    `<!doctype html><title>Print</title>` +
    `<style>@page{margin:0}body{margin:0;display:grid;place-items:center}svg{max-width:100%}</style>` +
    svg)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 250)
}
