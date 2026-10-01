import { useState } from 'react'
import {
  useDB, update, uid, today, money, invoiceTotals, nextInvoiceNumber, docTitle,
  balanceDue, paidAmount, Invoice, InvoiceLine, Payment, getDB,
} from '../lib/db'
import { invoiceStatus } from '../lib/payments'
import { tendersFor, paymentInstructions, applyCoupon } from '../lib/tender'
import { shareText, whatsappLink, mailtoLink } from '../lib/share'
import QR from '../components/QR'
import { Modal } from './CRM'
import { useToast } from '../lib/ui'

const addDays = (d: string, n: number) => {
  const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10)
}

type View = { inv: Invoice; as: 'document' | 'delivery' }

export default function Invoices() {
  const db = useDB()
  const toast = useToast()
  const [tab, setTab] = useState<'invoice' | 'quote'>('invoice')
  const [edit, setEdit] = useState<Invoice | null>(null)
  const [view, setView] = useState<View | null>(null)

  const blank = (kind: Invoice['kind']): Invoice => ({
    id: '', kind, number: nextInvoiceNumber(getDB(), kind), partnerId: db.partners[0]?.id ?? null,
    date: today(), dueDate: addDays(today(), kind === 'quote' ? 14 : 30), status: 'draft',
    currency: db.company.currency, note: '',
    lines: [{ productId: null, label: '', qty: 1, price: 0, taxRate: db.company.taxRate }],
  })

  function save(inv: Invoice) {
    update(d => {
      if (inv.id) {
        const i = d.invoices.findIndex(x => x.id === inv.id)
        if (i >= 0) d.invoices[i] = inv
      } else {
        const created = { ...inv, id: uid() }
        d.invoices.unshift(created)
        // Quotes reserve nothing: only real sales documents move stock.
        if (created.kind !== 'quote') {
          created.lines.forEach(l => {
            if (l.productId) d.moves.push({
              id: uid(), productId: l.productId, qty: l.qty, kind: 'out',
              ref: created.number, date: created.date,
            })
          })
        }
      }
    })
    toast(inv.id ? `${inv.number} updated` : `${inv.number} created`)
    setEdit(null)
  }

  const send = (id: string) => {
    update(d => { const i = d.invoices.find(x => x.id === id); if (i) i.status = 'sent' })
    toast('Marked sent')
  }

  /** Accepted quote becomes a tax invoice, keeping the audit trail in the note. */
  function convert(q: Invoice) {
    update(d => {
      const number = nextInvoiceNumber(d, 'invoice')
      const inv: Invoice = {
        ...q, id: uid(), kind: 'invoice', number, status: 'sent',
        date: today(), dueDate: addDays(today(), 30),
        note: [q.note, `Converted from quotation ${q.number}`].filter(Boolean).join(' · '),
      }
      d.invoices.unshift(inv)
      inv.lines.forEach(l => {
        if (l.productId) d.moves.push({
          id: uid(), productId: l.productId, qty: l.qty, kind: 'out', ref: number, date: inv.date,
        })
      })
      const src = d.invoices.find(x => x.id === q.id)
      if (src) src.status = 'paid' // quote closed as won
    })
    toast(`${q.number} converted to an invoice`)
    setTab('invoice')
  }

  const deliver = (inv: Invoice) => {
    update(d => { const i = d.invoices.find(x => x.id === inv.id); if (i) i.deliveredAt = today() })
    toast('Delivery recorded')
  }

  /** One-click settlement: records a real payment for the outstanding balance. */
  function settle(inv: Invoice) {
    const due = balanceDue(db, 'invoice', inv.id, invoiceTotals(inv).total)
    const p: Payment = {
      id: uid(), date: today(), kind: 'in', partnerId: inv.partnerId,
      docType: 'invoice', docId: inv.id, amount: due, method: 'bank',
      ref: inv.number, reconciled: false, statementLineId: null,
    }
    update(d => {
      d.payments.unshift(p)
      const i = d.invoices.find(x => x.id === inv.id)
      if (i && i.status === 'draft') i.status = 'sent'
    })
    toast(`${money(due)} received against ${inv.number}`)
  }

  const rows = db.invoices.filter(i => (tab === 'quote' ? i.kind === 'quote' : i.kind !== 'quote'))

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Invoicing</h1>
          <p className="sub">
            Quote, invoice, deliver and get paid — printable, shareable and payable by card,
            mobile money or crypto.
          </p>
        </div>
        <div className="nowrap">
          <button className="btn" onClick={() => setEdit(blank('quote'))}>+ Quotation</button>
          <button className="btn primary" onClick={() => setEdit(blank('invoice'))}>+ Invoice</button>
        </div>
      </header>

      <div className="tabs">
        <button className={'tab' + (tab === 'invoice' ? ' on' : '')} onClick={() => setTab('invoice')}>
          Invoices
        </button>
        <button className={'tab' + (tab === 'quote' ? ' on' : '')} onClick={() => setTab('quote')}>
          Quotations
        </button>
      </div>

      <div className="scroll-x">
        <table className="table">
          <thead><tr>
            <th>Number</th><th>Customer</th><th>Date</th><th>{tab === 'quote' ? 'Valid to' : 'Due date'}</th>
            <th className="r">Total</th>
            {tab === 'invoice' && <><th className="r">Paid</th><th className="r">Balance</th></>}
            <th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {rows.map(i => {
              const p = db.partners.find(x => x.id === i.partnerId)
              const total = invoiceTotals(i).total
              const st = invoiceStatus(db, i)
              const due = balanceDue(db, 'invoice', i.id, total)
              return (
                <tr key={i.id}>
                  <td><b>{i.number}</b>{i.deliveredAt && <span className="badge paid">delivered</span>}</td>
                  <td>{p?.name ?? '—'}</td>
                  <td>{i.date}</td>
                  <td>{i.dueDate}</td>
                  <td className="r">{money(total, i.currency)}</td>
                  {tab === 'invoice' && <>
                    <td className="r muted">{money(paidAmount(db, 'invoice', i.id), i.currency)}</td>
                    <td className={'r ' + (due > 0.005 ? 'warn' : 'ok')}>{money(due, i.currency)}</td>
                  </>}
                  <td><span className={'badge ' + st}>{tab === 'quote' && st === 'paid' ? 'accepted' : st}</span></td>
                  <td className="r nowrap">
                    <button className="btn tiny" onClick={() => setView({ inv: i, as: 'document' })}>View</button>
                    <button className="btn tiny" onClick={() => setEdit(i)}>Edit</button>
                    {i.kind === 'quote' ? (
                      <button className="btn tiny ok" onClick={() => convert(i)}>Convert</button>
                    ) : (
                      <>
                        {i.status === 'draft' && <button className="btn tiny" onClick={() => send(i.id)}>Send</button>}
                        {!i.deliveredAt && <button className="btn tiny" onClick={() => deliver(i)}>Deliver</button>}
                        <button className="btn tiny" onClick={() => setView({ inv: i, as: 'delivery' })}>Note</button>
                        {st !== 'paid' && <button className="btn tiny ok" onClick={() => settle(i)}>Payment</button>}
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 &&
              <tr><td colSpan={9} className="muted">Nothing here yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && <Editor inv={edit} setInv={setEdit} onSave={save} />}
      {view && <Preview view={view} onClose={() => setView(null)} />}
    </>
  )
}

function Editor({ inv, setInv, onSave }: {
  inv: Invoice; setInv: (i: Invoice | null) => void; onSave: (i: Invoice) => void
}) {
  const db = useDB()
  const toast = useToast()
  const [code, setCode] = useState(inv.coupon ?? '')
  const t = invoiceTotals(inv)

  const setLine = (idx: number, patch: Partial<InvoiceLine>) => {
    const lines = inv.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    setInv({ ...inv, lines })
  }

  const pickProduct = (idx: number, pid: string) => {
    const p = db.products.find(x => x.id === pid)
    setLine(idx, p ? { productId: p.id, label: p.name, price: p.price } : { productId: null })
  }

  /** Coupons are applied as a real negative line, so tax and the ledger stay correct. */
  function redeem() {
    const net = inv.lines.filter(l => l.price > 0).reduce((s, l) => s + l.qty * l.price, 0)
    const res = applyCoupon(db, code, net, inv.date)
    if (!res.ok) { toast(res.reason || 'Coupon rejected'); return }
    const lines = inv.lines.filter(l => !l.label.startsWith('Discount ('))
    lines.push({
      productId: null, label: `Discount (${res.coupon!.code})`, qty: 1,
      price: -res.discount, taxRate: db.company.taxRate,
    })
    setInv({ ...inv, lines, coupon: res.coupon!.code })
    toast(`${money(res.discount)} discount applied`)
  }

  const title = inv.kind === 'quote' ? 'quotation' : inv.kind === 'proforma' ? 'pro-forma' : 'invoice'

  return (
    <Modal title={inv.id ? `Edit ${inv.number}` : `New ${title}`} onClose={() => setInv(null)}>
      <form className="form" onSubmit={e => { e.preventDefault(); onSave(inv) }}>
        <label>Document
          <select value={inv.kind} onChange={e => setInv({ ...inv, kind: e.target.value as Invoice['kind'] })}>
            <option value="quote">Quotation</option>
            <option value="proforma">Pro-forma invoice</option>
            <option value="invoice">Tax invoice</option>
          </select>
        </label>
        <label>Number<input value={inv.number} onChange={e => setInv({ ...inv, number: e.target.value })} /></label>
        <label>Customer
          <select value={inv.partnerId ?? ''} onChange={e => setInv({ ...inv, partnerId: e.target.value || null })}>
            <option value="">—</option>
            {db.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Date<input type="date" value={inv.date} onChange={e => setInv({ ...inv, date: e.target.value })} /></label>
        <label>{inv.kind === 'quote' ? 'Valid until' : 'Due date'}
          <input type="date" value={inv.dueDate} onChange={e => setInv({ ...inv, dueDate: e.target.value })} />
        </label>

        <div className="wide scroll-x">
          <table className="table compact">
            <thead><tr><th>Product</th><th>Description</th><th>Qty</th><th>Price</th><th>Tax %</th><th className="r">Amount</th><th></th></tr></thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select value={l.productId ?? ''} onChange={e => pickProduct(i, e.target.value)}>
                      <option value="">custom</option>
                      {db.products.map(p => <option key={p.id} value={p.id}>{p.sku}</option>)}
                    </select>
                  </td>
                  <td><input value={l.label} onChange={e => setLine(i, { label: e.target.value })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.qty} onChange={e => setLine(i, { qty: parseFloat(e.target.value) || 0 })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.price} onChange={e => setLine(i, { price: parseFloat(e.target.value) || 0 })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.taxRate} onChange={e => setLine(i, { taxRate: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="r">{money(l.qty * l.price, inv.currency)}</td>
                  <td><button type="button" className="x" onClick={() => setInv({ ...inv, lines: inv.lines.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn tiny" onClick={() => setInv({
            ...inv, lines: [...inv.lines, { productId: null, label: '', qty: 1, price: 0, taxRate: db.company.taxRate }],
          })}>+ Add line</button>
        </div>

        <label className="wide">Coupon / voucher code
          <span className="inline">
            <input value={code} placeholder="WELCOME10" onChange={e => setCode(e.target.value)} />
            <button type="button" className="btn" onClick={redeem}>Redeem</button>
          </span>
        </label>

        <div className="totals wide">
          <div><span>Subtotal</span><b>{money(t.net, inv.currency)}</b></div>
          <div><span>Tax</span><b>{money(t.tax, inv.currency)}</b></div>
          <div className="grand"><span>Total</span><b>{money(t.total, inv.currency)}</b></div>
        </div>

        <div className="form-actions wide">
          {inv.id && <button type="button" className="btn danger"
            onClick={() => { update(d => { d.invoices = d.invoices.filter(x => x.id !== inv.id) }); setInv(null) }}>Delete</button>}
          <button type="button" className="btn" onClick={() => setInv(null)}>Cancel</button>
          <button className="btn primary">Save</button>
        </div>
      </form>
    </Modal>
  )
}

function Preview({ view, onClose }: { view: View; onClose: () => void }) {
  const { inv, as } = view
  const db = useDB()
  const toast = useToast()
  const p = db.partners.find(x => x.id === inv.partnerId)
  const t = invoiceTotals(inv)
  const due = balanceDue(db, 'invoice', inv.id, t.total)
  const delivery = as === 'delivery'
  const tenders = delivery ? [] : tendersFor(db, due > 0 ? due : t.total, inv.currency, inv.number)

  const summary = delivery
    ? `Delivery note ${inv.number} from ${db.company.name}: ${inv.lines.length} line(s), delivered ${inv.deliveredAt || today()}.`
    : `${db.company.name} — ${docTitle[inv.kind]} ${inv.number} for ${money(t.total, inv.currency)}${due > 0 ? `, ${money(due, inv.currency)} outstanding` : ''}.\n\n${paymentInstructions(db, due > 0 ? due : t.total, inv.currency, inv.number)}`

  async function share() {
    const r = await shareText({ title: `${inv.number} · ${db.company.name}`, text: summary })
    if (r === 'copied') toast('Copied — paste it anywhere')
    else if (r === 'failed') toast('Sharing not available on this device')
  }

  return (
    <Modal title={`${inv.number} · ${delivery ? 'Delivery note' : docTitle[inv.kind]}`} onClose={onClose}>
      <div className="print-area">
        <div className="doc-head">
          <div>
            <h2>{db.company.name}</h2>
            <div className="muted small">{db.company.address}<br />{db.company.email}
              {db.company.vatId && <><br />VAT {db.company.vatId}</>}</div>
          </div>
          <div className="r">
            <h2>{delivery ? 'DELIVERY NOTE' : docTitle[inv.kind]}</h2>
            <div className="muted small">
              {inv.number}<br />Date {inv.date}
              {!delivery && <><br />{inv.kind === 'quote' ? 'Valid until' : 'Due'} {inv.dueDate}</>}
              {delivery && <><br />Delivered {inv.deliveredAt || '—'}</>}
            </div>
          </div>
        </div>
        <p><b>{delivery ? 'Deliver to:' : 'Bill to:'}</b> {p?.name ?? '—'}<br />
          <span className="muted small">{p?.email} {p?.phone}</span></p>

        <table className="table compact">
          <thead><tr>
            <th>Description</th><th className="r">Qty</th>
            {!delivery && <><th className="r">Price</th><th className="r">Amount</th></>}
            {delivery && <th className="r">Received</th>}
          </tr></thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.label || '—'}</td>
                <td className="r">{l.qty}</td>
                {!delivery && <>
                  <td className="r">{money(l.price, inv.currency)}</td>
                  <td className="r">{money(l.qty * l.price, inv.currency)}</td>
                </>}
                {delivery && <td className="r muted">☐</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {!delivery && (
          <div className="totals">
            <div><span>Subtotal</span><b>{money(t.net, inv.currency)}</b></div>
            <div><span>Tax</span><b>{money(t.tax, inv.currency)}</b></div>
            <div><span>Total</span><b>{money(t.total, inv.currency)}</b></div>
            <div><span>Paid</span><b>{money(paidAmount(db, 'invoice', inv.id), inv.currency)}</b></div>
            <div className="grand"><span>Balance due</span><b>{money(due, inv.currency)}</b></div>
          </div>
        )}

        {delivery && (
          <div className="sign">
            <div><span>Received by (name)</span><div className="rule" /></div>
            <div><span>Signature</span><div className="rule" /></div>
            <div><span>Date</span><div className="rule" /></div>
          </div>
        )}

        {!delivery && tenders.length > 0 && (
          <section className="paybox">
            <h3>How to pay</h3>
            <div className="pay-grid">
              {tenders.map(t2 => (
                <div key={t2.channel.id} className="pay-card">
                  <b>{t2.channel.label}</b>
                  <p className="muted small">{t2.text}</p>
                  {t2.qr && <QR value={t2.uri} size={120} label="Scan to pay" />}
                  {t2.uri && (
                    <a className="btn tiny" href={t2.uri} target="_blank" rel="noreferrer">
                      {t2.uri.startsWith('tel:') ? 'Dial' : 'Open'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="form-actions wrapwide">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn" onClick={share}>Share</button>
        <a className="btn" href={whatsappLink(summary, p?.phone || '')} target="_blank" rel="noreferrer">WhatsApp</a>
        <a className="btn" href={mailtoLink(p?.email || '', `${inv.number} from ${db.company.name}`, summary)}>Email</a>
        <button className="btn primary" onClick={() => window.print()}>Print / PDF</button>
      </div>
    </Modal>
  )
}
