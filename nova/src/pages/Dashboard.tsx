import { Link } from 'react-router-dom'
import { useDB, invoiceTotals, money, isOverdue, stockOf } from '../lib/db'
import { billTotals, expenseTotals, profitAndLoss } from '../lib/accounting'

export default function Dashboard() {
  const db = useDB()
  const today = new Date().toISOString().slice(0, 10)

  const invoiced = db.invoices.reduce((s, i) => s + invoiceTotals(i).total, 0)
  const paid = db.invoices.filter(i => i.status === 'paid')
    .reduce((s, i) => s + invoiceTotals(i).total, 0)
  const outstanding = invoiced - paid
  const overdue = db.invoices.filter(isOverdue)
    .reduce((s, i) => s + invoiceTotals(i).total, 0)

  const pipeline = db.partners
    .filter(p => !['won', 'lost'].includes(p.stage))
    .reduce((s, p) => s + p.value, 0)

  const low = db.products.filter(p => stockOf(db, p.id) <= p.reorderPoint)
  const stockValue = db.products.reduce((s, p) => s + stockOf(db, p.id) * p.cost, 0)

  const payables = db.bills.filter(b => b.status !== 'paid')
    .reduce((s, b) => s + billTotals(b).total, 0)
  const spend = db.bills.reduce((s, b) => s + billTotals(b).total, 0)
    + db.expenses.reduce((s, e) => s + expenseTotals(e).total, 0)
  const pl = profitAndLoss(db)

  const byMonth: Record<string, number> = {}
  db.invoices.forEach(i => {
    const k = i.date.slice(0, 7)
    byMonth[k] = (byMonth[k] || 0) + invoiceTotals(i).total
  })
  const months = Object.entries(byMonth).sort().slice(-6)
  const peak = Math.max(1, ...months.map(m => m[1]))

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">Live picture of your business — computed on device.</p>
        </div>
      </header>

      <div className="kpis">
        <Kpi label="Revenue invoiced" value={money(invoiced)} tone="brand" />
        <Kpi label="Outstanding" value={money(outstanding)} tone="warn" />
        <Kpi label="Overdue" value={money(overdue)} tone={overdue > 0 ? 'bad' : 'ok'} />
        <Kpi label="Open pipeline" value={money(pipeline)} tone="ok" />
        <Kpi label="Net profit" value={money(pl.net)} tone={pl.net >= 0 ? 'ok' : 'bad'} />
        <Kpi label="Owed to vendors" value={money(payables)} tone={payables ? 'warn' : 'ok'} />
        <Kpi label="Total spend" value={money(spend)} />
        <Kpi label="Stock value (cost)" value={money(stockValue)} />
        <Kpi label="Low-stock items" value={String(low.length)} tone={low.length ? 'bad' : 'ok'} />
      </div>

      <div className="grid2">
        <section className="card">
          <h2>Invoicing by month</h2>
          {months.length === 0 ? <p className="muted">No invoices yet.</p> : (
            <div className="bars">
              {months.map(([m, v]) => (
                <div key={m} className="bar-col">
                  <div className="bar" style={{ height: `${(v / peak) * 100}%` }} title={money(v)} />
                  <span>{m.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2>Needs attention</h2>
          <ul className="feed">
            {db.invoices.filter(isOverdue).map(i => (
              <li key={i.id}><b className="bad">Overdue</b> {i.number} · {money(invoiceTotals(i).total)}
                <Link className="link" to="/invoices"> open</Link></li>
            ))}
            {low.map(p => (
              <li key={p.id}><b className="warn">Reorder</b> {p.name} · {stockOf(db, p.id)} {p.uom} left
                <Link className="link" to="/inventory"> open</Link></li>
            ))}
            {db.bills.filter(b => b.status !== 'paid' && b.dueDate < today).map(b => (
              <li key={b.id}><b className="warn">Bill due</b> {b.number} · {money(billTotals(b).total)}
                <Link className="link" to="/purchases"> open</Link></li>
            ))}
            {db.expenses.filter(e => e.paidBy === 'employee' && !e.reimbursed).map(e => (
              <li key={e.id}><b className="warn">Reimburse</b> {e.label} · {money(expenseTotals(e).total)}
                <Link className="link" to="/purchases"> open</Link></li>
            ))}
            {db.partners.filter(p => p.stage === 'proposal').map(p => (
              <li key={p.id}><b className="ok">Follow up</b> {p.name} · {money(p.value)}
                <Link className="link" to="/crm"> open</Link></li>
            ))}
            {db.invoices.filter(isOverdue).length === 0 && low.length === 0 && (
              <li className="muted">All clear. Nothing needs you right now.</li>
            )}
          </ul>
        </section>
      </div>
    </>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className={'kpi ' + (tone || '')}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
