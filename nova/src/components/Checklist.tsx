import { Link } from 'react-router-dom'
import { useDB, update } from '../lib/db'
import { checklist, progress } from '../lib/onboarding'

/** Getting-started card: disappears for good once everything is ticked. */
export default function Checklist() {
  const db = useDB()
  const tasks = checklist(db)
  const { done, total, pct } = progress(db)
  if (db.setup.dismissedChecklist || done === total) return null

  const next = tasks.find(t => !t.done && t.essential) ?? tasks.find(t => !t.done)

  return (
    <section className="card checklist">
      <header className="ck-head">
        <div>
          <h2>Get set up</h2>
          <p className="muted small">{done} of {total} done{next ? ` · next: ${next.label.toLowerCase()}` : ''}</p>
        </div>
        <button className="btn tiny" onClick={() => update(d => { d.setup.dismissedChecklist = true })}>
          Hide
        </button>
      </header>
      <div className="meter"><span style={{ width: `${pct}%` }} /></div>
      <ul className="ck-list">
        {tasks.map(t => (
          <li key={t.id} className={t.done ? 'done' : ''}>
            <span className="tick">{t.done ? '✓' : '○'}</span>
            <div>
              <b>{t.label}</b>
              {!t.essential && <span className="chip">optional</span>}
              <div className="muted small">{t.detail}</div>
            </div>
            {!t.done && <Link className="btn tiny" to={t.to}>Open</Link>}
          </li>
        ))}
      </ul>
    </section>
  )
}
