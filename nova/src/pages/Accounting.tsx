import { useState } from 'react'
import { useDB, update, money, today, JournalEntry } from '../lib/db'
import { journal, trialBalance, profitAndLoss, balanceSheet, journalIsBalanced, newManualEntry } from '../lib/accounting'
import { Modal } from './CRM'

type Tab = 'journal' | 'trial' | 'pl' | 'bs'

export default function Accounting() {
  const db = useDB()
  const [tab, setTab] = useState<Tab>('pl')
  const [upTo, setUpTo] = useState(today())
  const [entry, setEntry] = useState<JournalEntry | null>(null)

  const check = journalIsBalanced(db)
  const pl = profitAndLoss(db, upTo)
  const bs = balanceSheet(db, upTo)
  const tb = trialBalance(db, upTo).filter(b => b.debit || b.credit)
  const je = journal(db).filter(e => e.date <= upTo)

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Accounting</h1>
          <p className="sub">Real double-entry books, generated automatically from your invoices, bills and expenses.</p>
        </div>
        <div className="head-actions">
          <input type="date" value={upTo} onChange={e => setUpTo(e.target.value)} />
          <button className="btn" onClick={() => window.print()}>Print</button>
          <button className="btn primary" onClick={() => setEntry(newManualEntry(today()))}>+ Manual entry</button>
        </div>
      </header>

      <div className="kpis">
        <Kpi label="Revenue" value={money(pl.revenue)} tone="brand" />
        <Kpi label="Expenses" value={money(pl.costs)} tone="warn" />
        <Kpi label="Net profit" value={money(pl.net)} tone={pl.net >= 0 ? 'ok' : 'bad'} />
        <Kpi label="Total assets" value={money(bs.totalAssets)} />
        <Kpi label="Books balanced" value={check.ok ? 'Yes ✓' : 'No ✗'} tone={check.ok ? 'ok' : 'bad'} />
      </div>

      <div className="tabs">
        {([['pl', 'Profit & loss'], ['bs', 'Balance sheet'], ['trial', 'Trial balance'], ['journal', 'Journal']] as [Tab, string][])
          .map(([k, label]) => (
            <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{label}</button>
          ))}
      </div>

      {tab === 'pl' && (
        <section className="card">
          <h2>Profit &amp; loss — to {upTo}</h2>
          <table className="table">
            <tbody>
              <tr><th colSpan={2}>Income</th></tr>
              {pl.income.filter(b => b.balance).map(b => (
                <tr key={b.account.code}><td>{b.account.code} — {b.account.name}</td><td className="r">{money(b.balance)}</td></tr>
              ))}
              <tr><td><b>Total income</b></td><td className="r"><b>{money(pl.revenue)}</b></td></tr>
              <tr><th colSpan={2}>Expenses</th></tr>
              {pl.expense.filter(b => b.balance).map(b => (
                <tr key={b.account.code}><td>{b.account.code} — {b.account.name}</td><td className="r">{money(b.balance)}</td></tr>
              ))}
              <tr><td><b>Total expenses</b></td><td className="r"><b>{money(pl.costs)}</b></td></tr>
              <tr className="grand-row"><td><b>Net profit</b></td>
                <td className={'r ' + (pl.net >= 0 ? 'ok' : 'bad')}><b>{money(pl.net)}</b></td></tr>
            </tbody>
          </table>
        </section>
      )}

      {tab === 'bs' && (
        <section className="card">
          <h2>Balance sheet — as at {upTo}</h2>
          <table className="table">
            <tbody>
              <tr><th colSpan={2}>Assets</th></tr>
              {bs.assets.map(b => <tr key={b.account.code}><td>{b.account.name}</td><td className="r">{money(b.balance)}</td></tr>)}
              <tr><td><b>Total assets</b></td><td className="r"><b>{money(bs.totalAssets)}</b></td></tr>
              <tr><th colSpan={2}>Liabilities</th></tr>
              {bs.liabilities.map(b => <tr key={b.account.code}><td>{b.account.name}</td><td className="r">{money(b.balance)}</td></tr>)}
              <tr><td><b>Total liabilities</b></td><td className="r"><b>{money(bs.totalLiabilities)}</b></td></tr>
              <tr><th colSpan={2}>Equity</th></tr>
              {bs.equity.map(b => <tr key={b.account.code}><td>{b.account.name}</td><td className="r">{money(b.balance)}</td></tr>)}
              <tr><td>Retained earnings (period)</td><td className="r">{money(bs.retained)}</td></tr>
              <tr><td><b>Total equity</b></td><td className="r"><b>{money(bs.totalEquity)}</b></td></tr>
              <tr className="grand-row"><td><b>Liabilities + equity</b></td>
                <td className="r"><b>{money(bs.totalLiabilities + bs.totalEquity)}</b></td></tr>
            </tbody>
          </table>
          <p className="muted small">
            Assets {money(bs.totalAssets)} vs liabilities + equity {money(bs.totalLiabilities + bs.totalEquity)} —{' '}
            {Math.abs(bs.totalAssets - (bs.totalLiabilities + bs.totalEquity)) < 0.01
              ? <span className="ok">in balance ✓</span>
              : <span className="warn">difference is unassigned opening equity</span>}
          </p>
        </section>
      )}

      {tab === 'trial' && (
        <table className="table">
          <thead><tr><th>Code</th><th>Account</th><th>Type</th><th className="r">Debit</th><th className="r">Credit</th><th className="r">Balance</th></tr></thead>
          <tbody>
            {tb.map(b => (
              <tr key={b.account.code}>
                <td><code>{b.account.code}</code></td>
                <td>{b.account.name}</td>
                <td className="muted small">{b.account.type}</td>
                <td className="r">{money(b.debit)}</td>
                <td className="r">{money(b.credit)}</td>
                <td className="r"><b>{money(b.balance)}</b></td>
              </tr>
            ))}
            <tr className="grand-row">
              <td colSpan={3}><b>Totals</b></td>
              <td className="r"><b>{money(check.debit)}</b></td>
              <td className="r"><b>{money(check.credit)}</b></td>
              <td className="r">{check.ok ? <span className="ok">balanced ✓</span> : <span className="bad">off</span>}</td>
            </tr>
          </tbody>
        </table>
      )}

      {tab === 'journal' && (
        <table className="table">
          <thead><tr><th>Date</th><th>Ref</th><th>Memo</th><th>Account</th><th className="r">Debit</th><th className="r">Credit</th><th></th></tr></thead>
          <tbody>
            {je.map(e => e.lines.map((l, i) => {
              const acc = db.accounts.find(a => a.code === l.account)
              return (
                <tr key={e.id + i}>
                  <td>{i === 0 ? e.date : ''}</td>
                  <td>{i === 0 ? <b>{e.ref}</b> : ''}</td>
                  <td className="muted small">{i === 0 ? e.memo : ''}</td>
                  <td>{l.account} {acc?.name ?? ''}</td>
                  <td className="r">{l.debit ? money(l.debit) : ''}</td>
                  <td className="r">{l.credit ? money(l.credit) : ''}</td>
                  <td className="r">{i === 0 && e.source === 'manual' &&
                    <button className="btn tiny" onClick={() => setEntry(e)}>Edit</button>}</td>
                </tr>
              )
            }))}
            {je.length === 0 && <tr><td colSpan={7} className="muted">No entries yet.</td></tr>}
          </tbody>
        </table>
      )}

      {entry && <EntryEditor entry={entry} setEntry={setEntry} />}
    </>
  )
}

