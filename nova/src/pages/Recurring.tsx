import { useState } from 'react'
import { useDB, update, uid, money, today, Recurring as Sched, InvoiceLine } from '../lib/db'
import { PERIODS, periodLabel, scheduleTotal, mrr, runSchedules, dueSchedules, newSchedule, addPeriod } from '../lib/recurring'
import { Modal } from './CRM'
import { useToast } from '../lib/ui'

/**
 * Retainers, subscriptions and rent. The schedule runs on this device when the
 * app opens, so billing never depends on a server being awake.
 */
export default function Recurring() {
  const db = useDB()
  const toast = useToast()
  const [edit, setEdit] = useState<Sched | null>(null)

  const due = dueSchedules(db)
  const active = db.recurring.filter(r => r.active)

  function save(r: Sched) {
    update(d => {
      if (r.id) { const i = d.recurring.findIndex(x => x.id === r.id); if (i >= 0) d.recurring[i] = r }
      else d.recurring.unshift({ ...r, id: uid() })
    })
    toast(r.id ? 'Schedule updated' : 'Schedule created')
    setEdit(null)
  }

  function runNow() {
    let made = 0
    update(d => { made = runSchedules(d, today(), uid).length })
    toast(made ? `${made} invoice${made > 1 ? 's' : ''} issued` : 'Nothing due yet')
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Recurring billing</h1>
          <p className="sub">
            Retainers and subscriptions that invoice themselves — catching up automatically
            if the app was closed on the due date.
          </p>
        </div>
        <div className="nowrap">
          <button className="btn" onClick={runNow}>Run due now{due.length ? ` (${due.length})` : ''}</button>
          <button className="btn primary" onClick={() => setEdit(newSchedule(db))}>+ New schedule</button>
        </div>
      </header>

      <div className="kpis">
        <Kpi label="Active schedules" value={String(active.length)} tone="brand" />
        <Kpi label="Monthly recurring revenue" value={money(mrr(db))} tone="ok" />
        <Kpi label="Annualised" value={money(mrr(db) * 12)} />
        <Kpi label="Due to issue" value={String(due.length)} tone={due.length ? 'warn' : 'ok'} />
        <Kpi label="Invoices generated" value={String(db.recurring.reduce((s, r) => s + (r.generated?.length ?? 0), 0))} />
      </div>

      <div className="scroll-x">
        <table className="table">
          <thead><tr>
            <th>Schedule</th><th>Customer</th><th>Every</th><th>Next issue</th>
            <th className="r">Amount</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            {db.recurring.map(r => {
              const p = db.partners.find(x => x.id === r.partnerId)
              const t = scheduleTotal(r)
              const isDueNow = r.active && r.nextRun <= today()
              return (
                <tr key={r.id}>
                  <td><b>{r.name || 'Untitled'}</b></td>
                  <td>{p?.name ?? '—'}</td>
                  <td>{periodLabel(r.every)}</td>
                  <td className={isDueNow ? 'warn' : ''}>{r.nextRun}</td>
                  <td className="r">{money(t.total)}</td>
                  <td><span className={'badge ' + (!r.active ? 'draft' : isDueNow ? 'overdue' : 'paid')}>
                    {!r.active ? 'paused' : isDueNow ? 'due' : 'scheduled'}
                  </span></td>
                  <td className="r nowrap">
                    <button className="btn tiny" onClick={() => setEdit(r)}>Edit</button>
                    <button className="btn tiny" onClick={() => update(d => {
                      const x = d.recurring.find(y => y.id === r.id); if (x) x.active = !x.active
                    })}>{r.active ? 'Pause' : 'Resume'}</button>
                    <button className="btn tiny" onClick={() => update(d => {
                      const x = d.recurring.find(y => y.id === r.id)
                      if (x) x.nextRun = addPeriod(x.nextRun, x.every)
                    })}>Skip once</button>
                    <button className="btn tiny danger" onClick={() => update(d => {
                      d.recurring = d.recurring.filter(y => y.id !== r.id)
                    })}>Delete</button>
                  </td>
                </tr>
              )
            })}
            {db.recurring.length === 0 &&
              <tr><td colSpan={7} className="muted">No schedules yet — create one to bill a retainer automatically.</td></tr>}
          </tbody>
        </table>
      </div>

      {edit && <Editor sched={edit} setSched={setEdit} onSave={save} />}
    </>
  )
}

