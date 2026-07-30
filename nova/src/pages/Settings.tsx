import { useRef, useState } from 'react'
import { useDB, update, exportJSON, importJSON, resetDB } from '../lib/db'

export default function Settings() {
  const db = useDB()
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const set = (patch: Partial<typeof db.company>) =>
    update(d => { d.company = { ...d.company, ...patch } })

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">Your data never leaves this device unless you export it.</p>
        </div>
      </header>

      <section className="card">
        <h2>Company</h2>
        <div className="form">
          <label>Company name<input value={db.company.name} onChange={e => set({ name: e.target.value })} /></label>
          <label>Billing email<input value={db.company.email} onChange={e => set({ email: e.target.value })} /></label>
          <label>Currency<input value={db.company.currency} onChange={e => set({ currency: e.target.value.toUpperCase() })} /></label>
          <label>Default tax %<input type="number" step="0.01" value={db.company.taxRate}
            onChange={e => set({ taxRate: parseFloat(e.target.value) || 0 })} /></label>
          <label>VAT / Tax ID<input value={db.company.vatId} onChange={e => set({ vatId: e.target.value })} /></label>
          <label>Address<input value={db.company.address} onChange={e => set({ address: e.target.value })} /></label>
        </div>
      </section>

      <section className="card">
        <h2>Data portability</h2>
        <p className="muted">Full database export/import as plain JSON. No lock-in, ever.</p>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn primary" onClick={exportJSON}>Export backup</button>
          <button className="btn" onClick={() => file.current?.click()}>Import backup</button>
          <button className="btn danger" onClick={() => {
            if (confirm('Reset all data to the demo dataset?')) { resetDB(); setMsg('Data reset.') }
          }}>Reset demo data</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return
            try { await importJSON(f); setMsg('Backup imported.') }
            catch (err) { setMsg('Import failed: ' + (err as Error).message) }
          }} />
        </div>
        {msg && <p className="ok">{msg}</p>}
      </section>

      <section className="card">
        <h2>Storage</h2>
        <p className="muted">
          {db.partners.length} contacts · {db.products.length} products · {db.invoices.length} invoices · {db.moves.length} stock moves
        </p>
      </section>
    </>
  )
}
