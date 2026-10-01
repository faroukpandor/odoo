/**
 * Banking: payments, settlement status and bank reconciliation.
 *
 * Pure functions over the in-memory DB — no imports from the accounting engine,
 * which depends on *this* module (payments drive the cash side of the ledger).
 */
import {
  DB, ID, Invoice, Bill, Payment, StatementLine, uid,
  invoiceTotals, billTotals, paymentsFor, paidAmount, balanceDue, round2, today,
} from './db'

/** Ledger account a payment settles against, by method. */
export const cashAccount = (p: Pick<Payment, 'method'>) => (p.method === 'cash' ? '1010' : '1000')

export type DocStatus = 'draft' | 'open' | 'partial' | 'paid' | 'overdue'

export const docTotal = (doc: Invoice | Bill) =>
  'lines' in doc && (doc as Invoice).lines.some(l => 'productId' in l)
    ? invoiceTotals(doc as Invoice).total
    : billTotals(doc as Bill).total

/** Settlement state of an invoice, derived from its payments (never stored). */
export function invoiceStatus(d: DB, inv: Invoice): DocStatus {
  return settle(d, 'invoice', inv.id, invoiceTotals(inv).total, inv.status, inv.dueDate)
}

/** Settlement state of a vendor bill, derived from its payments. */
export function billStatus(d: DB, b: Bill): DocStatus {
  return settle(d, 'bill', b.id, billTotals(b).total, b.status, b.dueDate)
}

function settle(
  d: DB, type: 'invoice' | 'bill', id: ID, total: number, status: string, dueDate: string,
): DocStatus {
  if (status === 'draft') return 'draft'
  if (isLegacyPaid(d, type, id, status)) return 'paid'
  const due = balanceDue(d, type, id, total)
  if (due <= 0.005) return 'paid'
  if (dueDate < today()) return 'overdue'
  return paidAmount(d, type, id) > 0.005 ? 'partial' : 'open'
}

/** Open customer invoices with what is still owed on each. */
/**
 * Pre-v3 documents carried a `paid` flag instead of payment records. Honour it
 * when no payment exists so imported history does not reopen settled business.
 */
export function isLegacyPaid(d: DB, type: 'invoice' | 'bill', id: ID, status: string) {
  return status === 'paid' && paymentsFor(d, type, id).length === 0
}

export function openInvoices(d: DB) {
  return d.invoices
    .filter(i => i.status !== 'draft' && !isLegacyPaid(d, 'invoice', i.id, i.status))
    .map(i => ({ doc: i, due: balanceDue(d, 'invoice', i.id, invoiceTotals(i).total) }))
    .filter(r => r.due > 0.005)
}

/** Open vendor bills with what is still owed on each. */
export function openBills(d: DB) {
  return d.bills
    .filter(b => b.status !== 'draft' && !isLegacyPaid(d, 'bill', b.id, b.status))
    .map(b => ({ doc: b, due: balanceDue(d, 'bill', b.id, billTotals(b).total) }))
    .filter(r => r.due > 0.005)
}

export const totalReceivable = (d: DB) => round2(openInvoices(d).reduce((s, r) => s + r.due, 0))
export const totalPayable = (d: DB) => round2(openBills(d).reduce((s, r) => s + r.due, 0))

/** Signed cash effect of a payment: receipts add, disbursements subtract. */
export const signedAmount = (p: Payment) => (p.kind === 'in' ? p.amount : -p.amount)

/** Cash actually moved through the accounts over a period. */
export function cashFlow(d: DB, from?: string, to?: string) {
  const inRange = (date: string) => (!from || date >= from) && (!to || date <= to)
  const rows = d.payments.filter(p => inRange(p.date))
  const received = round2(rows.filter(p => p.kind === 'in').reduce((s, p) => s + p.amount, 0))
  const spent = round2(rows.filter(p => p.kind === 'out').reduce((s, p) => s + p.amount, 0))
  return { received, spent, net: round2(received - spent) }
}

/* ---------- bank reconciliation ---------- */

/**
 * Compares the statement against the payment register.
 *
 * `statementBalance` is what the bank says; `matchedBalance` is the sum of
 * payments ticked off. Anything unmatched on either side is what an accountant
 * has to explain — the module's whole reason to exist.
 */
