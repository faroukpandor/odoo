/**
 * Customer statements — the document every bookkeeper asks for and most
 * lightweight tools miss: what a customer was invoiced, what they paid, and
 * what is left, in one running balance.
 */
import { DB, ID, Invoice, invoiceTotals, round2 } from './db'
import { bucketOf, BUCKETS, Bucket } from './reports'

export interface StatementRow {
  date: string
  ref: string
  kind: 'invoice' | 'credit' | 'payment'
  description: string
  charge: number
  paid: number
  balance: number
}

export interface Statement {
  partnerId: ID
  name: string
  from: string
  to: string
  opening: number
  rows: StatementRow[]
  closing: number
  ageing: Record<Bucket, number>
  overdue: number
}

const sign = (i: Invoice) => (i.kind === 'credit' ? -1 : 1)

/** Running account for one customer between two dates. */
export function statement(d: DB, partnerId: ID, from: string, to: string): Statement {
  const name = d.partners.find(p => p.id === partnerId)?.name ?? 'Unknown customer'
  const docs = d.invoices.filter(i =>
    i.partnerId === partnerId && i.status !== 'draft' && (i.kind === 'invoice' || i.kind === 'credit'))
  const pays = d.payments.filter(p => {
    if (p.docType !== 'invoice') return p.partnerId === partnerId && p.kind === 'in'
    return docs.some(i => i.id === p.docId)
  })

  const movement = [
    ...docs.map(i => ({
      date: i.date, ref: i.number, kind: (i.kind === 'credit' ? 'credit' : 'invoice') as StatementRow['kind'],
      description: i.kind === 'credit' ? 'Credit note' : 'Invoice',
      charge: round2(sign(i) * invoiceTotals(i).total), paid: 0,
    })),
    ...pays.map(p => ({
      date: p.date, ref: p.ref || 'Payment', kind: 'payment' as const,
      description: p.method === 'credit' ? 'Credit applied' : p.kind === 'in' ? 'Payment received' : 'Refund paid',
      charge: 0, paid: round2(p.kind === 'in' ? p.amount : -p.amount),
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const opening = round2(movement
    .filter(m => m.date < from)
    .reduce((s, m) => s + m.charge - m.paid, 0))

  let balance = opening
  const rows: StatementRow[] = movement
    .filter(m => m.date >= from && m.date <= to)
    .map(m => {
      balance = round2(balance + m.charge - m.paid)
      return { ...m, balance }
    })

  // Ageing of what is still open at the statement date.
  const ageing = Object.fromEntries(BUCKETS.map(b => [b, 0])) as Record<Bucket, number>
  let overdue = 0
  docs.filter(i => i.kind === 'invoice' && i.date <= to).forEach(i => {
    const total = invoiceTotals(i).total
    const paid = d.payments
      .filter(p => p.docType === 'invoice' && p.docId === i.id && p.date <= to)
      .reduce((s, p) => s + (p.kind === 'in' ? p.amount : -p.amount), 0)
    const due = round2(total - paid)
    if (due <= 0.005) return
    const b = bucketOf(i.dueDate, to)
    ageing[b] += due
    if (b !== 'current') overdue += due
  })

  return {
    partnerId, name, from, to, opening, rows,
    closing: round2(balance), ageing, overdue: round2(overdue),
  }
}

/** Customers with any activity, for the statement picker. */
export function statementPartners(d: DB) {
  return d.partners
    .filter(p => p.kind !== 'supplier')
    .map(p => ({
      ...p,
      balance: round2(
        d.invoices
          .filter(i => i.partnerId === p.id && i.status !== 'draft' && (i.kind === 'invoice' || i.kind === 'credit'))
          .reduce((s, i) => s + sign(i) * invoiceTotals(i).total, 0)
        - d.payments
          .filter(x => x.partnerId === p.id)
          .reduce((s, x) => s + (x.kind === 'in' ? x.amount : -x.amount), 0),
      ),
    }))
    .sort((a, b) => b.balance - a.balance)
}

export function statementText(s: Statement, cur: string) {
  const f = (v: number) => `${cur} ${v.toFixed(2)}`
  return [
    `Statement of account — ${s.name}`,
    `${s.from} to ${s.to}`,
    `Opening balance: ${f(s.opening)}`,
    ...s.rows.map(r => `${r.date}  ${r.ref}  ${r.description}  ${r.charge ? f(r.charge) : f(-r.paid)}  → ${f(r.balance)}`),
    `Closing balance: ${f(s.closing)}`,
    s.overdue > 0 ? `Overdue: ${f(s.overdue)}` : 'Nothing overdue — thank you.',
  ].join('\n')
}
