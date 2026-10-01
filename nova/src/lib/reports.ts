/**
 * Reporting helpers: receivables/payables ageing, VAT return, customer ranking
 * and cash movement. All pure functions over the in-memory DB so they are
 * trivially testable and render instantly offline.
 */
import { DB, Invoice, Bill, invoiceTotals, billTotals, expenseTotals, balanceDue, money } from './db'
import { trialBalance } from './accounting'
import { openInvoices, openBills, isPosted } from './payments'

export const BUCKETS = ['current', '1-30', '31-60', '61-90', '90+'] as const
export type Bucket = typeof BUCKETS[number]

export function bucketOf(dueDate: string, asAt: string): Bucket {
  const days = Math.floor((Date.parse(asAt) - Date.parse(dueDate)) / 86400000)
  if (days <= 0) return 'current'
  if (days <= 30) return '1-30'
  if (days <= 60) return '31-60'
  if (days <= 90) return '61-90'
  return '90+'
}

export interface AgeRow {
  id: string
  name: string
  buckets: Record<Bucket, number>
  total: number
}

function age<T extends Invoice | Bill>(
  docs: T[], asAt: string, nameOf: (d: T) => string, totalOf: (d: T) => number,
): { rows: AgeRow[]; totals: Record<Bucket, number>; grand: number } {
  const map = new Map<string, AgeRow>()
  const totals = Object.fromEntries(BUCKETS.map(b => [b, 0])) as Record<Bucket, number>

  docs.forEach(doc => {
    if (doc.date > asAt) return
    const key = nameOf(doc)
    const row = map.get(key) ?? {
      id: key, name: key,
      buckets: Object.fromEntries(BUCKETS.map(b => [b, 0])) as Record<Bucket, number>,
      total: 0,
    }
    const b = bucketOf(doc.dueDate, asAt)
    const amt = totalOf(doc)
    row.buckets[b] += amt
    row.total += amt
    totals[b] += amt
    map.set(key, row)
  })

  const rows = [...map.values()].sort((a, b) => b.total - a.total)
  return { rows, totals, grand: rows.reduce((s, r) => s + r.total, 0) }
}

/** Unpaid customer invoices grouped by customer and days overdue. */
export function receivablesAgeing(d: DB, asAt: string) {
  const open = openInvoices(d).map(r => r.doc)
  return age(open, asAt,
    i => d.partners.find(p => p.id === i.partnerId)?.name ?? 'Unknown customer',
    // Age what is still owed, not the invoice face value — part-payments count.
    i => balanceDue(d, 'invoice', i.id, invoiceTotals(i).total))
}

/** Unpaid vendor bills grouped by vendor and days overdue. */
export function payablesAgeing(d: DB, asAt: string) {
  const open = openBills(d).map(r => r.doc)
  return age(open, asAt,
    b => d.partners.find(p => p.id === b.partnerId)?.name ?? 'Unknown vendor',
    b => balanceDue(d, 'bill', b.id, billTotals(b).total))
}

/** VAT/GST return: output tax charged less input tax reclaimable. */
export function vatReturn(d: DB, from: string, to: string) {
  const inRange = (date: string) => date >= from && date <= to

  // Quotes and pro-formas are not taxable supplies; credit notes reverse one.
  const sales = d.invoices.filter(i => isPosted(i) && i.status !== 'draft' && inRange(i.date))
  const sign = (i: Invoice) => (i.kind === 'credit' ? -1 : 1)
  const salesNet = sales.reduce((s, i) => s + sign(i) * invoiceTotals(i).net, 0)
  const outputTax = sales.reduce((s, i) => s + sign(i) * invoiceTotals(i).tax, 0)

  const purchaseNet = d.bills.filter(b => b.status !== 'draft' && inRange(b.date))
    .reduce((s, b) => s + billTotals(b).net, 0)
    + d.expenses.filter(e => inRange(e.date)).reduce((s, e) => s + expenseTotals(e).net, 0)
  const inputTax = d.bills.filter(b => b.status !== 'draft' && inRange(b.date))
    .reduce((s, b) => s + billTotals(b).tax, 0)
    + d.expenses.filter(e => inRange(e.date)).reduce((s, e) => s + expenseTotals(e).tax, 0)

  return {
    salesNet, outputTax, purchaseNet, inputTax,
    payable: outputTax - inputTax,
  }
}

/** Revenue ranking with share of total, for the "who matters" question. */
export function topCustomers(d: DB, limit = 10) {
  const map = new Map<string, number>()
  d.invoices.filter(i => isPosted(i) && i.status !== 'draft').forEach(i => {
    const name = d.partners.find(p => p.id === i.partnerId)?.name ?? 'Unknown'
    const sign = i.kind === 'credit' ? -1 : 1
    map.set(name, (map.get(name) || 0) + sign * invoiceTotals(i).net)
  })
  const total = [...map.values()].reduce((s, v) => s + v, 0) || 1
  return [...map.entries()]
    .map(([name, value]) => ({ name, value, share: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

/** Cash in/out derived from the ledger's bank account movements. */
export function cashSummary(d: DB, upTo: string) {
  const tb = trialBalance(d, upTo)
  const rows = tb.filter(b => b.account.code === '1000' || b.account.code === '1010')
  return {
    received: rows.reduce((s, b) => s + b.debit, 0),
    spent: rows.reduce((s, b) => s + b.credit, 0),
    balance: rows.reduce((s, b) => s + b.balance, 0),
  }
}

/* ---------- CSV export ---------- */

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function ageingCSV(rows: AgeRow[]) {
  return toCSV(['Name', ...BUCKETS, 'Total'],
    rows.map(r => [r.name, ...BUCKETS.map(b => r.buckets[b].toFixed(2)), r.total.toFixed(2)]))
}

export function fmt(v: number) { return money(v) }
