import { useMemo, useState } from 'react'
import { useDB, update, uid, today, money, Partner } from '../lib/db'

const STAGES: Partner['stage'][] = ['lead', 'qualified', 'proposal', 'won', 'lost']

const blank = (): Partner => ({
  id: '', name: '', email: '', phone: '', kind: 'customer',
  stage: 'lead', value: 0, note: '', createdAt: today(),
})

export default function CRM() {
  const db = useDB()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<Partner | null>(null)

  const list = useMemo(() => {
    const s = q.toLowerCase()
    return db.partners.filter(p =>
      !s || p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s))
  }, [db.partners, q])

  function save(p: Partner) {
    update(d => {
      if (p.id) {
        const i = d.partners.findIndex(x => x.id === p.id)
        if (i >= 0) d.partners[i] = p
      } else {
        d.partners.unshift({ ...p, id: uid() })
      }
    })
    setEdit(null)
  }

  function move(id: string, stage: Partner['stage']) {
    update(d => { const p = d.partners.find(x => x.id === id); if (p) p.stage = stage })
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>CRM</h1>
          <p className="sub">Contacts and a drag-free pipeline that just works.</p>
        </div>
        <div className="head-actions">
          <input className="search" placeholder="Search contacts…" value={q} onChange={e => setQ(e.target.value)} />
          <button className="btn primary" onClick={() => setEdit(blank())}>+ New contact</button>
        </div>
      </header>

      <div className="pipeline">
        {STAGES.map(stage => {
          const items = list.filter(p => p.stage === stage)
          const sum = items.reduce((s, p) => s + p.value, 0)
          return (
            <div className="col" key={stage}>
              <div className="col-head">
                <b>{stage}</b>
                <span>{items.length} · {money(sum)}</span>
              </div>
              {items.map(p => (
                <div className="pcard" key={p.id}>
                  <div className="pcard-top">
                    <strong onClick={() => setEdit(p)} className="clickable">{p.name}</strong>
                    <span className="tag">{p.kind}</span>
                  </div>
                  <div className="muted small">{p.email || '—'}</div>
                  <div className="amount">{money(p.value)}</div>
                  <select value={p.stage} onChange={e => move(p.id, e.target.value as Partner['stage'])}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
              {items.length === 0 && <div className="empty">—</div>}
            </div>
          )
        })}
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit contact' : 'New contact'} onClose={() => setEdit(null)}>
          <form onSubmit={e => { e.preventDefault(); save(edit) }} className="form">
            <label>Name<input required value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
            <label>Email<input type="email" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} /></label>
            <label>Phone<input value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></label>
            <label>Type
              <select value={edit.kind} onChange={e => setEdit({ ...edit, kind: e.target.value as Partner['kind'] })}>
                <option value="customer">customer</option>
                <option value="supplier">supplier</option>
                <option value="both">both</option>
              </select>
            </label>
            <label>Stage
              <select value={edit.stage} onChange={e => setEdit({ ...edit, stage: e.target.value as Partner['stage'] })}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Expected value<input type="number" step="0.01" value={edit.value}
              onChange={e => setEdit({ ...edit, value: parseFloat(e.target.value) || 0 })} /></label>
            <label className="wide">Notes<textarea value={edit.note} onChange={e => setEdit({ ...edit, note: e.target.value })} /></label>
            <div className="form-actions wide">
              {edit.id && <button type="button" className="btn danger"
                onClick={() => { update(d => { d.partners = d.partners.filter(x => x.id !== edit.id) }); setEdit(null) }}>Delete</button>}
              <button type="button" className="btn" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="x" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  )
}
