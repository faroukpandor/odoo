import { useMemo, useState } from 'react'
import { useDB, update, uid, money, Channel, ChannelKind, Coupon } from '../lib/db'
import {
  PROVIDERS, CHANNEL_GROUPS, providerOf, newChannel, tendersFor, liveChannels,
  searchProviders, recommendedProviders, validateAccount, countryName,
  servesCountry, ProviderSpec,
} from '../lib/tender'
import QR from '../components/QR'
import { useToast } from '../lib/ui'

const KIND_LABEL: Record<ChannelKind, string> = {
  card: 'Cards & wallets', mobile: 'Mobile money', crypto: 'Crypto',
  bank: 'Bank transfer', cash: 'Cash', voucher: 'Vouchers',
}

export default function Channels() {
  const db = useDB()
  const [tab, setTab] = useState<'connected' | 'browse' | 'coupons' | 'preview'>('connected')
  const [editing, setEditing] = useState<Channel | null>(null)

  const live = liveChannels(db)
  const country = db.company.country || 'BW'

  function connect(providerKey: string) {
    const existing = db.channels.find(c => c.provider === providerKey)
    if (existing) { setEditing(existing); setTab('connected'); return }
    const c: Channel = { ...newChannel(providerKey), id: uid(), enabled: false }
    update(d => { d.channels.push(c) })
    setEditing(c)
    setTab('connected')
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Payment channels</h1>
          <p className="sub">
            {PROVIDERS.length} ways to get paid — cards, mobile money, crypto, instant bank rails,
            cash and vouchers. Every provider is free to join and pays you directly.
          </p>
        </div>
      </header>

      <div className="kpis">
        <Kpi label="Live channels" value={String(live.length)} tone={live.length ? 'ok' : 'warn'} />
        <Kpi label="Configured" value={String(db.channels.length)} />
        <Kpi label="Catalogue" value={String(PROVIDERS.length)} tone="brand" />
        <Kpi label="Available in" value={countryName(country)} />
        <Kpi label="Platform fee" value="0%" tone="ok" />
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'connected' ? ' on' : '')} onClick={() => setTab('connected')}>
          Your channels{db.channels.length ? ` · ${db.channels.length}` : ''}
        </button>
        <button className={'tab' + (tab === 'browse' ? ' on' : '')} onClick={() => setTab('browse')}>
          Browse catalogue
        </button>
        <button className={'tab' + (tab === 'coupons' ? ' on' : '')} onClick={() => setTab('coupons')}>
          Coupons & vouchers
        </button>
        <button className={'tab' + (tab === 'preview' ? ' on' : '')} onClick={() => setTab('preview')}>
          Customer preview
        </button>
      </div>

      {tab === 'connected' && <Connected onBrowse={() => setTab('browse')} editing={editing} setEditing={setEditing} />}
      {tab === 'browse' && <Browse onConnect={connect} />}
      {tab === 'coupons' && <Coupons />}
      {tab === 'preview' && <PreviewPane />}

      {tab === 'connected' && db.channels.length === 0 && (
        <p className="note warn">
          No channel yet. Open <b>Browse catalogue</b> — we have already picked the best rails for{' '}
          {countryName(country)}.
        </p>
      )}
      {live.length > 0 && tab !== 'preview' && (
        <p className="note ok">
          {live.length} channel{live.length > 1 ? 's are' : ' is'} live: every invoice now carries a
          pay link and a scannable QR code.
        </p>
      )}
    </>
  )
}

/* ---------- your channels ---------- */