export function reconciliation(d: DB) {
  const statementBalance = round2(d.statementLines.reduce((s, l) => s + l.amount, 0))
  const unmatchedLines = d.statementLines.filter(l => !l.matchedPaymentId)
  const unreconciled = d.payments.filter(p => !p.reconciled)
  const matchedBalance = round2(
    d.payments.filter(p => p.reconciled).reduce((s, p) => s + signedAmount(p), 0),
  )
  return {
    statementBalance,
    matchedBalance,
    difference: round2(statementBalance - matchedBalance),
    unmatchedLines,
    unreconciled,
    clean: unmatchedLines.length === 0 && unreconciled.length === 0,
  }
}

/**
 * Candidate payments for a statement line: same direction, same amount first,
 * then nearest date. Keeps matching a one-click job instead of a hunt.
 */
export function suggestPayments(d: DB, line: StatementLine): Payment[] {
  const wantKind = line.amount >= 0 ? 'in' : 'out'
  const target = Math.abs(line.amount)
  return d.payments
    .filter(p => p.kind === wantKind && !p.reconciled)
    .map(p => ({
      p,
      score: Math.abs(p.amount - target) * 100
        + Math.abs(Date.parse(p.date) - Date.parse(line.date)) / 86400000,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(x => x.p)
}

/** Open documents a statement line could settle, best amount match first. */
export function suggestDocuments(d: DB, line: StatementLine) {
  const target = Math.abs(line.amount)
  const rows = line.amount >= 0
    ? openInvoices(d).map(r => ({ type: 'invoice' as const, id: r.doc.id, label: r.doc.number, partnerId: r.doc.partnerId, due: r.due }))
    : openBills(d).map(r => ({ type: 'bill' as const, id: r.doc.id, label: r.doc.number, partnerId: r.doc.partnerId, due: r.due }))
  return rows.sort((a, b) => Math.abs(a.due - target) - Math.abs(b.due - target)).slice(0, 5)
}

/**
 * Parses a pasted bank statement. Accepts `date,description,amount` or
 * `date,description,debit,credit`, with or without a header row.
 */
export function parseStatementCSV(text: string): StatementLine[] {
  const out: StatementLine[] = []
  text.split(/\r?\n/).forEach(raw => {
    const row = splitCSVRow(raw.trim())
    if (row.length < 3) return
    const date = normaliseDate(row[0])
    if (!date) return // header or junk
    const description = row[1]
    let amount: number
    if (row.length >= 4 && (num(row[2]) !== 0 || num(row[3]) !== 0)) {
      amount = num(row[3]) - num(row[2]) // credit (in) minus debit (out)
    } else {
      amount = num(row[2])
    }
    if (!isFinite(amount) || amount === 0) return
    out.push({ id: uid(), date, description, amount: round2(amount), matchedPaymentId: null })
  })
  return out
}

function splitCSVRow(row: string): string[] {
  const cells: string[] = []
  let cur = '', quoted = false
  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (quoted) {
      if (ch === '"' && row[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',' || ch === ';' || ch === '\t') { cells.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cells.push(cur.trim())
  return cells
}

const num = (v: string) => {
  const n = parseFloat((v || '').replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'))
  return isFinite(n) ? n : 0
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY and DD-MM-YYYY. Returns ISO or ''. */
export function normaliseDate(v: string): string {
  const s = (v || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return ''
}

export function newPayment(d: DB, kind: Payment['kind']): Payment {
  return {
    id: '', date: today(), kind, partnerId: null, docType: null, docId: null,
    amount: 0, method: 'bank', ref: '', reconciled: false, statementLineId: null,
  }
}

export function paymentsCSV(d: DB) {
  const name = (id: ID | null) => d.partners.find(p => p.id === id)?.name ?? ''
  return [
    ['Date', 'Direction', 'Partner', 'Document', 'Method', 'Amount', 'Reconciled'],
    ...d.payments
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map(p => [
        p.date, p.kind === 'in' ? 'Received' : 'Paid', name(p.partnerId),
        docLabel(d, p), p.method, p.amount.toFixed(2), p.reconciled ? 'yes' : 'no',
      ]),
  ]
}

export function docLabel(d: DB, p: Payment): string {
  if (p.docType === 'invoice') return d.invoices.find(i => i.id === p.docId)?.number ?? 'Invoice'
  if (p.docType === 'bill') return d.bills.find(b => b.id === p.docId)?.number ?? 'Bill'
  return 'On account'
}
