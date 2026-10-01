import { useEffect, useRef, useState, useCallback } from 'react'
import { useDB, update, exportJSON, importJSON, resetDB, getDB as getDBSafe } from '../lib/db'
import { useToast } from '../lib/ui'
import LogoPicker from '../components/LogoPicker'
import { checkWorkspace, repairWorkspace } from '../lib/health'
import { COUNTRIES } from '../lib/tender'
import { applyCountry, progress } from '../lib/onboarding'
import {
  ROLES, currentUser, newUser, addUser, removeUser, canRemove, switchUser,
  initials, roleLabel, activityByUser, can,
} from '../lib/team'
import { Role } from '../lib/db'
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
          <label>Country
            <select value={db.company.country}
              onChange={e => update(d => { d.company = applyCountry(d.company, e.target.value) })}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          <label>Billing email<input value={db.company.email} onChange={e => set({ email: e.target.value })} /></label>
          <label>Phone<input value={db.company.phone} onChange={e => set({ phone: e.target.value })} /></label>
          <label>Currency<input value={db.company.currency} onChange={e => set({ currency: e.target.value.toUpperCase() })} /></label>
          <label>Tax name
            <select value={db.company.taxLabel} onChange={e => set({ taxLabel: e.target.value })}>
              {['VAT', 'GST', 'Sales tax', 'IVA', 'PPN', 'ICMS'].map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Default tax %<input type="number" step="0.01" value={db.company.taxRate}
            onChange={e => set({ taxRate: parseFloat(e.target.value) || 0 })} /></label>
          <label>{db.company.taxLabel || 'Tax'} registration number
            <input value={db.company.vatId} onChange={e => set({ vatId: e.target.value })} /></label>
          <label>Financial year starts
            <input value={db.company.fyStart} placeholder="01-01"
              onChange={e => set({ fyStart: e.target.value })} /></label>
          <label>Company registration no.
            <input value={db.company.regNo ?? ''} placeholder="BW00001234567"
              onChange={e => set({ regNo: e.target.value })} />
          </label>
          <label className="wide">Address<input value={db.company.address} onChange={e => set({ address: e.target.value })} /></label>
        </div>
        <LogoPicker name={db.company.name} value={db.company.logo}
          onChange={logo => set({ logo })} />
      </section>

      <HealthCard />

      <Team />

      <section className="card">
        <h2>Setup</h2>
        <p className="muted">
          Getting started is {progress(db).pct}% complete ({progress(db).done} of {progress(db).total} tasks).
        </p>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn" onClick={() => {
            update(d => { d.setup = { done: false, step: 0, dismissedChecklist: false } })
            toast('Setup wizard reopened')
          }}>Run setup wizard again</button>
          <button className="btn" onClick={() => {
            update(d => { d.setup.dismissedChecklist = !d.setup.dismissedChecklist })
          }}>{db.setup.dismissedChecklist ? 'Show' : 'Hide'} getting-started checklist</button>
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
          {db.bills.length} bills · {db.payments.length} payments · {db.expenses.length} expenses ·{' '}
          {db.moves.length} stock moves ·{' '}
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

/**
 * Team: who shares this workspace, what each of them may touch, and who did
 * what. Everyone here works on the same books; every open window updates live.
 */
