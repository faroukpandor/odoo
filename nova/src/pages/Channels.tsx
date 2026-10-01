import { useState } from 'react'
import { useDB, update, uid, money, Channel, Coupon } from '../lib/db'
import {
  PROVIDERS, CHANNEL_GROUPS, providerOf, channelsByKind, newChannel,
  tendersFor, canAcceptOnline,
} from '../lib/tender'
import QR from '../components/QR'
import { useToast } from '../lib/ui'

/**
 * Where the merchant plugs in how they want to be paid. Nova stores nothing
 * sensitive — only public identifiers (a payment-link URL, a till number, a
 * wallet address) that already appear on an invoice.
 */
export default function Channels() {
  const db = useDB()
  const toast = useToast()
  const [tab, setTab] = useState<'channels' | 'coupons' | 'test'>('channels')

  const patch = (id: string, p: Partial<Channel>) =>
    update(d => { const c = d.channels.find(x => x.id === id); if (c) Object.assign(c, p) })

  const add = (provider: string) => {
    update(d => { d.channels.push({ ...newChannel(provider), id: uid() }) })
    toast(`${providerOf(provider)?.name} added — paste your details to activate`)
  }

  const remove = (id: string) => update(d => { d.channels = d.channels.filter(c => c.id !== id) })

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Payment channels</h1>
          <p className="sub">
            Cards, mobile money, crypto, bank transfer, cash and vouchers. Every provider here is
            free to join; money goes straight to your own account.
          </p>
        </div>
      </header>

      <p className={'note ' + (canAcceptOnline(db) ? 'ok' : 'warn')}>
        {canAcceptOnline(db)
          ? 'Online payment is live: invoices now carry a pay link and a scannable QR code.'
          : 'Add a card link, mobile-money number or wallet address to put a "pay now" QR on every invoice.'}
      </p>

      <div className="tabs">
        <button className={'tab' + (tab === 'channels' ? ' on' : '')} onClick={() => setTab('channels')}>Channels</button>
        <button className={'tab' + (tab === 'coupons' ? ' on' : '')} onClick={() => setTab('coupons')}>Coupons & vouchers</button>
        <button className={'tab' + (tab === 'test' ? ' on' : '')} onClick={() => setTab('test')}>Preview</button>
      </div>

      {tab === 'channels' && CHANNEL_GROUPS.map(g => (
        <section key={g.kind} className="card">
          <h2>{g.title}</h2>
          <p className="muted small">{g.blurb}</p>

          {channelsByKind(db, g.kind).map(c => {
            const spec = providerOf(c.provider)
            return (
              <div key={c.id} className="chan">
                <label className="check">
                  <input type="checkbox" checked={c.enabled} onChange={e => patch(c.id, { enabled: e.target.checked })} />
                  <b>{c.label}</b>
                </label>
                <input className="grow" value={c.account} placeholder={spec?.accountHint}
                  onChange={e => patch(c.id, { account: e.target.value })} />
                <input className="grow" value={c.detail} placeholder="Reference / branch / memo (optional)"
                  onChange={e => patch(c.id, { detail: e.target.value })} />
                {g.kind === 'crypto' && (
                  <input type="number" step="0.01" className="num" value={c.rate} placeholder="rate"
                    title={`Value of 1 coin in ${db.company.currency}`}
                    onChange={e => patch(c.id, { rate: parseFloat(e.target.value) || 0 })} />
                )}
                <button className="btn tiny danger" onClick={() => remove(c.id)}>Remove</button>
                {spec && <p className="muted small wide">{spec.accountLabel} · {spec.note}
                  {spec.signup && <> · <a className="link" href={spec.signup} target="_blank" rel="noreferrer">free signup</a></>}</p>}
              </div>
            )
          })}

          <div className="addrow">
            <select defaultValue="" onChange={e => { if (e.target.value) { add(e.target.value); e.target.value = '' } }}>
              <option value="">+ Add {g.title.toLowerCase()} provider…</option>
              {PROVIDERS.filter(p => p.kind === g.kind).map(p => (
                <option key={p.key} value={p.key}>{p.name}</option>
              ))}
            </select>
          </div>
        </section>
      ))}

      {tab === 'coupons' && <Coupons />}

      {tab === 'test' && (
        <section className="card">
          <h2>What the customer sees</h2>
          <p className="muted small">Preview for an invoice of {money(1250)} · reference INV-PREVIEW.</p>
          <div className="pay-grid">
            {tendersFor(db, 1250, db.company.currency, 'INV-PREVIEW').map(t => (
              <div key={t.channel.id} className="pay-card">
                <b>{t.channel.label}</b>
                <p className="muted small">{t.text}</p>
                {t.qr && <QR value={t.uri} size={130} label="Scan to pay" />}
              </div>
            ))}
            {tendersFor(db, 1250, db.company.currency, 'INV-PREVIEW').length === 0 &&
              <p className="muted">No channel is configured yet.</p>}
          </div>
        </section>
      )}
    </>
  )
}

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
      <p className="muted small">Redeemed inside any quote or invoice — the discount posts as a real line, so tax and the ledger stay correct.</p>
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
