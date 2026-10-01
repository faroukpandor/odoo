/**
 * Workspace health.
 *
 * With no server there is no database constraint to catch a broken reference
 * or a duplicated invoice number, so the checks live here and run on demand.
 * Every finding names the record and says what to do about it; nothing is
 * repaired behind the user's back except where the fix is unambiguous.
 */
import { DB, ID, invoiceTotals, billTotals, round2 } from './db'
import { journal, journalIsBalanced } from './accounting'
import { isPosted } from './payments'

export type Severity = 'error' | 'warning' | 'info'

export interface Finding {
  id: string
  severity: Severity
  title: string
  detail: string
  /** Where the user should go to deal with it. */
  to: string
  count: number
  /** Set when Nova can repair it safely and reversibly. */
  fixable?: boolean
}

export interface Health {
  findings: Finding[]
  errors: number
  warnings: number
  score: number
  checkedAt: string
}

const dupes = <T>(values: T[]) => {
  const seen = new Set<T>(); const out = new Set<T>()
  values.forEach(v => (seen.has(v) ? out.add(v) : seen.add(v)))
  return [...out]
}

export function checkWorkspace(d: DB, now = new Date().toISOString()): Health {
  const f: Finding[] = []
  const partnerIds = new Set<ID>(d.partners.map(p => p.id))
  const productIds = new Set<ID>(d.products.map(p => p.id))
  const invoiceIds = new Set<ID>(d.invoices.map(i => i.id))
  const billIds = new Set<ID>(d.bills.map(b => b.id))

  const add = (x: Finding) => { if (x.count > 0) f.push(x) }

  // --- references that point nowhere -------------------------------------
  add({
    id: 'orphan-invoice-partner', severity: 'error', to: '/invoices',
    title: 'Documents pointing at a deleted customer',
    detail: 'They still post to the ledger but cannot be sent or aged correctly.',
    count: d.invoices.filter(i => i.partnerId && !partnerIds.has(i.partnerId)).length,
  })
  add({
    id: 'orphan-bill-partner', severity: 'error', to: '/purchases',
    title: 'Bills pointing at a deleted supplier',
    detail: 'Reassign them, or the payables ageing will not agree with the ledger.',
    count: d.bills.filter(b => b.partnerId && !partnerIds.has(b.partnerId)).length,
  })
  add({
    id: 'orphan-payment-doc', severity: 'error', to: '/banking', fixable: true,
    title: 'Payments allocated to a document that no longer exists',
    detail: 'Nova can turn these into payments on account so the cash stays, unallocated.',
    count: d.payments.filter(p =>
      (p.docType === 'invoice' && p.docId && !invoiceIds.has(p.docId)) ||
      (p.docType === 'bill' && p.docId && !billIds.has(p.docId))).length,
  })
  add({
    id: 'orphan-move', severity: 'warning', to: '/inventory', fixable: true,
    title: 'Stock movements for a deleted product',
    detail: 'They inflate nothing on their own, but they clutter the move ledger.',
    count: d.moves.filter(m => !productIds.has(m.productId)).length,
  })

  // --- numbering ----------------------------------------------------------
  add({
    id: 'duplicate-numbers', severity: 'error', to: '/invoices',
    title: 'Duplicate document numbers',
    detail: `Repeated: ${dupes(d.invoices.map(i => i.number)).slice(0, 5).join(', ')}. ` +
      'Most tax authorities require a unique, unbroken sequence.',
    count: dupes(d.invoices.map(i => i.number)).length,
  })
  add({
    id: 'duplicate-bill-numbers', severity: 'warning', to: '/purchases',
    title: 'Duplicate bill numbers',
    detail: 'Usually means the same supplier invoice was captured twice.',
    count: dupes(d.bills.map(b => b.number)).length,
  })

  // --- money that cannot be right -----------------------------------------
  add({
    id: 'overpaid', severity: 'warning', to: '/banking',
    title: 'Documents paid for more than they are worth',
    detail: 'Either a payment was allocated twice, or the customer overpaid and needs a credit note.',
    count: d.invoices.filter(i =>
      isPosted(i) && round2(paid(d, 'invoice', i.id) - invoiceTotals(i).total) > 0.005).length
      + d.bills.filter(b => round2(paid(d, 'bill', b.id) - billTotals(b).total) > 0.005).length,
  })
  add({
    id: 'negative-line', severity: 'warning', to: '/invoices',
    title: 'Documents with a negative or zero total',
    detail: 'Raise a credit note instead of a negative invoice — the tax return depends on it.',
    count: d.invoices.filter(i => i.kind === 'invoice' && invoiceTotals(i).total <= 0).length,
  })
  add({
    id: 'future-dated', severity: 'info', to: '/invoices',
    title: 'Documents dated in the future',
    detail: 'Fine if deliberate; they will not appear in reports until that date.',
    count: d.invoices.filter(i => i.date > new Date().toISOString().slice(0, 10)).length,
  })

  // --- the ledger itself ---------------------------------------------------
  const balance = journalIsBalanced(d)
  add({
    id: 'unbalanced-journal', severity: 'error', to: '/accounting',
    title: 'The journal does not balance',
    detail: `Debits and credits differ by ${Math.abs(balance.debit - balance.credit).toFixed(2)}. ` +
      'This should be impossible — please export a backup and report it.',
    count: balance.ok ? 0 : 1,
  })
  add({
    id: 'unknown-account', severity: 'warning', to: '/accounting',
    title: 'Postings to an account that is not in your chart',
    detail: 'Add the account, or recode the lines, so the trial balance stays complete.',
    count: journal(d).flatMap(e => e.lines)
      .filter(l => !d.accounts.some(a => a.code === l.account)).length,
  })

  // --- things that make the workspace unusable later -----------------------
  add({
    id: 'no-owner', severity: 'error', to: '/settings', fixable: true,
    title: 'No active owner on this workspace',
    detail: 'Somebody must be able to administer the team and the company settings.',
    count: d.users.some(u => u.role === 'owner' && u.active) ? 0 : 1,
  })
  add({
    id: 'no-company-name', severity: 'warning', to: '/settings',
    title: 'Your company is still called “My Company”',
    detail: 'It prints on every document you send.',
    count: !d.company.name || d.company.name === 'My Company' ? 1 : 0,
  })
  add({
    id: 'unreconciled-age', severity: 'info', to: '/banking',
    title: 'Imported bank lines still unmatched',
    detail: 'Match them so the reconciliation proves the books against the bank.',
    count: d.statementLines.filter(l => !l.matchedPaymentId).length,
  })

  const errors = f.filter(x => x.severity === 'error').length
  const warnings = f.filter(x => x.severity === 'warning').length
  const score = Math.max(0, 100 - errors * 20 - warnings * 7)
  return { findings: f, errors, warnings, score, checkedAt: now }
}

