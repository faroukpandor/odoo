import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDB, money, invoiceTotals } from '../lib/db'
import { docLabel } from '../lib/payments'
import { useHotkey } from '../lib/ui'

interface Item { label: string; hint: string; to: string; group: string }

/**
 * Ctrl/Cmd+K palette: jump to any module, customer, invoice, bill or product.
 * Search across the whole dataset is instant because everything is in memory.
 */
export default function CommandPalette() {
  const db = useDB()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  useHotkey(
    useCallback((e: KeyboardEvent) => (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey), []),
    useCallback(() => setOpen(v => !v), []),
  )

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => input.current?.focus(), 10) } }, [open])

  const items: Item[] = useMemo(() => [
    { label: 'Dashboard', hint: 'Overview', to: '/', group: 'Go to' },
    { label: 'CRM', hint: 'Contacts & pipeline', to: '/crm', group: 'Go to' },
    { label: 'Invoicing', hint: 'Customer invoices', to: '/invoices', group: 'Go to' },
    { label: 'Purchasing', hint: 'Bills & expenses', to: '/purchases', group: 'Go to' },
    { label: 'Banking', hint: 'Payments & reconciliation', to: '/banking', group: 'Go to' },
    { label: 'Inventory', hint: 'Products & stock', to: '/inventory', group: 'Go to' },
    { label: 'Accounting', hint: 'Journal & statements', to: '/accounting', group: 'Go to' },
    { label: 'Reports', hint: 'Ageing, VAT, analytics', to: '/reports', group: 'Go to' },
    { label: 'Settings', hint: 'Company & backups', to: '/settings', group: 'Go to' },
    ...db.partners.map(p => ({ label: p.name, hint: `${p.kind} · ${p.email || 'no email'}`, to: '/crm', group: 'Contacts' })),
    ...db.invoices.map(i => ({
      label: i.number,
      hint: `${i.status} · ${money(invoiceTotals(i).total, i.currency)}`,
      to: '/invoices', group: 'Invoices',
    })),
    ...db.bills.map(b => ({ label: b.number, hint: b.status, to: '/purchases', group: 'Bills' })),
    ...db.products.map(p => ({ label: `${p.sku} — ${p.name}`, hint: money(p.price), to: '/inventory', group: 'Products' })),
    ...db.payments.map(p => ({
      label: `${p.kind === 'in' ? 'Receipt' : 'Payment'} ${money(p.amount)}`,
      hint: `${p.date} · ${docLabel(db, p)}${p.ref ? ' · ' + p.ref : ''}`,
      to: '/banking', group: 'Payments',
    })),
  ], [db])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const hit = s
      ? items.filter(i => (i.label + ' ' + i.hint).toLowerCase().includes(s))
      : items.filter(i => i.group === 'Go to')
    return hit.slice(0, 12)
  }, [items, q])

  if (!open) return null

  const go = (i: Item) => { nav(i.to); setOpen(false) }

  return (
    <div className="overlay palette-overlay" onClick={() => setOpen(false)}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <input
          ref={input} value={q} placeholder="Search anything — customers, invoices, products…"
          onChange={e => { setQ(e.target.value); setSel(0) }}
          onKeyDown={e => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
            if (e.key === 'Enter' && results[sel]) go(results[sel])
          }}
        />
        <ul className="palette-list">
          {results.map((r, i) => (
            <li key={r.group + r.label + i} className={i === sel ? 'on' : ''}
              onMouseEnter={() => setSel(i)} onClick={() => go(r)}>
              <span className="pgroup">{r.group}</span>
              <span className="plabel">{r.label}</span>
              <span className="phint">{r.hint}</span>
            </li>
          ))}
          {results.length === 0 && <li className="muted">No matches.</li>}
        </ul>
        <div className="palette-foot muted small">↑↓ navigate · ↵ open · esc close</div>
      </div>
    </div>
  )
}
