/**
 * Nova ERP double-entry engine.
 *
 * Journal entries are *derived* from business documents rather than typed by hand,
 * so the books can never drift from operations — plus manual entries are supported
 * for adjustments. Every generated entry is balanced by construction.
 */
import {
  DB, JournalEntry, JournalLine, Account, Bill, Expense, Invoice, Payment,
  invoiceTotals, billTotals, expenseTotals, paymentsFor, uid,
} from './db'
import { cashAccount } from './payments'

export { billTotals, expenseTotals }

const line = (account: string, debit: number, credit: number): JournalLine =>
  ({ account, debit: round(debit), credit: round(credit) })

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

function invoiceEntries(inv: Invoice): JournalEntry[] {
  if (inv.status === 'draft') return []
  const t = invoiceTotals(inv)
  const out: JournalEntry[] = [{
    id: 'je-inv-' + inv.id, date: inv.date, ref: inv.number,
    memo: 'Customer invoice', source: 'invoice',
    lines: [
      line('1100', t.total, 0),  // AR
      line('4000', 0, t.net),    // Revenue
      ...(t.tax ? [line('2100', 0, t.tax)] : []), // VAT payable
    ],
  }]
  return out
}

function billEntries(b: Bill): JournalEntry[] {
  if (b.status === 'draft') return []
  const t = billTotals(b)
  const byAccount = new Map<string, number>()
  b.lines.forEach(l => {
    const amt = l.qty * l.price
    byAccount.set(l.account, (byAccount.get(l.account) || 0) + amt)
  })
  const out: JournalEntry[] = [{
    id: 'je-bill-' + b.id, date: b.date, ref: b.number,
    memo: 'Vendor bill', source: 'bill',
    lines: [
      ...[...byAccount].map(([acc, amt]) => line(acc, amt, 0)),
      ...(t.tax ? [line('1400', t.tax, 0)] : []), // VAT receivable
      line('2000', 0, t.total),                   // AP
    ],
  }]
  return out
}

/**
 * Cash side of the books. A receipt moves money from receivables into the bank
 * (or cash box); a disbursement clears payables. Payments pointing at a deleted
 * document are ignored so the ledger can never reference a ghost.
 */
function paymentEntries(d: DB): JournalEntry[] {
  return d.payments.flatMap((p): JournalEntry[] => {
    if (p.docType === 'invoice' && !d.invoices.some(i => i.id === p.docId)) return []
    if (p.docType === 'bill' && !d.bills.some(b => b.id === p.docId)) return []
    const cash = cashAccount(p)
    const label = docLabelFor(d, p)
    return [{
      id: 'je-pay-' + p.id, date: p.date, ref: p.ref || label,
      memo: p.kind === 'in' ? `Payment received · ${label}` : `Payment made · ${label}`,
      source: 'payment',
      lines: p.kind === 'in'
        ? [line(cash, p.amount, 0), line('1100', 0, p.amount)]
        : [line('2000', p.amount, 0), line(cash, 0, p.amount)],
    }]
  })
}

function docLabelFor(d: DB, p: Payment) {
  if (p.docType === 'invoice') return d.invoices.find(i => i.id === p.docId)?.number ?? 'invoice'
  if (p.docType === 'bill') return d.bills.find(b => b.id === p.docId)?.number ?? 'bill'
  return 'on account'
}

/**
 * Backwards compatibility: a pre-v3 document flagged `paid` with no payment
 * record still has to settle, otherwise importing an old backup would leave
 * receivables permanently outstanding.
 */
function legacySettlement(d: DB): JournalEntry[] {
  const out: JournalEntry[] = []
  d.invoices.forEach(i => {
    if (i.status === 'paid' && paymentsFor(d, 'invoice', i.id).length === 0) {
      const t = invoiceTotals(i).total
      out.push({
        id: 'je-invpay-' + i.id, date: i.date, ref: i.number,
        memo: 'Customer payment received', source: 'payment',
        lines: [line('1000', t, 0), line('1100', 0, t)],
      })
    }
  })
  d.bills.forEach(b => {
    if (b.status === 'paid' && paymentsFor(d, 'bill', b.id).length === 0) {
      const t = billTotals(b).total
      out.push({
        id: 'je-billpay-' + b.id, date: b.date, ref: b.number,
        memo: 'Vendor payment', source: 'payment',
        lines: [line('2000', t, 0), line('1000', 0, t)],
      })
    }
  })
  return out
}