function Connected({ onBrowse, editing, setEditing }: {
  onBrowse: () => void
  editing: Channel | null
  setEditing: (c: Channel | null) => void
}) {
  const db = useDB()
  const toast = useToast()

  const patch = (id: string, p: Partial<Channel>) =>
    update(d => { const c = d.channels.find(x => x.id === id); if (c) Object.assign(c, p) })

  const move = (id: string, dir: -1 | 1) => update(d => {
    const i = d.channels.findIndex(c => c.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= d.channels.length) return
    const [c] = d.channels.splice(i, 1)
    d.channels.splice(j, 0, c)
  })

  const remove = (id: string) => {
    update(d => { d.channels = d.channels.filter(c => c.id !== id) })
    setEditing(null)
    toast('Channel removed')
  }

  if (db.channels.length === 0) {
    return (
      <section className="card empty">
        <h2>Pick how you want to be paid</h2>
        <p className="muted">Connect a card link, a mobile-money number, a wallet address or your bank details.</p>
        <button className="btn primary" onClick={onBrowse}>Browse the catalogue</button>
      </section>
    )
  }

  return (
    <div className="chan-list">
      {db.channels.map((c, i) => {
        const spec = providerOf(c.provider)
        const check = validateAccount(spec, c.account)
        const open = editing?.id === c.id
        return (
          <article key={c.id} className={'chan-card' + (c.enabled && check.ok ? ' live' : '')}>
            <header>
              <span className="mod-ico">{spec?.mark ?? '•'}</span>
              <div className="grow">
                <b>{c.label}</b>
                <div className="muted small">
                  {spec ? KIND_LABEL[spec.kind] : c.kind} · {spec?.fee} · settles {spec?.settlement}
                </div>
              </div>
              <span className={'badge ' + (!check.ok ? 'overdue' : c.enabled ? 'paid' : 'draft')}>
                {!check.ok ? 'needs setup' : c.enabled ? 'live' : 'paused'}
              </span>
            </header>

            <div className="chan-row">
              <label className="check">
                <input type="checkbox" checked={c.enabled} onChange={e => patch(c.id, { enabled: e.target.checked })} />
                Show on invoices
              </label>
              <span className="grow" />
              <button className="btn tiny" onClick={() => move(c.id, -1)} disabled={i === 0} title="Show earlier">↑</button>
              <button className="btn tiny" onClick={() => move(c.id, 1)} disabled={i === db.channels.length - 1} title="Show later">↓</button>
              <button className="btn tiny" onClick={() => setEditing(open ? null : c)}>{open ? 'Done' : 'Configure'}</button>
              <button className="btn tiny danger" onClick={() => remove(c.id)}>Remove</button>
            </div>

            {!check.ok && <p className="note warn">{check.message}</p>}

            {open && spec && (
              <div className="form tight">
                <label>Label shown to customers
                  <input value={c.label} onChange={e => patch(c.id, { label: e.target.value })} />
                </label>
                <label>{spec.accountLabel}
                  <input value={c.account} placeholder={spec.accountHint}
                    onChange={e => patch(c.id, { account: e.target.value })} />
                </label>
                <label>Extra instruction (optional)
                  <input value={c.detail} placeholder="Branch code, memo, reference format…"
                    onChange={e => patch(c.id, { detail: e.target.value })} />
                </label>
                {spec.kind === 'crypto' && (
                  <label>Your posted rate — 1 coin in {db.company.currency}
                    <input type="number" step="0.01" value={c.rate}
                      onChange={e => patch(c.id, { rate: parseFloat(e.target.value) || 0 })} />
                  </label>
                )}
                <p className="muted small wide">
                  {spec.note}
                  {spec.signup && <> · <a className="link" href={spec.signup} target="_blank" rel="noreferrer">free signup ↗</a></>}
                </p>
              </div>
            )}
          </article>
        )
      })}
      <button className="btn" onClick={onBrowse}>+ Add another channel</button>
    </div>
  )
}

/* ---------- catalogue browser ---------- */

function Browse({ onConnect }: { onConnect: (key: string) => void }) {
  const db = useDB()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<ChannelKind | 'all'>('all')
  const [localOnly, setLocalOnly] = useState(true)
  const country = db.company.country || 'BW'

  const results = useMemo(
    () => searchProviders(q, { kind, country, localOnly }),
    [q, kind, localOnly, country],
  )
  const recommended = useMemo(
    () => recommendedProviders(country, db.company.currency),
    [country, db.company.currency],
  )
  const connected = new Set(db.channels.map(c => c.provider))

  return (
    <>
      <section className="card">
        <h2>Recommended for {countryName(country)}</h2>
        <p className="muted small">Local rails first — they are usually the cheapest and the ones your customers already use.</p>
        <div className="prov-grid">
          {recommended.map(s => (
            <ProviderCard key={s.key} spec={s} connected={connected.has(s.key)} onConnect={onConnect} country={country} />
          ))}
        </div>
      </section>

      <div className="filters">
        <input className="search grow" placeholder={`Search ${PROVIDERS.length} providers…`}
          value={q} onChange={e => setQ(e.target.value)} />
        <select value={kind} onChange={e => setKind(e.target.value as ChannelKind | 'all')}>
          <option value="all">All types</option>
          {CHANNEL_GROUPS.map(g => <option key={g.kind} value={g.kind}>{g.title}</option>)}
        </select>
        <label className="check">
          <input type="checkbox" checked={localOnly} onChange={e => setLocalOnly(e.target.checked)} />
          Available in {countryName(country)}
        </label>
      </div>

      <div className="prov-grid">
        {results.map(s => (
          <ProviderCard key={s.key} spec={s} connected={connected.has(s.key)} onConnect={onConnect} country={country} />
        ))}
        {results.length === 0 && <p className="muted">Nothing matches that search.</p>}
      </div>
    </>
  )
}