function Team() {
  const db = useDB()
  const toast = useToast()
  const me = currentUser(db)
  const [draft, setDraft] = useState<ReturnType<typeof newUser> | null>(null)
  const activity = activityByUser(db)
  const mayManage = can(db, 'team.manage')

  return (
    <section className="card">
      <h2>Team</h2>
      <p className="muted">
        Several people can share these books. Each teammate gets a role that decides what
        they can open and change, and every window on this device updates the moment
        somebody saves. Roles organise work and prevent mistakes — they are not a security
        boundary, because anyone with the device has the file.
      </p>

      <div className="scroll-x">
        <table className="table compact">
          <thead><tr>
            <th>Name</th><th>Email</th><th>Role</th>
            <th className="r">Documents</th><th className="r">Payments</th><th></th>
          </tr></thead>
          <tbody>
            {db.users.map(u => {
              const a = activity.find(x => x.user.id === u.id)!
              return (
                <tr key={u.id} className={u.active ? '' : 'muted'}>
                  <td>
                    <span className="user-row">
                      <span className="avatar sm" aria-hidden>{initials(u.name)}</span>
                      <b>{u.name}</b>
                      {u.id === me.id && <span className="badge paid">you</span>}
                    </span>
                  </td>
                  <td>{u.email || '—'}</td>
                  <td>
                    {mayManage ? (
                      <select value={u.role} disabled={!canRemove(db, u.id) && u.role === 'owner'}
                        onChange={e => update(d => {
                          const x = d.users.find(y => y.id === u.id); if (x) x.role = e.target.value as Role
                        })}>
                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    ) : roleLabel(u.role)}
                  </td>
                  <td className="r">{a.documents}</td>
                  <td className="r">{a.payments}</td>
                  <td className="r nowrap">
                    {u.id !== me.id && u.active &&
                      <button className="btn tiny" onClick={() => update(d => switchUser(d, u.id))}>Work as</button>}
                    {mayManage && u.id !== me.id &&
                      <button className="btn tiny danger" disabled={!canRemove(db, u.id)}
                        onClick={() => { update(d => removeUser(d, u.id)); toast(`${u.name} removed`) }}>Remove</button>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {mayManage && (draft ? (
        <form className="form" onSubmit={e => {
          e.preventDefault()
          update(d => addUser(d, draft))
          toast(`${draft.name || 'Teammate'} added as ${roleLabel(draft.role)}`)
          setDraft(null)
        }}>
          <label>Name<input autoFocus required value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>Email<input type="email" value={draft.email}
            onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
          <label>Role
            <select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as Role })}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <p className="muted small wide">{ROLES.find(r => r.id === draft.role)?.detail}</p>
          <div className="form-actions wide">
            <button type="button" className="btn" onClick={() => setDraft(null)}>Cancel</button>
            <button className="btn primary">Add teammate</button>
          </div>
        </form>
      ) : (
        <button className="btn" onClick={() => setDraft(newUser())}>+ Add teammate</button>
      ))}
    </section>
  )
}

/**
 * Integrity check. A server would enforce these as constraints; with no server
 * they are run on demand and explained in plain language.
 */
function HealthCard() {
  const db = useDB()
  const toast = useToast()
  const [report, setReport] = useState<ReturnType<typeof checkWorkspace> | null>(null)

  const run = () => {
    const r = checkWorkspace(db)
    setReport(r)
    toast(r.errors ? `${r.errors} problem${r.errors > 1 ? 's' : ''} found` : 'Books look healthy',
      r.errors ? 'bad' : 'ok')
  }

  const repair = () => {
    let done: string[] = []
    update(d => { done = repairWorkspace(d) })
    setReport(checkWorkspace(getDBSafe()))
    toast(done.length ? done.join(' · ') : 'Nothing to repair')
  }

  return (
    <section className="card">
      <h2>Workspace health</h2>
      <p className="muted">
        Checks the things a database would normally enforce: references that point nowhere,
        duplicate document numbers, over-allocated payments, postings to unknown accounts and
        a journal that must always balance.
      </p>
      <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn primary" onClick={run}>Run health check</button>
        {report && report.findings.some(x => x.fixable) &&
          <button className="btn" onClick={repair}>Repair what is safe</button>}
      </div>

      {report && (
        <>
          <div className="kpis" style={{ marginTop: 14 }}>
            <div className={'kpi ' + (report.score > 90 ? 'ok' : report.errors ? 'bad' : 'warn')}>
              <span>Health score</span><strong>{report.score}/100</strong>
            </div>
            <div className="kpi"><span>Errors</span><strong>{report.errors}</strong></div>
            <div className="kpi"><span>Warnings</span><strong>{report.warnings}</strong></div>
          </div>
          {report.findings.length === 0
            ? <p className="ok">No problems found — every reference, number and posting checks out.</p>
            : (
              <ul className="findings">
                {report.findings.map(x => (
                  <li key={x.id} className={x.severity}>
                    <b>{x.title}{x.count > 1 ? ` (${x.count})` : ''}</b>
                    <span className="muted small">{x.detail}</span>
                  </li>
                ))}
              </ul>
            )}
        </>
      )}
    </section>
  )
}
