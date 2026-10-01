/**
 * Recurring invoices (retainers, subscriptions, rent).
 *
 * The schedule is evaluated on the device every time the app opens: anything
 * due since the last visit is issued, so a shop that was closed for a week
 * still gets its invoices — no cron, no server, no missed billing run.
 */
import { DB, Invoice, Recurring, ID, nextInvoiceNumber, today } from './db'

export const PERIODS: { id: Recurring['every']; label: string; days: number }[] = [
  { id: 'week', label: 'Weekly', days: 7 },
  { id: 'month', label: 'Monthly', days: 30 },
  { id: 'quarter', label: 'Quarterly', days: 91 },
  { id: 'year', label: 'Yearly', days: 365 },
]

export const addDays = (date: string, n: number) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Adds whole months, clamping to the last day so 31 Jan + 1 month is 28/29 Feb. */
function addMonths(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00Z')
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d.toISOString().slice(0, 10)
}

export function addPeriod(date: string, every: Recurring['every']): string {
  if (every === 'week') return addDays(date, 7)
  if (every === 'month') return addMonths(date, 1)
  if (every === 'quarter') return addMonths(date, 3)
  return addMonths(date, 12)
}

export const periodLabel = (e: Recurring['every']) => PERIODS.find(p => p.id === e)?.label ?? e

export const isDue = (r: Recurring, asAt: string) =>
  r.active && r.nextRun <= asAt && (!r.until || r.nextRun <= r.until)

export function dueSchedules(d: DB, asAt = today()) {
  return d.recurring.filter(r => isDue(r, asAt))
}

export function scheduleTotal(r: Recurring) {
  const net = r.lines.reduce((s, l) => s + l.qty * l.price, 0)
  const tax = r.lines.reduce((s, l) => s + (l.qty * l.price * l.taxRate) / 100, 0)
  return { net, tax, total: net + tax }
}

/** Monthly recurring revenue, normalised across periods. */
export function mrr(d: DB) {
  const perMonth: Record<Recurring['every'], number> = { week: 52 / 12, month: 1, quarter: 1 / 3, year: 1 / 12 }
  return d.recurring
    .filter(r => r.active)
    .reduce((s, r) => s + scheduleTotal(r).net * perMonth[r.every], 0)
}

/**
 * Issues every invoice a schedule owes, catching up if the app was closed.
 * Mutates the draft DB passed in by `update()`; returns what it created.
 */
export function runSchedules(d: DB, asAt = today(), mk: () => ID): Invoice[] {
  const created: Invoice[] = []
  d.recurring.forEach(r => {
    let guard = 0
    while (isDue(r, asAt) && guard++ < 60) {
      const number = nextInvoiceNumber(d, 'invoice')
      const inv: Invoice = {
        id: mk(), kind: 'invoice', number, partnerId: r.partnerId,
        date: r.nextRun, dueDate: addDays(r.nextRun, r.dueDays || 30),
        status: 'sent', currency: d.company.currency,
        note: [r.note, `Recurring · ${r.name}`].filter(Boolean).join(' · '),
        lines: r.lines.map(l => ({ ...l })),
      }
      d.invoices.unshift(inv)
      // Keep stock honest for product lines, exactly like a manual invoice.
      inv.lines.forEach(l => {
        if (l.productId) d.moves.push({
          id: mk(), productId: l.productId, qty: l.qty, kind: 'out',
          ref: number, date: inv.date,
        })
      })
      r.generated = [inv.id, ...(r.generated ?? [])]
      r.nextRun = addPeriod(r.nextRun, r.every)
      if (r.until && r.nextRun > r.until) r.active = false
      created.push(inv)
    }
  })
  return created
}

export function newSchedule(d: DB): Recurring {
  return {
    id: '', name: '', partnerId: d.partners[0]?.id ?? null,
    lines: [{ productId: null, label: '', qty: 1, price: 0, taxRate: d.company.taxRate }],
    every: 'month', nextRun: today(), until: '', dueDays: 30, active: true,
    note: '', generated: [],
  }
}
