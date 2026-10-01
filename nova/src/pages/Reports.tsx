import { useState } from 'react'
import { useDB, money, today } from '../lib/db'
import {
  receivablesAgeing, payablesAgeing, vatReturn, topCustomers, cashSummary,
  BUCKETS, ageingCSV, downloadCSV, toCSV, AgeRow,
} from '../lib/reports'
import { journal } from '../lib/accounting'
import { statement, statementPartners, statementText } from '../lib/statement'
import { shareText, whatsappLink, mailtoLink } from '../lib/share'

type Tab = 'ar' | 'ap' | 'vat' | 'customers' | 'statement'

const startOfYear = () => today().slice(0, 4) + '-01-01'

export default function Reports() {
  const db = useDB()
  const [tab, setTab] = useState<Tab>('ar')
  const [asAt, setAsAt] = useState(today())
  const [from, setFrom] = useState(startOfYear())

  const ar = receivablesAgeing(db, asAt)
  const ap = payablesAgeing(db, asAt)
  const vat = vatReturn(db, from, asAt)
  const cash = cashSummary(db, asAt)
  const tops = topCustomers(db)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Reports</h1>
          <p className="sub">Ageing, tax and customer analytics — computed on device, exportable to CSV.</p>
        </div>
        <div className="head-actions">
          <label className="inline">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label className="inline">As at<input type="date" value={asAt} onChange={e => setAsAt(e.target.value)} /></label>
          <button className="btn" onClick={() => window.print()}>Print</button>
        </div>
      </header>

      <div className="kpis">
        <Kpi label="Receivable" value={money(ar.grand)} tone={ar.grand ? 'warn' : 'ok'} />
        <Kpi label="Payable" value={money(ap.grand)} tone={ap.grand ? 'warn' : 'ok'} />
        <Kpi label="Cash received" value={money(cash.received)} tone="ok" />
        <Kpi label="Cash spent" value={money(cash.spent)} />
        <Kpi label="Cash balance" value={money(cash.balance)} tone={cash.balance >= 0 ? 'brand' : 'bad'} />
        <Kpi label={`Net ${db.company.taxLabel || "tax"} due`} value={money(vat.payable)} tone={vat.payable > 0 ? 'warn' : 'ok'} />
      </div>

      <div className="tabs">
        {([['ar', 'Receivables ageing'], ['ap', 'Payables ageing'], ['vat', 'VAT return'], ['customers', 'Top customers'], ['statement', 'Customer statement']] as [Tab, string][])
          .map(([k, l]) => <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === 'ar' && <Ageing title="Receivables ageing" data={ar} file="receivables" />}
      {tab === 'ap' && <Ageing title="Payables ageing" data={ap} file="payables" />}

      {tab === 'vat' && (
        <section className="card">
          <h2>VAT return · {from} → {asAt}</h2>
          <table className="table">
            <tbody>
              <tr><td>Sales excluding tax</td><td className="r">{money(vat.salesNet)}</td></tr>
              <tr><td>Output tax charged on sales</td><td className="r">{money(vat.outputTax)}</td></tr>
              <tr><td>Purchases &amp; expenses excluding tax</td><td className="r">{money(vat.purchaseNet)}</td></tr>
              <tr><td>Input tax reclaimable</td><td className="r">{money(vat.inputTax)}</td></tr>
              <tr className="grand-row">
                <td><b>{vat.payable >= 0 ? 'Net VAT payable to authority' : 'Net VAT refundable'}</b></td>
                <td className={'r ' + (vat.payable > 0 ? 'warn' : 'ok')}><b>{money(Math.abs(vat.payable))}</b></td>
              </tr>
            </tbody>
          </table>
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="btn" onClick={() => downloadCSV(`vat-${from}-to-${asAt}.csv`, toCSV(
              ['Line', 'Amount'],
              [['Sales excl. tax', vat.salesNet.toFixed(2)], ['Output tax', vat.outputTax.toFixed(2)],
               ['Purchases excl. tax', vat.purchaseNet.toFixed(2)], ['Input tax', vat.inputTax.toFixed(2)],
               ['Net payable', vat.payable.toFixed(2)]],
            ))}>Export CSV</button>
            <button className="btn" onClick={() => downloadCSV(`journal-${asAt}.csv`, toCSV(
              ['Date', 'Ref', 'Memo', 'Account', 'Debit', 'Credit'],
              journal(db).filter(e => e.date <= asAt).flatMap(e =>
                e.lines.map(l => [e.date, e.ref, e.memo, l.account, l.debit.toFixed(2), l.credit.toFixed(2)])),
            ))}>Export full journal</button>
          </div>
        </section>
      )}

      {tab === 'statement' && <Statements from={from} to={asAt} />}

      {tab === 'customers' && (
        <section className="card">
          <h2>Revenue by customer</h2>
          {tops.length === 0 ? <p className="muted">No posted invoices yet.</p> : (
            <table className="table">
              <thead><tr><th>Customer</th><th className="r">Revenue</th><th className="r">Share</th><th>Concentration</th></tr></thead>
              <tbody>
                {tops.map(t => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td className="r">{money(t.value)}</td>
                    <td className="r">{t.share.toFixed(1)}%</td>
                    <td><div className="meter"><i style={{ width: `${t.share}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tops[0] && tops[0].share > 50 && (
            <p className="warn small">
              Concentration risk: {tops[0].name} is {tops[0].share.toFixed(0)}% of revenue.
            </p>
          )}
        </section>
      )}
    </>
  )
}

/** Customer statement of account — the document bookkeepers always ask for. */
function Statements({ from, to }: { from: string; to: string }) {
  const db = useDB()
  const rows = statementPartners(db)
  const [id, setId] = useState(rows[0]?.id ?? '')
  const chosen = rows.find(r => r.id === id)
  if (!chosen) return <section className="card"><p className="muted">Add a customer first.</p></section>

  const st = statement(db, chosen.id, from, to)
  const text = statementText(st, db.company.currency)

  return (
    <section className="card print-area">
      <div className="filters">
        <label className="inline">Customer
          <select value={id} onChange={e => setId(e.target.value)}>
            {rows.map(r => <option key={r.id} value={r.id}>{r.name} · {money(r.balance)}</option>)}
          </select>
        </label>
        <span className="grow" />
        <button className="btn tiny" onClick={() => void shareText({ title: `Statement · ${st.name}`, text })}>Share</button>
        <a className="btn tiny" href={whatsappLink(text, chosen.phone)} target="_blank" rel="noreferrer">WhatsApp</a>
        <a className="btn tiny" href={mailtoLink(chosen.email, `Statement of account — ${st.name}`, text)}>Email</a>
        <button className="btn tiny" onClick={() => window.print()}>Print</button>
      </div>

      <div className="doc-head">
        <div>
          {db.company.logo && <img className="doc-logo" src={db.company.logo} alt="" />}
          <h2>{db.company.name}</h2>
          <div className="muted small">{db.company.address}<br />{db.company.email}</div>
        </div>
        <div className="r">
          <h2>STATEMENT</h2>
          <div className="muted small">{st.name}<br />{from} to {to}</div>
        </div>
      </div>

      <div className="scroll-x">
        <table className="table compact">
          <thead><tr>
            <th>Date</th><th>Reference</th><th>Description</th>
            <th className="r">Charge</th><th className="r">Paid</th><th className="r">Balance</th>
          </tr></thead>
          <tbody>
            <tr><td colSpan={5}><b>Opening balance</b></td><td className="r"><b>{money(st.opening)}</b></td></tr>
            {st.rows.map((r, i) => (
              <tr key={i}>
                <td>{r.date}</td><td>{r.ref}</td><td>{r.description}</td>
                <td className="r">{r.charge ? money(r.charge) : ''}</td>
                <td className="r">{r.paid ? money(r.paid) : ''}</td>
                <td className="r">{money(r.balance)}</td>
              </tr>
            ))}
            {st.rows.length === 0 && <tr><td colSpan={6} className="muted">No movement in this period.</td></tr>}
            <tr><td colSpan={5}><b>Closing balance</b></td><td className="r"><b>{money(st.closing)}</b></td></tr>
          </tbody>
        </table>
      </div>

      <div className="totals">
        {BUCKETS.map(b => (
          <div key={b}><span>{b === 'current' ? 'Not yet due' : b + ' days'}</span><b>{money(st.ageing[b])}</b></div>
        ))}
        <div className="grand"><span>Overdue</span>
          <b className={st.overdue > 0 ? 'bad' : 'ok'}>{money(st.overdue)}</b></div>
      </div>
    </section>
  )
}

function Ageing({ title, data, file }: {
  title: string
  data: { rows: AgeRow[]; totals: Record<string, number>; grand: number }
  file: string
}) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {data.rows.length === 0 ? <p className="muted">Nothing outstanding. </p> : (
        <>
          <table className="table">
            <thead><tr><th>Name</th>{BUCKETS.map(b => <th key={b} className="r">{b}</th>)}<th className="r">Total</th></tr></thead>
            <tbody>
              {data.rows.map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  {BUCKETS.map(b => (
                    <td key={b} className={'r ' + (b === '90+' && r.buckets[b] ? 'bad' : '')}>
                      {r.buckets[b] ? money(r.buckets[b]) : '—'}
                    </td>
                  ))}
                  <td className="r"><b>{money(r.total)}</b></td>
                </tr>
              ))}
              <tr className="grand-row">
                <td><b>Total</b></td>
                {BUCKETS.map(b => <td key={b} className="r"><b>{money(data.totals[b])}</b></td>)}
                <td className="r"><b>{money(data.grand)}</b></td>
              </tr>
            </tbody>
          </table>
          <button className="btn" onClick={() => downloadCSV(`${file}-ageing.csv`, ageingCSV(data.rows))}>Export CSV</button>
        </>
      )}
    </section>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={'kpi ' + (tone || '')}><span>{label}</span><strong>{value}</strong></div>
}
