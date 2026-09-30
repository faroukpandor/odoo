import { useEffect, useRef, useState, useCallback } from 'react'
import { useDB, update, exportJSON, importJSON, resetDB } from '../lib/db'
import { useToast } from '../lib/ui'
import {
  listSnapshots, takeSnapshot, restoreSnapshot, deleteSnapshot,
  storageEstimate, requestPersistence, readErrorLog, clearErrorLog, Snapshot,
} from '../lib/backup'

export default function Settings() {
  const db = useDB()
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [snaps, setSnaps] = useState<Snapshot[]>([])
  const [storage, setStorage] = useState<{ usage: number; quota: number; pct: number } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [errors, setErrors] = useState(readErrorLog())

  const refresh = useCallback(async () => {
    setSnaps(await listSnapshots())
    setStorage(await storageEstimate())
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const set = (patch: Partial<typeof db.company>) =>
    update(d => { d.company = { ...d.company, ...patch } })

  const mb = (b: number) => (b / 1048576).toFixed(1) + ' MB'

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
          <button className="btn primary" onClick={() => { exportJSON(); toast('Backup downloaded') }}>Export backup</button>
          <button className="btn" onClick={() => file.current?.click()}>Import backup</button>
          <button className="btn danger" onClick={async () => {
            if (!confirm('Reset all data to the demo dataset? A restore point will be created first.')) return
            await takeSnapshot('before-reset')
            resetDB(); await refresh(); toast('Data reset to demo', 'info')
          }}>Reset demo data</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={async e => {
            const f = e.target.files?.[0]; if (!f) return
            try {
              await takeSnapshot('before-import')
              await importJSON(f); await refresh(); toast('Backup imported')
            } catch (err) { toast('Import failed: ' + (err as Error).message, 'bad') }
            e.target.value = ''
          }} />
        </div>
      </section>

      <section className="card">
        <h2>Restore points</h2>
        <p className="muted">
          Nova snapshots your database automatically, and always before a reset, import or restore.
          The last 10 are kept on this device.
        </p>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn" onClick={async () => {
            await takeSnapshot('manual'); await refresh(); toast('Restore point created')
          }}>Create restore point now</button>
        </div>
        <table className="table" style={{ marginTop: 12 }}>
          <thead><tr><th>When</th><th>Reason</th><th>Contents</th><th></th></tr></thead>
          <tbody>
            {snaps.map(s => (
              <tr key={s.id}>
                <td>{new Date(s.at).toLocaleString()}</td>
                <td><span className="badge draft">{s.reason}</span></td>
                <td className="muted small">
                  {s.counts.partners} contacts · {s.counts.invoices} invoices · {s.counts.bills} bills · {s.counts.products} products
                </td>
                <td className="r nowrap">
                  <button className="btn tiny" onClick={async () => {
                    if (!confirm('Restore this snapshot? Current data is snapshotted first.')) return
                    await restoreSnapshot(s.id); await refresh(); toast('Database restored')
                  }}>Restore</button>
                  <button className="btn tiny danger" onClick={async () => {
                    await deleteSnapshot(s.id); await refresh()
                  }}>Delete</button>
                </td>
              </tr>
            ))}
            {snaps.length === 0 && <tr><td colSpan={4} className="muted">No restore points yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Storage</h2>
        <p className="muted">
          {db.partners.length} contacts · {db.products.length} products · {db.invoices.length} invoices ·{' '}
          {db.bills.length} bills · {db.expenses.length} expenses · {db.moves.length} stock moves ·{' '}
          {db.manualEntries.length} manual journal entries
        </p>
        {storage && (
          <>
            <div className="meter" style={{ maxWidth: 420 }}>
              <i style={{ width: `${Math.min(100, storage.pct)}%` }} />
            </div>
            <p className="muted small">{mb(storage.usage)} used of {mb(storage.quota)} available ({storage.pct.toFixed(1)}%)</p>
          </>
        )}
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn" onClick={async () => {
            const ok = await requestPersistence()
            setPersisted(ok)
            toast(ok ? 'Storage is now persistent' : 'Browser declined persistent storage', ok ? 'ok' : 'bad')
          }}>Make storage persistent</button>
        </div>
        {persisted !== null && (
          <p className={'small ' + (persisted ? 'ok' : 'warn')}>
            {persisted
              ? 'This browser will not evict your Nova data automatically.'
              : 'Install Nova as an app or interact with it more, then try again.'}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Diagnostics</h2>
        {errors.length === 0 ? <p className="muted">No errors recorded. </p> : (
          <>
            <ul className="feed">
              {errors.slice(0, 5).map((e, i) => (
                <li key={i}><b className="bad">{new Date(e.at).toLocaleString()}</b> {e.message}</li>
              ))}
            </ul>
            <button className="btn tiny" onClick={() => { clearErrorLog(); setErrors([]) }}>Clear log</button>
          </>
        )}
      </section>
    </>
  )
}
