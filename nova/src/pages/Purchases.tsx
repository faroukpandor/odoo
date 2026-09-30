import { useState } from 'react'
import { useDB, update, uid, today, money, Bill, BillLine, Expense, getDB } from '../lib/db'
import { billTotals, expenseTotals } from '../lib/accounting'
import { Modal } from './CRM'

const addDays = (d: string, n: number) => {
  const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10)
}

const nextBillNumber = () => {
  const n = getDB().bills.reduce((m, b) => {
    const x = parseInt(b.number.replace(/\D/g, ''), 10)
    return isNaN(x) ? m : Math.max(m, x)
  }, 0)
  return 'BILL-' + String(n + 1).padStart(4, '0')
}

export default function Purchases() {
  const db = useDB()
  const [tab, setTab] = useState<'bills' | 'expenses'>('bills')
  const [bill, setBill] = useState<Bill | null>(null)
  const [exp, setExp] = useState<Expense | null>(null)

  const blankBill = (): Bill => ({
    id: '', number: nextBillNumber(),
    partnerId: db.partners.find(p => p.kind !== 'customer')?.id ?? null,
    date: today(), dueDate: addDays(today(), 14), status: 'received',
    currency: db.company.currency, note: '',
    lines: [{ label: '', qty: 1, price: 0, taxRate: db.company.taxRate, account: '6900' }],
  })

  const blankExp = (): Expense => ({
    id: '', date: today(), label: '', amount: 0, taxRate: db.company.taxRate,
    account: '6900', paidBy: 'company', reimbursed: true, note: '',
  })

  const spendBills = db.bills.reduce((s, b) => s + billTotals(b).total, 0)
  const spendExp = db.expenses.reduce((s, e) => s + expenseTotals(e).total, 0)
  const unpaid = db.bills.filter(b => b.status !== 'paid').reduce((s, b) => s + billTotals(b).total, 0)
  const owedStaff = db.expenses.filter(e => e.paidBy === 'employee' && !e.reimbursed)
    .reduce((s, e) => s + expenseTotals(e).total, 0)

  function saveBill(b: Bill) {
    update(d => {
      if (b.id) {
        const i = d.bills.findIndex(x => x.id === b.id); if (i >= 0) d.bills[i] = b
      } else d.bills.unshift({ ...b, id: uid() })
    })
    setBill(null)
  }

  function saveExp(e: Expense) {
    update(d => {
      if (e.id) {
        const i = d.expenses.findIndex(x => x.id === e.id); if (i >= 0) d.expenses[i] = e
      } else d.expenses.unshift({ ...e, id: uid() })
    })
    setExp(null)
  }

  const expenseAccounts = db.accounts.filter(a => a.type === 'expense' || a.code === '1300')

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Purchasing & expenses</h1>
          <p className="sub">Vendor bills and out-of-pocket spend — every document posts straight to the ledger.</p>
        </div>
        <button className="btn primary" onClick={() => tab === 'bills' ? setBill(blankBill()) : setExp(blankExp())}>
          + New {tab === 'bills' ? 'bill' : 'expense'}
        </button>
      </header>

      <div className="kpis">
        <Kpi label="Bills total" value={money(spendBills)} />
        <Kpi label="Unpaid to vendors" value={money(unpaid)} tone={unpaid ? 'warn' : 'ok'} />
        <Kpi label="Expenses total" value={money(spendExp)} />
        <Kpi label="Owed to staff" value={money(owedStaff)} tone={owedStaff ? 'bad' : 'ok'} />
      </div>

      <div className="tabs">
        <button className={'tab' + (tab === 'bills' ? ' on' : '')} onClick={() => setTab('bills')}>Vendor bills</button>
        <button className={'tab' + (tab === 'expenses' ? ' on' : '')} onClick={() => setTab('expenses')}>Expenses</button>
      </div>

      {tab === 'bills' ? (
        <table className="table">
          <thead><tr><th>Number</th><th>Vendor</th><th>Date</th><th>Due</th><th className="r">Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {db.bills.map(b => {
              const p = db.partners.find(x => x.id === b.partnerId)
              return (
                <tr key={b.id}>
                  <td><b>{b.number}</b></td>
                  <td>{p?.name ?? '—'}</td>
                  <td>{b.date}</td>
                  <td>{b.dueDate}</td>
                  <td className="r">{money(billTotals(b).total, b.currency)}</td>
                  <td><span className={'badge ' + (b.status === 'paid' ? 'paid' : b.status === 'draft' ? 'draft' : 'sent')}>{b.status}</span></td>
                  <td className="r nowrap">
                    <button className="btn tiny" onClick={() => setBill(b)}>Edit</button>
                    {b.status !== 'paid' && <button className="btn tiny ok"
                      onClick={() => update(d => { const x = d.bills.find(y => y.id === b.id); if (x) x.status = 'paid' })}>Mark paid</button>}
                  </td>
                </tr>
              )
            })}
            {db.bills.length === 0 && <tr><td colSpan={7} className="muted">No bills yet.</td></tr>}
          </tbody>
        </table>
      ) : (
        <table className="table">
          <thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Paid by</th><th className="r">Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {db.expenses.map(e => {
              const acc = db.accounts.find(a => a.code === e.account)
              return (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{e.label || '—'}</td>
                  <td className="muted small">{acc ? `${acc.code} ${acc.name}` : e.account}</td>
                  <td>{e.paidBy}</td>
                  <td className="r">{money(expenseTotals(e).total)}</td>
                  <td>{e.paidBy === 'employee'
                    ? <span className={'badge ' + (e.reimbursed ? 'paid' : 'overdue')}>{e.reimbursed ? 'reimbursed' : 'owed'}</span>
                    : <span className="badge paid">settled</span>}</td>
                  <td className="r nowrap"><button className="btn tiny" onClick={() => setExp(e)}>Edit</button></td>
                </tr>
              )
            })}
            {db.expenses.length === 0 && <tr><td colSpan={7} className="muted">No expenses yet.</td></tr>}
          </tbody>
        </table>
      )}

      {bill && <BillEditor bill={bill} setBill={setBill} onSave={saveBill} />}

      {exp && (
        <Modal title={exp.id ? 'Edit expense' : 'New expense'} onClose={() => setExp(null)}>
          <form className="form" onSubmit={e => { e.preventDefault(); saveExp(exp) }}>
            <label>Date<input type="date" value={exp.date} onChange={e => setExp({ ...exp, date: e.target.value })} /></label>
            <label>Description<input required value={exp.label} onChange={e => setExp({ ...exp, label: e.target.value })} /></label>
            <label>Amount (excl. tax)<input type="number" step="0.01" value={exp.amount}
              onChange={e => setExp({ ...exp, amount: parseFloat(e.target.value) || 0 })} /></label>
            <label>Tax %<input type="number" step="0.01" value={exp.taxRate}
              onChange={e => setExp({ ...exp, taxRate: parseFloat(e.target.value) || 0 })} /></label>
            <label>Expense account
              <select value={exp.account} onChange={e => setExp({ ...exp, account: e.target.value })}>
                {expenseAccounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
              </select>
            </label>
            <label>Paid by
              <select value={exp.paidBy} onChange={e => setExp({ ...exp, paidBy: e.target.value as Expense['paidBy'] })}>
                <option value="company">Company</option>
                <option value="employee">Employee (reimbursable)</option>
              </select>
            </label>
            {exp.paidBy === 'employee' && (
              <label>Reimbursed?
                <select value={exp.reimbursed ? 'y' : 'n'} onChange={e => setExp({ ...exp, reimbursed: e.target.value === 'y' })}>
                  <option value="n">Not yet</option><option value="y">Yes</option>
                </select>
              </label>
            )}
            <div className="totals wide">
              <div className="grand"><span>Total</span><b>{money(expenseTotals(exp).total)}</b></div>
            </div>
            <div className="form-actions wide">
              {exp.id && <button type="button" className="btn danger"
                onClick={() => { update(d => { d.expenses = d.expenses.filter(x => x.id !== exp.id) }); setExp(null) }}>Delete</button>}
              <button type="button" className="btn" onClick={() => setExp(null)}>Cancel</button>
              <button className="btn primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function BillEditor({ bill, setBill, onSave }: {
  bill: Bill; setBill: (b: Bill | null) => void; onSave: (b: Bill) => void
}) {
  const db = useDB()
  const t = billTotals(bill)
  const accounts = db.accounts.filter(a => a.type === 'expense' || a.code === '1300')
  const setLine = (i: number, patch: Partial<BillLine>) =>
    setBill({ ...bill, lines: bill.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  return (
    <Modal title={bill.id ? `Edit ${bill.number}` : 'New vendor bill'} onClose={() => setBill(null)}>
      <form className="form" onSubmit={e => { e.preventDefault(); onSave(bill) }}>
        <label>Number<input value={bill.number} onChange={e => setBill({ ...bill, number: e.target.value })} /></label>
        <label>Vendor
          <select value={bill.partnerId ?? ''} onChange={e => setBill({ ...bill, partnerId: e.target.value || null })}>
            <option value="">—</option>
            {db.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Date<input type="date" value={bill.date} onChange={e => setBill({ ...bill, date: e.target.value })} /></label>
        <label>Due date<input type="date" value={bill.dueDate} onChange={e => setBill({ ...bill, dueDate: e.target.value })} /></label>
        <label>Status
          <select value={bill.status} onChange={e => setBill({ ...bill, status: e.target.value as Bill['status'] })}>
            <option value="draft">draft</option><option value="received">received</option><option value="paid">paid</option>
          </select>
        </label>

        <div className="wide">
          <table className="table compact">
            <thead><tr><th>Description</th><th>Account</th><th>Qty</th><th>Price</th><th>Tax %</th><th className="r">Amount</th><th></th></tr></thead>
            <tbody>
              {bill.lines.map((l, i) => (
                <tr key={i}>
                  <td><input value={l.label} onChange={e => setLine(i, { label: e.target.value })} /></td>
                  <td>
                    <select value={l.account} onChange={e => setLine(i, { account: e.target.value })}>
                      {accounts.map(a => <option key={a.code} value={a.code}>{a.code} {a.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" step="0.01" className="num" value={l.qty} onChange={e => setLine(i, { qty: parseFloat(e.target.value) || 0 })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.price} onChange={e => setLine(i, { price: parseFloat(e.target.value) || 0 })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.taxRate} onChange={e => setLine(i, { taxRate: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="r">{money(l.qty * l.price, bill.currency)}</td>
                  <td><button type="button" className="x" onClick={() => setBill({ ...bill, lines: bill.lines.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn tiny" onClick={() => setBill({
            ...bill, lines: [...bill.lines, { label: '', qty: 1, price: 0, taxRate: db.company.taxRate, account: '6900' }],
          })}>+ Add line</button>
        </div>

        <div className="totals wide">
          <div><span>Subtotal</span><b>{money(t.net, bill.currency)}</b></div>
          <div><span>Tax</span><b>{money(t.tax, bill.currency)}</b></div>
          <div className="grand"><span>Total</span><b>{money(t.total, bill.currency)}</b></div>
        </div>

        <div className="form-actions wide">
          {bill.id && <button type="button" className="btn danger"
            onClick={() => { update(d => { d.bills = d.bills.filter(x => x.id !== bill.id) }); setBill(null) }}>Delete</button>}
          <button type="button" className="btn" onClick={() => setBill(null)}>Cancel</button>
          <button className="btn primary">Save bill</button>
        </div>
      </form>
    </Modal>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={'kpi ' + (tone || '')}><span>{label}</span><strong>{value}</strong></div>
}
