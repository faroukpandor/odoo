import { useState } from 'react'
import {
  useDB, update, uid, today, money, invoiceTotals, nextInvoiceNumber,
  isOverdue, Invoice, InvoiceLine, getDB,
} from '../lib/db'
import { Modal } from './CRM'

const addDays = (d: string, n: number) => {
  const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10)
}

export default function Invoices() {
  const db = useDB()
  const [edit, setEdit] = useState<Invoice | null>(null)
  const [view, setView] = useState<Invoice | null>(null)

  const blank = (): Invoice => ({
    id: '', number: nextInvoiceNumber(getDB()), partnerId: db.partners[0]?.id ?? null,
    date: today(), dueDate: addDays(today(), 30), status: 'draft',
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
        // Post stock moves for stocked products — inventory stays in sync automatically.
        created.lines.forEach(l => {
          if (l.productId) d.moves.push({
            id: uid(), productId: l.productId, qty: l.qty, kind: 'out',
            ref: created.number, date: created.date,
          })
        })
      }
    })
    setEdit(null)
  }

  const setStatus = (id: string, status: Invoice['status']) =>
    update(d => { const i = d.invoices.find(x => x.id === id); if (i) i.status = status })

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Invoicing</h1>
          <p className="sub">Create, track and print invoices. Payments update your dashboard instantly.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit(blank())}>+ New invoice</button>
      </header>

      <table className="table">
        <thead><tr>
          <th>Number</th><th>Customer</th><th>Date</th><th>Due</th>
          <th className="r">Total</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          {db.invoices.map(i => {
            const p = db.partners.find(x => x.id === i.partnerId)
            const st = isOverdue(i) ? 'overdue' : i.status
            return (
              <tr key={i.id}>
                <td><b>{i.number}</b></td>
                <td>{p?.name ?? '—'}</td>
                <td>{i.date}</td>
                <td>{i.dueDate}</td>
                <td className="r">{money(invoiceTotals(i).total, i.currency)}</td>
                <td><span className={'badge ' + st}>{st}</span></td>
                <td className="r nowrap">
                  <button className="btn tiny" onClick={() => setView(i)}>View</button>
                  <button className="btn tiny" onClick={() => setEdit(i)}>Edit</button>
                  {i.status !== 'paid' &&
                    <button className="btn tiny ok" onClick={() => setStatus(i.id, 'paid')}>Mark paid</button>}
                </td>
              </tr>
            )
          })}
          {db.invoices.length === 0 && <tr><td colSpan={7} className="muted">No invoices yet.</td></tr>}
        </tbody>
      </table>

      {edit && <Editor inv={edit} setInv={setEdit} onSave={save} />}
      {view && <Preview inv={view} onClose={() => setView(null)} />}
    </>
  )
}

function Editor({ inv, setInv, onSave }: {
  inv: Invoice; setInv: (i: Invoice | null) => void; onSave: (i: Invoice) => void
}) {
  const db = useDB()
  const t = invoiceTotals(inv)

  const setLine = (idx: number, patch: Partial<InvoiceLine>) => {
    const lines = inv.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    setInv({ ...inv, lines })
  }

  const pickProduct = (idx: number, pid: string) => {
    const p = db.products.find(x => x.id === pid)
    setLine(idx, p ? { productId: p.id, label: p.name, price: p.price } : { productId: null })
  }

  return (
    <Modal title={inv.id ? `Edit ${inv.number}` : 'New invoice'} onClose={() => setInv(null)}>
      <form className="form" onSubmit={e => { e.preventDefault(); onSave(inv) }}>
        <label>Number<input value={inv.number} onChange={e => setInv({ ...inv, number: e.target.value })} /></label>
        <label>Customer
          <select value={inv.partnerId ?? ''} onChange={e => setInv({ ...inv, partnerId: e.target.value || null })}>
            <option value="">—</option>
            {db.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Date<input type="date" value={inv.date} onChange={e => setInv({ ...inv, date: e.target.value })} /></label>
        <label>Due date<input type="date" value={inv.dueDate} onChange={e => setInv({ ...inv, dueDate: e.target.value })} /></label>

        <div className="wide">
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

        <div className="totals wide">
          <div><span>Subtotal</span><b>{money(t.net, inv.currency)}</b></div>
          <div><span>Tax</span><b>{money(t.tax, inv.currency)}</b></div>
          <div className="grand"><span>Total</span><b>{money(t.total, inv.currency)}</b></div>
        </div>

        <div className="form-actions wide">
          {inv.id && <button type="button" className="btn danger"
            onClick={() => { update(d => { d.invoices = d.invoices.filter(x => x.id !== inv.id) }); setInv(null) }}>Delete</button>}
          <button type="button" className="btn" onClick={() => setInv(null)}>Cancel</button>
          <button className="btn primary">Save invoice</button>
        </div>
      </form>
    </Modal>
  )
}

function Preview({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const db = useDB()
  const p = db.partners.find(x => x.id === inv.partnerId)
  const t = invoiceTotals(inv)
  return (
    <Modal title={inv.number} onClose={onClose}>
      <div className="print-area">
        <div className="doc-head">
          <div>
            <h2>{db.company.name}</h2>
            <div className="muted small">{db.company.address}<br />{db.company.email}</div>
          </div>
          <div className="r">
            <h2>INVOICE</h2>
            <div className="muted small">{inv.number}<br />Date {inv.date}<br />Due {inv.dueDate}</div>
          </div>
        </div>
        <p><b>Bill to:</b> {p?.name ?? '—'}<br /><span className="muted small">{p?.email}</span></p>
        <table className="table compact">
          <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Price</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}><td>{l.label || '—'}</td><td className="r">{l.qty}</td>
                <td className="r">{money(l.price, inv.currency)}</td>
                <td className="r">{money(l.qty * l.price, inv.currency)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="totals">
          <div><span>Subtotal</span><b>{money(t.net, inv.currency)}</b></div>
          <div><span>Tax</span><b>{money(t.tax, inv.currency)}</b></div>
          <div className="grand"><span>Total due</span><b>{money(t.total, inv.currency)}</b></div>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn primary" onClick={() => window.print()}>Print / PDF</button>
      </div>
    </Modal>
  )
}