function EntryEditor({ entry, setEntry }: { entry: JournalEntry; setEntry: (e: JournalEntry | null) => void }) {
  const db = useDB()
  const dr = entry.lines.reduce((s, l) => s + l.debit, 0)
  const cr = entry.lines.reduce((s, l) => s + l.credit, 0)
  const ok = Math.abs(dr - cr) < 0.01 && dr > 0

  const setLine = (i: number, patch: Partial<JournalEntry['lines'][0]>) =>
    setEntry({ ...entry, lines: entry.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) })

  return (
    <Modal title="Manual journal entry" onClose={() => setEntry(null)}>
      <form className="form" onSubmit={e => {
        e.preventDefault()
        if (!ok) return
        update(d => {
          const i = d.manualEntries.findIndex(x => x.id === entry.id)
          if (i >= 0) d.manualEntries[i] = entry; else d.manualEntries.push(entry)
        })
        setEntry(null)
      }}>
        <label>Date<input type="date" value={entry.date} onChange={e => setEntry({ ...entry, date: e.target.value })} /></label>
        <label>Reference<input value={entry.ref} onChange={e => setEntry({ ...entry, ref: e.target.value })} /></label>
        <label className="wide">Memo<input value={entry.memo} onChange={e => setEntry({ ...entry, memo: e.target.value })} /></label>

        <div className="wide">
          <table className="table compact">
            <thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th></th></tr></thead>
            <tbody>
              {entry.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select value={l.account} onChange={e => setLine(i, { account: e.target.value })}>
                      {db.accounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" step="0.01" className="num" value={l.debit} onChange={e => setLine(i, { debit: parseFloat(e.target.value) || 0 })} /></td>
                  <td><input type="number" step="0.01" className="num" value={l.credit} onChange={e => setLine(i, { credit: parseFloat(e.target.value) || 0 })} /></td>
                  <td><button type="button" className="x" onClick={() => setEntry({ ...entry, lines: entry.lines.filter((_, j) => j !== i) })}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn tiny"
            onClick={() => setEntry({ ...entry, lines: [...entry.lines, { account: '1000', debit: 0, credit: 0 }] })}>+ Add line</button>
        </div>

        <div className="totals wide">
          <div><span>Debits</span><b>{money(dr)}</b></div>
          <div><span>Credits</span><b>{money(cr)}</b></div>
          <div className="grand"><span>Status</span>
            <b className={ok ? 'ok' : 'bad'}>{ok ? 'Balanced ✓' : 'Must balance and be non-zero'}</b></div>
        </div>

        <div className="form-actions wide">
          <button type="button" className="btn danger"
            onClick={() => { update(d => { d.manualEntries = d.manualEntries.filter(x => x.id !== entry.id) }); setEntry(null) }}>Delete</button>
          <button type="button" className="btn" onClick={() => setEntry(null)}>Cancel</button>
          <button className="btn primary" disabled={!ok}>Post entry</button>
        </div>
      </form>
    </Modal>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={'kpi ' + (tone || '')}><span>{label}</span><strong>{value}</strong></div>
}