function expenseEntries(e: Expense): JournalEntry[] {
  const t = expenseTotals(e)
  // Paid by the company -> credit bank. Paid by an employee -> credit a liability
  // until reimbursed, then it becomes a bank payment.
  const credit = e.paidBy === 'company' || e.reimbursed ? '1000' : '2200'
  return [{
    id: 'je-exp-' + e.id, date: e.date, ref: 'EXP', memo: e.label || 'Expense',
    source: 'expense',
    lines: [
      line(e.account, t.net, 0),
      ...(t.tax ? [line('1400', t.tax, 0)] : []),
      line(credit, 0, t.total),
    ],
  }]
}

/** The full journal: derived document entries + manual adjustments, date-sorted. */
export function journal(d: DB): JournalEntry[] {
  return [
    ...d.invoices.flatMap(invoiceEntries),
    ...d.bills.flatMap(billEntries),
    ...d.expenses.flatMap(expenseEntries),
    ...paymentEntries(d),
    ...legacySettlement(d),
    ...d.manualEntries,
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export interface Balance { account: Account; debit: number; credit: number; balance: number }

/** Trial balance. `balance` is signed in the account's natural direction. */
export function trialBalance(d: DB, upTo?: string): Balance[] {
  const totals = new Map<string, { debit: number; credit: number }>()
  journal(d).forEach(e => {
    if (upTo && e.date > upTo) return
    e.lines.forEach(l => {
      const cur = totals.get(l.account) || { debit: 0, credit: 0 }
      cur.debit += l.debit
      cur.credit += l.credit
      totals.set(l.account, cur)
    })
  })
  return d.accounts.map(account => {
    const t = totals.get(account.code) || { debit: 0, credit: 0 }
    const natural = account.type === 'asset' || account.type === 'expense'
    return {
      account,
      debit: round(t.debit),
      credit: round(t.credit),
      balance: round(natural ? t.debit - t.credit : t.credit - t.debit),
    }
  })
}

export function profitAndLoss(d: DB, upTo?: string) {
  const tb = trialBalance(d, upTo)
  const income = tb.filter(b => b.account.type === 'income')
  const expense = tb.filter(b => b.account.type === 'expense')
  const revenue = round(income.reduce((s, b) => s + b.balance, 0))
  const costs = round(expense.reduce((s, b) => s + b.balance, 0))
  return { income, expense, revenue, costs, net: round(revenue - costs) }
}

export function balanceSheet(d: DB, upTo?: string) {
  const tb = trialBalance(d, upTo)
  const pick = (t: Account['type']) => tb.filter(b => b.account.type === t && b.balance !== 0)
  const sum = (rows: Balance[]) => round(rows.reduce((s, b) => s + b.balance, 0))
  const assets = pick('asset'), liabilities = pick('liability'), equity = pick('equity')
  const retained = profitAndLoss(d, upTo).net
  return {
    assets, liabilities, equity,
    totalAssets: sum(assets),
    totalLiabilities: sum(liabilities),
    totalEquity: round(sum(equity) + retained),
    retained,
  }
}

/** Sanity check surfaced in the UI: total debits must equal total credits. */
export function journalIsBalanced(d: DB) {
  let dr = 0, cr = 0
  journal(d).forEach(e => e.lines.forEach(l => { dr += l.debit; cr += l.credit }))
  return { debit: round(dr), credit: round(cr), ok: Math.abs(dr - cr) < 0.01 }
}

export function newManualEntry(date: string): JournalEntry {
  return {
    id: uid(), date, ref: 'ADJ', memo: '', source: 'manual',
    lines: [{ account: '1000', debit: 0, credit: 0 }, { account: '3000', debit: 0, credit: 0 }],
  }
}