function Editor({ sched, setSched, onSave }: {
  sched: Sched; setSched: (s: Sched | null) => void; onSave: (s: Sched) => void
}) {
  const db = useDB()
  const t = scheduleTotal(sched)

  const setLine = (i: number, patch: Partial<InvoiceLine>) =>
    setSched({ ...sched, lines: sched.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  const pickProduct = (i: number, pid: string) => {
    const p = db.products.find(x => x.id === pid)
    setLine(i, p ? { productId: p.id, label: p.name, price: p.price } : { productId: null })
  }

  return (
    <Modal title={sched.id ? `Edit ${sched.name || 'schedule'}` : 'New recurring schedule'} onClose={() => setSched(null)}>
      <form className="form" onSubmit={e => { e.preventDefault(); onSave(sched) }}>
        <label>Name<input required value={sched.name} placeholder="Monthly support retainer"
          onChange={e => setSched({ ...sched, name: e.target.value })} /></label>
        <label>Customer
          <select value={sched.partnerId ?? ''} onChange={e => setSched({ ...sched, partnerId: e.target.value || null })}>
            <option value="">—</option>
            {db.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Repeats
          <select value={sched.every} onChange={e => setSched({ ...sched, every: e.target.value as Sched['every'] })}>
            {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label>Next issue date<input type="date" value={sched.nextRun}
          onChange={e => setSched({ ...sched, nextRun: e.target.value })} /></label>
        <label>Payment terms (days)<input type="number" value={sched.dueDays}
          onChange={e => setSched({ ...sched, dueDays: parseInt(e.target.value) || 0 })} /></label>
        <label>Stop after (optional)<input type="date" value={sched.until}
          onChange={e => setSched({ ...sched, until: e.target.value })} /></label>

        <div className="wide scroll-x">
          <table className="table compact">
            <thead><tr><th>Product</th><th>Description</th><th>Qty</th><th>Price</th><th>Tax %</th><th className="r">Amount</th><th></th></tr></thead>
            <tbody>
              {sched.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select value={l.productId ?? ''} onChange={e => pickProduct(i, e.target.value)}>
                      <option value="">custom</option>
                      {db.products.map(p => <option key={p.id} value={p.id}>{p.sku}</option>)}
                    </select>
                  </td>
                  <td><input value={l.label} onChange={e => setLine(i, { label: e.target.value })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.qty}
                    onChange={e => setLine(i, { qty: parseFloat(e.target.value) || 0 })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.price}
                    onChange={e => setLine(i, { price: parseFloat(e.target.value) || 0 })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.taxRate}
                    onChange={e => setLine(i, { taxRate: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="r">{money(l.qty * l.price)}</td>
                  <td><button type="button" className="x"
                    onClick={() => setSched({ ...sched, lines: sched.lines.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn tiny" onClick={() => setSched({
            ...sched, lines: [...sched.lines, { productId: null, label: '', qty: 1, price: 0, taxRate: db.company.taxRate }],
          })}>+ Add line</button>
        </div>

        <div className="totals wide">
          <div><span>Per {periodLabel(sched.every).toLowerCase().replace('ly', '')}</span><b>{money(t.net)}</b></div>
          <div><span>Tax</span><b>{money(t.tax)}</b></div>
          <div className="grand"><span>Invoice total</span><b>{money(t.total)}</b></div>
        </div>

        <div className="form-actions wide">
          <button type="button" className="btn" onClick={() => setSched(null)}>Cancel</button>
          <button className="btn primary">Save schedule</button>
        </div>
      </form>
    </Modal>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={'kpi ' + (tone || '')}><span>{label}</span><strong>{value}</strong></div>
}