function ProviderCard({ spec, connected, onConnect, country }: {
  spec: ProviderSpec; connected: boolean; onConnect: (k: string) => void; country: string
}) {
  return (
    <article className={'prov' + (connected ? ' on' : '')}>
      <header>
        <span className="mod-ico">{spec.mark}</span>
        <div>
          <b>{spec.short}</b>
          <div className="muted small">{KIND_LABEL[spec.kind]}</div>
        </div>
      </header>
      <p className="muted small">{spec.note}</p>
      <ul className="facts">
        <li><span>Fee</span><b>{spec.fee}</b></li>
        <li><span>Settles</span><b>{spec.settlement}</b></li>
        <li><span>Reach</span><b>{spec.regions.includes('*') ? 'Worldwide' : spec.regions.slice(0, 4).join(', ') + (spec.regions.length > 4 ? '…' : '')}</b></li>
      </ul>
      <div className="chips">
        {spec.features.map(f => <span key={f} className="chip">{f}</span>)}
        {servesCountry(spec, country) && <span className="chip local">available here</span>}
      </div>
      <button className={'btn tiny ' + (connected ? '' : 'primary')} onClick={() => onConnect(spec.key)}>
        {connected ? 'Configure' : 'Connect'}
      </button>
    </article>
  )
}

/* ---------- preview ---------- */

function PreviewPane() {
  const db = useDB()
  const [amount, setAmount] = useState(1250)
  const tenders = tendersFor(db, amount, db.company.currency, 'INV-PREVIEW')
  return (
    <section className="card">
      <h2>What the customer sees</h2>
      <div className="filters">
        <label className="check">Amount
          <input type="number" className="num" value={amount}
            onChange={e => setAmount(parseFloat(e.target.value) || 0)} />
        </label>
        <span className="muted small">Reference INV-PREVIEW · {money(amount)}</span>
      </div>
      <div className="pay-grid">
        {tenders.map(t => (
          <div key={t.channel.id} className="pay-card">
            <b>{t.channel.label}</b>
            <p className="muted small">{t.text}</p>
            {t.qr && <QR value={t.uri} size={130} label="Scan to pay" />}
            {t.uri && <a className="btn tiny" href={t.uri} target="_blank" rel="noreferrer">
              {t.uri.startsWith('tel:') ? 'Dial' : 'Open link'}
            </a>}
          </div>
        ))}
        {tenders.length === 0 && <p className="muted">No live channel yet — connect one to see this.</p>}
      </div>
    </section>
  )
}

/* ---------- coupons ---------- */

function Coupons() {
  const db = useDB()
  const toast = useToast()
  const [c, setC] = useState<Coupon>({ code: '', kind: 'percent', value: 10, expires: '', limit: 0, used: 0 })

  function save() {
    if (!c.code.trim()) { toast('Give the coupon a code'); return }
    update(d => {
      const i = d.coupons.findIndex(x => x.code.toLowerCase() === c.code.toLowerCase())
      if (i >= 0) d.coupons[i] = c; else d.coupons.push(c)
    })
    toast(`Coupon ${c.code} saved`)
    setC({ code: '', kind: 'percent', value: 10, expires: '', limit: 0, used: 0 })
  }

  return (
    <section className="card">
      <h2>Coupons & vouchers</h2>
      <p className="muted small">
        Redeemed inside any quote or invoice — the discount posts as a real line, so tax and the ledger stay correct.
      </p>
      <div className="scroll-x">
        <table className="table">
          <thead><tr><th>Code</th><th>Type</th><th className="r">Value</th><th>Expires</th><th className="r">Used</th><th></th></tr></thead>
          <tbody>
            {db.coupons.map(x => (
              <tr key={x.code}>
                <td><b>{x.code}</b></td>
                <td>{x.kind === 'percent' ? 'Percentage' : 'Fixed amount'}</td>
                <td className="r">{x.kind === 'percent' ? `${x.value}%` : money(x.value)}</td>
                <td>{x.expires || 'never'}</td>
                <td className="r">{x.used}{x.limit ? ` / ${x.limit}` : ''}</td>
                <td className="r"><button className="btn tiny danger"
                  onClick={() => update(d => { d.coupons = d.coupons.filter(y => y.code !== x.code) })}>Delete</button></td>
              </tr>
            ))}
            {db.coupons.length === 0 && <tr><td colSpan={6} className="muted">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="form">
        <label>Code<input value={c.code} onChange={e => setC({ ...c, code: e.target.value.toUpperCase() })} /></label>
        <label>Type
          <select value={c.kind} onChange={e => setC({ ...c, kind: e.target.value as Coupon['kind'] })}>
            <option value="percent">Percentage</option><option value="fixed">Fixed amount</option>
          </select>
        </label>
        <label>Value<input type="number" step="0.01" value={c.value}
          onChange={e => setC({ ...c, value: parseFloat(e.target.value) || 0 })} /></label>
        <label>Expires<input type="date" value={c.expires} onChange={e => setC({ ...c, expires: e.target.value })} /></label>
        <label>Usage limit (0 = unlimited)<input type="number" value={c.limit}
          onChange={e => setC({ ...c, limit: parseInt(e.target.value) || 0 })} /></label>
        <div className="form-actions wide"><button className="btn primary" onClick={save}>Save coupon</button></div>
      </div>
    </section>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={'kpi ' + (tone || '')}><span>{label}</span><strong>{value}</strong></div>
}
