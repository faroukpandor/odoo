import { useMemo, useState } from 'react'
import {
  useDB, update, uid, today, money, invoiceTotals, billTotals, balanceDue,
  Payment, StatementLine, ID,
} from '../lib/db'
import { trialBalance } from '../lib/accounting'
import {
  openInvoices, openBills, totalReceivable, totalPayable, cashFlow,
  reconciliation, suggestPayments, suggestDocuments, parseStatementCSV,
  docLabel, paymentsCSV, newPayment, signedAmount,
} from '../lib/payments'
import { toCSV, downloadCSV } from '../lib/reports'
import { Modal } from './CRM'
import { useToast } from '../lib/ui'

export default function Banking() {
  const db = useDB()
  const toast = useToast()
  const [tab, setTab] = useState<'payments' | 'reconcile'>('payments')
  const [draft, setDraft] = useState<Payment | null>(null)

  const tb = useMemo(() => trialBalance(db), [db])
  const bank = tb.find(b => b.account.code === '1000')?.balance ?? 0
  const cash = tb.find(b => b.account.code === '1010')?.balance ?? 0
  const flow = cashFlow(db, today().slice(0, 7) + '-01', today())
  const rec = reconciliation(db)

  function savePayment(p: Payment) {
    if (p.amount <= 0) { toast('Enter an amount greater than zero'); return }
    update(d => {
      if (p.id) {
        const i = d.payments.findIndex(x => x.id === p.id)
        if (i >= 0) d.payments[i] = p
      } else {
        d.payments.unshift({ ...p, id: uid() })
      }
    })
    toast(p.kind === 'in' ? `Receipt of ${money(p.amount)} recorded` : `Payment of ${money(p.amount)} recorded`)
    setDraft(null)
  }

  const remove = (id: ID) => {
    update(d => {
      d.payments = d.payments.filter(p => p.id !== id)
      d.statementLines.forEach(l => { if (l.matchedPaymentId === id) l.matchedPaymentId = null })
    })
    toast('Payment deleted')
  }

  const toggleReconciled = (id: ID) => {
    update(d => { const p = d.payments.find(x => x.id === id); if (p) p.reconciled = !p.reconciled })
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Banking</h1>
          <p className="sub">
            Receipts, vendor payments and bank reconciliation — every entry posts to the ledger instantly.
          </p>
        </div>
        <div className="nowrap">
          <button className="btn" onClick={() => setDraft(newPayment(db, 'out'))}>− Pay a bill</button>
          <button className="btn primary" onClick={() => setDraft(newPayment(db, 'in'))}>+ Receive money</button>
        </div>
      </header>

      <div className="kpis">
        <Kpi label="Bank balance" value={money(bank)} tone={bank >= 0 ? 'brand' : 'bad'} />
        <Kpi label="Cash on hand" value={money(cash)} />
        <Kpi label="Received this month" value={money(flow.received)} tone="ok" />
        <Kpi label="Paid this month" value={money(flow.spent)} tone="warn" />
        <Kpi label="Still owed to you" value={money(totalReceivable(db))} tone={totalReceivable(db) ? 'warn' : 'ok'} />
        <Kpi label="You still owe" value={money(totalPayable(db))} tone={totalPayable(db) ? 'bad' : 'ok'} />
        <Kpi label="Unreconciled" value={String(rec.unreconciled.length + rec.unmatchedLines.length)}
          tone={rec.clean ? 'ok' : 'warn'} />
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'payments' ? ' on' : '')} onClick={() => setTab('payments')}>
          Payment register
        </button>
        <button className={'tab' + (tab === 'reconcile' ? ' on' : '')} onClick={() => setTab('reconcile')}>
          Bank reconciliation{rec.clean ? '' : ` · ${rec.unmatchedLines.length + rec.unreconciled.length}`}
        </button>
      </div>

      {tab === 'payments' ? (
        <>
          <div className="row-right">
            <button className="btn tiny" onClick={() => downloadCSV(`payments-${today()}.csv`, toCSV(paymentsCSV(db)[0] as string[], paymentsCSV(db).slice(1) as string[][]))}>
              Export CSV
            </button>
          </div>
          <table className="table">
            <thead><tr>
              <th>Date</th><th>Partner</th><th>Settles</th><th>Method</th><th>Reference</th>
              <th className="r">Amount</th><th>Bank</th><th></th>
            </tr></thead>
            <tbody>
              {db.payments.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map(p => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{db.partners.find(x => x.id === p.partnerId)?.name ?? '—'}</td>
                  <td>{docLabel(db, p)}</td>
                  <td>{p.method}</td>
                  <td className="muted">{p.ref || '—'}</td>
                  <td className={'r ' + (p.kind === 'in' ? 'ok' : 'bad')}>
                    {p.kind === 'in' ? '+' : '−'}{money(p.amount)}
                  </td>
                  <td>
                    <button className={'badge ' + (p.reconciled ? 'paid' : 'draft')}
                      onClick={() => toggleReconciled(p.id)}
                      title="Toggle reconciled">
                      {p.reconciled ? 'reconciled' : 'unreconciled'}
                    </button>
                  </td>
                  <td className="r nowrap">
                    <button className="btn tiny" onClick={() => setDraft(p)}>Edit</button>
                    <button className="btn tiny danger" onClick={() => remove(p.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {db.payments.length === 0 &&
                <tr><td colSpan={8} className="muted">No payments recorded yet.</td></tr>}
            </tbody>
          </table>
        </>
      ) : (
        <Reconcile />
      )}

      {draft && <PaymentForm p={draft} setP={setDraft} onSave={savePayment} />}
    </>
  )
}

/* ---------- payment capture ---------- */

function PaymentForm({ p, setP, onSave }: {
  p: Payment; setP: (p: Payment | null) => void; onSave: (p: Payment) => void
}) {
  const db = useDB()
  const options = p.kind === 'in'
    ? openInvoices(db).map(r => ({ id: r.doc.id, label: `${r.doc.number} · ${money(r.due)} due`, partnerId: r.doc.partnerId, due: r.due }))
    : openBills(db).map(r => ({ id: r.doc.id, label: `${r.doc.number} · ${money(r.due)} due`, partnerId: r.doc.partnerId, due: r.due }))

  // Editing an existing payment: its own document is no longer "open", so
  // make sure it still appears in the picker.
  const current = p.docId && !options.some(o => o.id === p.docId)
    ? [{ id: p.docId, label: docLabel(db, p), partnerId: p.partnerId, due: p.amount }]
    : []
  const all = [...current, ...options]

  const pickDoc = (id: string) => {
    const o = all.find(x => x.id === id)
    setP(o
      ? { ...p, docType: p.kind === 'in' ? 'invoice' : 'bill', docId: o.id, partnerId: o.partnerId, amount: p.amount || o.due }
      : { ...p, docType: null, docId: null })
  }

  return (
    <Modal title={p.kind === 'in' ? 'Receive money' : 'Pay a bill'} onClose={() => setP(null)}>
      <form className="form" onSubmit={e => { e.preventDefault(); onSave(p) }}>
        <label>Date
          <input type="date" value={p.date} onChange={e => setP({ ...p, date: e.target.value })} />
        </label>
        <label>{p.kind === 'in' ? 'Invoice settled' : 'Bill settled'}
          <select value={p.docId ?? ''} onChange={e => pickDoc(e.target.value)}>
            <option value="">On account (unallocated)</option>
            {all.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
        <label>Partner
          <select value={p.partnerId ?? ''} onChange={e => setP({ ...p, partnerId: e.target.value || null })}>
            <option value="">—</option>
            {db.partners.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label>Amount
          <input type="number" step="0.01" value={p.amount}
            onChange={e => setP({ ...p, amount: parseFloat(e.target.value) || 0 })} />
        </label>
        <label>Method
          <select value={p.method} onChange={e => setP({ ...p, method: e.target.value as Payment['method'] })}>
            <option value="bank">Bank transfer</option>
            <option value="cash">Cash</option>
          </select>
        </label>
        <label>Reference
          <input value={p.ref} placeholder="EFT number, cheque, receipt…"
            onChange={e => setP({ ...p, ref: e.target.value })} />
        </label>
        <label className="check wide">
          <input type="checkbox" checked={p.reconciled}
            onChange={e => setP({ ...p, reconciled: e.target.checked })} />
          Already appears on the bank statement
        </label>
        <div className="form-actions wide">
          <button type="button" className="btn" onClick={() => setP(null)}>Cancel</button>
          <button className="btn primary">Save payment</button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- reconciliation ---------- */

function Reconcile() {
  const db = useDB()
  const toast = useToast()
  const [paste, setPaste] = useState('')
  const rec = reconciliation(db)

  function importStatement() {
    const lines = parseStatementCSV(paste)
    if (!lines.length) { toast('No usable rows found — expected date, description, amount'); return }
    update(d => { d.statementLines.push(...lines) })
    setPaste('')
    toast(`${lines.length} statement line${lines.length > 1 ? 's' : ''} imported`)
  }

  /** Tick a statement line against an existing payment. */
  function matchPayment(lineId: ID, paymentId: ID) {
    update(d => {
      const l = d.statementLines.find(x => x.id === lineId)
      const p = d.payments.find(x => x.id === paymentId)
      if (!l || !p) return
      l.matchedPaymentId = p.id
      p.reconciled = true
      p.statementLineId = l.id
    })
    toast('Matched and reconciled')
  }

  /** Create the missing payment straight from the statement line. */
  function createFromLine(line: StatementLine, docType: 'invoice' | 'bill' | '', docId: string) {
    update(d => {
      const doc = docType === 'invoice'
        ? d.invoices.find(i => i.id === docId)
        : docType === 'bill' ? d.bills.find(b => b.id === docId) : undefined
      const p: Payment = {
        id: uid(), date: line.date, kind: line.amount >= 0 ? 'in' : 'out',
        partnerId: doc?.partnerId ?? null,
        docType: doc ? (docType as 'invoice' | 'bill') : null,
        docId: doc ? doc.id : null,
        amount: Math.abs(line.amount), method: 'bank', ref: line.description,
        reconciled: true, statementLineId: line.id,
      }
      d.payments.unshift(p)
      const l = d.statementLines.find(x => x.id === line.id)
      if (l) l.matchedPaymentId = p.id
    })
    toast('Payment created from statement line')
  }

  const dropLine = (id: ID) => {
    update(d => {
      const l = d.statementLines.find(x => x.id === id)
      if (l?.matchedPaymentId) {
        const p = d.payments.find(x => x.id === l.matchedPaymentId)
        if (p) { p.reconciled = false; p.statementLineId = null }
      }
      d.statementLines = d.statementLines.filter(x => x.id !== id)
    })
  }

  return (
    <>
      <div className="grid2">
        <section className="card">
          <h2>Import a bank statement</h2>
          <p className="muted small">
            Paste CSV rows as <code>date, description, amount</code> (negative = money out)
            or <code>date, description, debit, credit</code>. Nothing leaves your device.
          </p>
          <textarea className="paste" rows={6} value={paste} placeholder={'2026-10-01,EFT 8841 KALAHARI FRESH,10000\n2026-10-02,SOUTHERN SUPPLY CO,-46740'}
            onChange={e => setPaste(e.target.value)} />
          <div className="form-actions">
            <button className="btn" onClick={() => setPaste('')}>Clear</button>
            <button className="btn primary" onClick={importStatement}>Import lines</button>
          </div>
        </section>

        <section className="card">
          <h2>Reconciliation summary</h2>
          <div className="totals">
            <div><span>Statement balance</span><b>{money(rec.statementBalance)}</b></div>
            <div><span>Reconciled payments</span><b>{money(rec.matchedBalance)}</b></div>
            <div className="grand">
              <span>Difference</span>
              <b className={Math.abs(rec.difference) < 0.01 ? 'ok' : 'bad'}>{money(rec.difference)}</b>
            </div>
          </div>
          <p className={'note ' + (rec.clean ? 'ok' : 'warn')}>
            {rec.clean
              ? 'Every statement line is matched and every payment is reconciled.'
              : `${rec.unmatchedLines.length} statement line(s) unmatched · ${rec.unreconciled.length} payment(s) not yet on a statement.`}
          </p>
        </section>
      </div>

      <h2 className="section-title">Statement lines</h2>
      <table className="table">
        <thead><tr>
          <th>Date</th><th>Description</th><th className="r">Amount</th><th>Status</th><th>Match</th><th></th>
        </tr></thead>
        <tbody>
          {db.statementLines.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map(l => {
            const matched = db.payments.find(p => p.id === l.matchedPaymentId)
            const payOptions = suggestPayments(db, l)
            const docOptions = suggestDocuments(db, l)
            return (
              <tr key={l.id}>
                <td>{l.date}</td>
                <td>{l.description}</td>
                <td className={'r ' + (l.amount >= 0 ? 'ok' : 'bad')}>{money(l.amount)}</td>
                <td>
                  <span className={'badge ' + (matched ? 'paid' : 'overdue')}>
                    {matched ? 'matched' : 'unmatched'}
                  </span>
                </td>
                <td>
                  {matched ? (
                    <span className="muted small">{docLabel(db, matched)} · {money(signedAmount(matched))}</span>
                  ) : (
                    <select defaultValue="" onChange={e => {
                      const [kind, id] = e.target.value.split(':')
                      if (kind === 'pay') matchPayment(l.id, id)
                      else if (kind === 'inv') createFromLine(l, 'invoice', id)
                      else if (kind === 'bill') createFromLine(l, 'bill', id)
                      else if (kind === 'acct') createFromLine(l, '', '')
                      e.target.value = ''
                    }}>
                      <option value="">Choose a match…</option>
                      {payOptions.length > 0 && (
                        <optgroup label="Existing payments">
                          {payOptions.map(p => (
                            <option key={p.id} value={'pay:' + p.id}>
                              {p.date} · {docLabel(db, p)} · {money(p.amount)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {docOptions.length > 0 && (
                        <optgroup label="Create payment for">
                          {docOptions.map(o => (
                            <option key={o.id} value={(o.type === 'invoice' ? 'inv:' : 'bill:') + o.id}>
                              {o.label} · {money(o.due)} due
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="acct:">Record on account</option>
                    </select>
                  )}
                </td>
                <td className="r"><button className="btn tiny danger" onClick={() => dropLine(l.id)}>Remove</button></td>
              </tr>
            )
          })}
          {db.statementLines.length === 0 &&
            <tr><td colSpan={6} className="muted">No statement imported yet.</td></tr>}
        </tbody>
      </table>

      {rec.unreconciled.length > 0 && (
        <>
          <h2 className="section-title">Payments not on a statement</h2>
          <table className="table">
            <thead><tr><th>Date</th><th>Settles</th><th className="r">Amount</th><th>Reference</th></tr></thead>
            <tbody>
              {rec.unreconciled.map(p => (
                <tr key={p.id}>
                  <td>{p.date}</td>
                  <td>{docLabel(db, p)}</td>
                  <td className={'r ' + (p.kind === 'in' ? 'ok' : 'bad')}>{money(signedAmount(p))}</td>
                  <td className="muted">{p.ref || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={'kpi ' + (tone || '')}><span>{label}</span><strong>{value}</strong></div>
}

/** Small helper reused by Invoicing and Purchasing to show what is still due. */
export function DueCell({ docType, id, total }: { docType: 'invoice' | 'bill'; id: ID; total: number }) {
  const db = useDB()
  const due = balanceDue(db, docType, id, total)
  return <span className={due > 0.005 ? 'warn' : 'ok'}>{money(due)}</span>
}

export { invoiceTotals, billTotals }
