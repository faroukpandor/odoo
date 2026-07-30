import { useState } from 'react'
import { useDB, update, uid, today, money, stockOf, Product } from '../lib/db'
import { Modal } from './CRM'

const blank = (): Product => ({
  id: '', sku: '', name: '', price: 0, cost: 0, qty: 0, reorderPoint: 0, uom: 'unit',
})

export default function Inventory() {
  const db = useDB()
  const [edit, setEdit] = useState<Product | null>(null)
  const [movePid, setMovePid] = useState<string | null>(null)

  function save(p: Product) {
    update(d => {
      if (p.id) {
        const i = d.products.findIndex(x => x.id === p.id)
        if (i >= 0) d.products[i] = p
      } else {
        const created = { ...p, id: uid() }
        d.products.push(created)
        if (p.qty) d.moves.push({ id: uid(), productId: created.id, qty: p.qty, kind: 'in', ref: 'Opening stock', date: today() })
      }
    })
    setEdit(null)
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Inventory</h1>
          <p className="sub">Products, live stock from moves, and automatic reorder alerts.</p>
        </div>
        <button className="btn primary" onClick={() => setEdit(blank())}>+ New product</button>
      </header>

      <table className="table">
        <thead><tr>
          <th>SKU</th><th>Product</th><th className="r">Cost</th><th className="r">Price</th>
          <th className="r">Margin</th><th className="r">On hand</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          {db.products.map(p => {
            const on = stockOf(db, p.id)
            const margin = p.price ? ((p.price - p.cost) / p.price) * 100 : 0
            const low = on <= p.reorderPoint
            return (
              <tr key={p.id}>
                <td><code>{p.sku}</code></td>
                <td>{p.name}</td>
                <td className="r">{money(p.cost)}</td>
                <td className="r">{money(p.price)}</td>
                <td className="r">{margin.toFixed(0)}%</td>
                <td className="r">{on} {p.uom}</td>
                <td><span className={'badge ' + (low ? 'overdue' : 'paid')}>{low ? 'reorder' : 'ok'}</span></td>
                <td className="r nowrap">
                  <button className="btn tiny" onClick={() => setMovePid(p.id)}>Move</button>
                  <button className="btn tiny" onClick={() => setEdit(p)}>Edit</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <section className="card">
        <h2>Recent stock moves</h2>
        <ul className="feed">
          {[...db.moves].reverse().slice(0, 12).map(m => {
            const p = db.products.find(x => x.id === m.productId)
            return <li key={m.id}>
              <b className={m.kind === 'in' ? 'ok' : m.kind === 'out' ? 'warn' : ''}>{m.kind}</b>{' '}
              {p?.name ?? 'deleted product'} · {m.qty} · <span className="muted">{m.ref} · {m.date}</span>
            </li>
          })}
          {db.moves.length === 0 && <li className="muted">No moves yet.</li>}
        </ul>
      </section>

      {edit && (
        <Modal title={edit.id ? 'Edit product' : 'New product'} onClose={() => setEdit(null)}>
          <form className="form" onSubmit={e => { e.preventDefault(); save(edit) }}>
            <label>SKU<input required value={edit.sku} onChange={e => setEdit({ ...edit, sku: e.target.value })} /></label>
            <label>Name<input required value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
            <label>Cost<input type="number" step="0.01" value={edit.cost} onChange={e => setEdit({ ...edit, cost: parseFloat(e.target.value) || 0 })} /></label>
            <label>Sale price<input type="number" step="0.01" value={edit.price} onChange={e => setEdit({ ...edit, price: parseFloat(e.target.value) || 0 })} /></label>
            <label>Unit<input value={edit.uom} onChange={e => setEdit({ ...edit, uom: e.target.value })} /></label>
            <label>Reorder point<input type="number" value={edit.reorderPoint} onChange={e => setEdit({ ...edit, reorderPoint: parseFloat(e.target.value) || 0 })} /></label>
            {!edit.id && <label>Opening stock<input type="number" value={edit.qty} onChange={e => setEdit({ ...edit, qty: parseFloat(e.target.value) || 0 })} /></label>}
            <div className="form-actions wide">
              {edit.id && <button type="button" className="btn danger"
                onClick={() => { update(d => { d.products = d.products.filter(x => x.id !== edit.id) }); setEdit(null) }}>Delete</button>}
              <button type="button" className="btn" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn primary">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {movePid && <MoveForm pid={movePid} onClose={() => setMovePid(null)} />}
    </>
  )
}

function MoveForm({ pid, onClose }: { pid: string; onClose: () => void }) {
  const [qty, setQty] = useState(1)
  const [kind, setKind] = useState<'in' | 'out' | 'adjust'>('in')
  const [ref, setRef] = useState('Manual')
  return (
    <Modal title="Stock move" onClose={onClose}>
      <form className="form" onSubmit={e => {
        e.preventDefault()
        update(d => { d.moves.push({ id: uid(), productId: pid, qty, kind, ref, date: today() }) })
        onClose()
      }}>
        <label>Type
          <select value={kind} onChange={e => setKind(e.target.value as 'in' | 'out' | 'adjust')}>
            <option value="in">Receipt (in)</option>
            <option value="out">Delivery (out)</option>
            <option value="adjust">Set exact quantity</option>
          </select>
        </label>
        <label>Quantity<input type="number" step="0.01" value={qty} onChange={e => setQty(parseFloat(e.target.value) || 0)} /></label>
        <label className="wide">Reference<input value={ref} onChange={e => setRef(e.target.value)} /></label>
        <div className="form-actions wide">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary">Post move</button>
        </div>
      </form>
    </Modal>
  )
}