const paid = (d: DB, type: 'invoice' | 'bill', id: ID) =>
  d.payments.filter(p => p.docType === type && p.docId === id)
    .reduce((s, p) => s + p.amount, 0)

/**
 * Repairs only what has one obviously correct answer: dangling allocations
 * become payments on account, orphan stock moves are dropped, and a workspace
 * with no owner promotes its first user.
 */
export function repairWorkspace(d: DB): string[] {
  const done: string[] = []
  const invoiceIds = new Set(d.invoices.map(i => i.id))
  const billIds = new Set(d.bills.map(b => b.id))
  const productIds = new Set(d.products.map(p => p.id))

  let unallocated = 0
  d.payments.forEach(p => {
    const dangling = (p.docType === 'invoice' && p.docId && !invoiceIds.has(p.docId))
      || (p.docType === 'bill' && p.docId && !billIds.has(p.docId))
    if (dangling) { p.docType = null; p.docId = null; unallocated++ }
  })
  if (unallocated) done.push(`${unallocated} payment${unallocated > 1 ? 's' : ''} moved to “on account”`)

  const before = d.moves.length
  d.moves = d.moves.filter(m => productIds.has(m.productId))
  if (d.moves.length !== before) done.push(`${before - d.moves.length} orphan stock movements removed`)

  if (!d.users.some(u => u.role === 'owner' && u.active)) {
    const first = d.users[0]
    if (first) { first.role = 'owner'; first.active = true; d.currentUserId = first.id; done.push(`${first.name} promoted to owner`) }
  }
  return done
}
