/**
 * Nova ERP local-first data layer.
 *
 * Everything lives in the browser (localStorage today, pluggable later).
 * No server, no vendor lock-in: the whole company database is a JSON document
 * you can export, email, version-control or re-import at any time.
 */
import { useSyncExternalStore } from 'react'

export type ID = string

export interface Partner {
  id: ID
  name: string
  email: string
  phone: string
  kind: 'customer' | 'supplier' | 'both'
  stage: 'lead' | 'qualified' | 'proposal' | 'won' | 'lost'
  value: number
  note: string
  createdAt: string
}

export interface Product {
  id: ID
  sku: string
  name: string
  price: number
  cost: number
  qty: number
  reorderPoint: number
  uom: string
}

export interface InvoiceLine {
  productId: ID | null
  label: string
  qty: number
  price: number
  taxRate: number
}

export interface Invoice {
  id: ID
  number: string
  partnerId: ID | null
  date: string
  dueDate: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  lines: InvoiceLine[]
  currency: string
  note: string
}

export interface StockMove {
  id: ID
  productId: ID
  qty: number
  kind: 'in' | 'out' | 'adjust'
  ref: string
  date: string
}

export interface BillLine {
  label: string
  qty: number
  price: number
  taxRate: number
  account: string      // expense or inventory account code
}

export interface Bill {
  id: ID
  number: string
  partnerId: ID | null
  date: string
  dueDate: string
  status: 'draft' | 'received' | 'paid'
  lines: BillLine[]
  currency: string
  note: string
}

export interface Expense {
  id: ID
  date: string
  label: string
  amount: number
  taxRate: number
  account: string
  paidBy: 'company' | 'employee'
  reimbursed: boolean
  note: string
}

export interface Payment {
  id: ID
  date: string
  /** `in` = money received from a customer, `out` = money paid to a vendor. */
  kind: 'in' | 'out'
  partnerId: ID | null
  /** What the money settles. `null` = payment on account (unallocated). */
  docType: 'invoice' | 'bill' | null
  docId: ID | null
  amount: number
  method: 'bank' | 'cash'
  ref: string
  /** True once the payment has been ticked off against a bank statement. */
  reconciled: boolean
  statementLineId: ID | null
}

/** A line imported from a bank statement, awaiting matching. */
export interface StatementLine {
  id: ID
  date: string
  description: string
  /** Signed: positive = money in, negative = money out. */
  amount: number
  matchedPaymentId: ID | null
}

export interface Account {
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
}

export interface JournalLine {
  account: string
  debit: number
  credit: number
}

export interface JournalEntry {
  id: ID
  date: string
  ref: string
  memo: string
  source: 'invoice' | 'bill' | 'expense' | 'payment' | 'manual'
  lines: JournalLine[]
}

export interface Company {
  name: string
  email: string
  address: string
  currency: string
  taxRate: number
  vatId: string
}

export interface DB {
  version: number
  company: Company
  partners: Partner[]
  products: Product[]
  invoices: Invoice[]
  moves: StockMove[]
  bills: Bill[]
  expenses: Expense[]
  payments: Payment[]
  statementLines: StatementLine[]
  accounts: Account[]
  manualEntries: JournalEntry[]
}

const KEY = 'nova-erp-db-v1'

export const uid = (): ID =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

export const today = () => new Date().toISOString().slice(0, 10)

const addDays = (d: string, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x.toISOString().slice(0, 10)
}

function seed(): DB {
  const p1: Partner = {
    id: uid(), name: 'Kalahari Fresh Foods', email: 'orders@kalaharifresh.co.bw',
    phone: '+267 71 000 111', kind: 'customer', stage: 'won', value: 48000,
    note: 'Monthly wholesale order.', createdAt: today(),
  }
  const p2: Partner = {
    id: uid(), name: 'Gaborone Tech Hub', email: 'hello@gabtech.io',
    phone: '+267 72 555 222', kind: 'customer', stage: 'proposal', value: 120000,
    note: 'ERP rollout for 40 seats.', createdAt: today(),
  }
  const p3: Partner = {
    id: uid(), name: 'Southern Supply Co', email: 'sales@southernsupply.com',
    phone: '+27 11 444 9090', kind: 'supplier', stage: 'qualified', value: 0,
    note: 'Primary hardware supplier.', createdAt: today(),
  }
  const a: Product = { id: uid(), sku: 'SVC-IMPL', name: 'Implementation day', price: 4500, cost: 1800, qty: 999, reorderPoint: 0, uom: 'day' }
  const b: Product = { id: uid(), sku: 'HW-POS1', name: 'POS terminal', price: 6200, cost: 4100, qty: 12, reorderPoint: 5, uom: 'unit' }
  const c: Product = { id: uid(), sku: 'HW-SCAN', name: 'Barcode scanner', price: 890, cost: 520, qty: 3, reorderPoint: 8, uom: 'unit' }

  const inv: Invoice = {
    id: uid(), number: 'INV-0001', partnerId: p1.id, date: today(),
    dueDate: addDays(today(), 30), status: 'sent', currency: 'BWP', note: '',
    lines: [
      { productId: b.id, label: 'POS terminal', qty: 2, price: 6200, taxRate: 14 },
      { productId: a.id, label: 'Implementation day', qty: 3, price: 4500, taxRate: 14 },
    ],
  }

  const bill: Bill = {
    id: uid(), number: 'BILL-0001', partnerId: p3.id, date: today(),
    dueDate: addDays(today(), 14), status: 'received', currency: 'BWP', note: '',
    lines: [{ label: 'POS terminals (batch)', qty: 10, price: 4100, taxRate: 14, account: '1300' }],
  }

  const exp: Expense = {
    id: uid(), date: today(), label: 'Office internet', amount: 1200,
    taxRate: 14, account: '6300', paidBy: 'company', reimbursed: true, note: '',
  }

  // A part-payment on the open invoice, so the demo shows a realistic
  // "partially settled" document rather than a binary paid/unpaid flag.
  const pay: Payment = {
    id: uid(), date: today(), kind: 'in', partnerId: p1.id,
    docType: 'invoice', docId: inv.id, amount: 10000, method: 'bank',
    ref: 'EFT 8841', reconciled: true, statementLineId: null,
  }

  // One unmatched statement line waiting to be reconciled.
  const stmt: StatementLine[] = [
    { id: uid(), date: today(), description: 'EFT 8841 KALAHARI FRESH', amount: 10000, matchedPaymentId: pay.id },
    { id: uid(), date: today(), description: 'SOUTHERN SUPPLY CO DEBIT', amount: -46740, matchedPaymentId: null },
  ]
  stmt[0].matchedPaymentId = pay.id
  pay.statementLineId = stmt[0].id

  return {
    version: 3,
    company: {
      name: 'My Company', email: 'billing@mycompany.com',
      address: 'Gaborone, Botswana', currency: 'BWP', taxRate: 14, vatId: '',
    },
    partners: [p1, p2, p3],
    products: [a, b, c],
    invoices: [inv],
    moves: [
      { id: uid(), productId: b.id, qty: 14, kind: 'in', ref: 'Opening stock', date: today() },
      { id: uid(), productId: b.id, qty: 2, kind: 'out', ref: 'INV-0001', date: today() },
      { id: uid(), productId: c.id, qty: 3, kind: 'in', ref: 'Opening stock', date: today() },
    ],
    bills: [bill],
    expenses: [exp],
    payments: [pay],
    statementLines: stmt,
    accounts: CHART,
    manualEntries: [],
  }
}

/** Default chart of accounts — small but a genuine double-entry structure. */
export const CHART: Account[] = [
  { code: '1000', name: 'Bank', type: 'asset' },
  { code: '1010', name: 'Cash on hand', type: 'asset' },
  { code: '1100', name: 'Accounts receivable', type: 'asset' },
  { code: '1300', name: 'Inventory', type: 'asset' },
  { code: '1400', name: 'VAT receivable (input)', type: 'asset' },
  { code: '2000', name: 'Accounts payable', type: 'liability' },
  { code: '2100', name: 'VAT payable (output)', type: 'liability' },
  { code: '2200', name: 'Employee reimbursements', type: 'liability' },
  { code: '3000', name: 'Owner equity', type: 'equity' },
  { code: '4000', name: 'Sales revenue', type: 'income' },
  { code: '5000', name: 'Cost of goods sold', type: 'expense' },
  { code: '6100', name: 'Salaries & wages', type: 'expense' },
  { code: '6200', name: 'Rent', type: 'expense' },
  { code: '6300', name: 'Utilities & internet', type: 'expense' },
  { code: '6400', name: 'Travel', type: 'expense' },
  { code: '6500', name: 'Marketing', type: 'expense' },
  { code: '6900', name: 'Other operating expenses', type: 'expense' },
]

/* ---------- persistence: IndexedDB with localStorage fallback ---------- */

const IDB_NAME = 'nova-erp'
const IDB_STORE = 'kv'

function idb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    // Version 2 also provisions the snapshots store used by lib/backup.ts,
    // so either module can be the first to open the database.
    const req = indexedDB.open(IDB_NAME, 2)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains(IDB_STORE)) d.createObjectStore(IDB_STORE)
      if (!d.objectStoreNames.contains('snapshots')) d.createObjectStore('snapshots', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

async function idbGet(): Promise<DB | null> {
  const d = await idb()
  if (!d) return null
  return new Promise(resolve => {
    const r = d.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(KEY)
    r.onsuccess = () => resolve((r.result as DB) ?? null)
    r.onerror = () => resolve(null)
  })
}

async function idbPut(value: DB) {
  const d = await idb()
  if (!d) return
  d.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, KEY)
}

/** Forward-compatible migration: fills in anything a older snapshot lacks. */
export function migrate(raw: Partial<DB> | null): DB {
  if (!raw || !Array.isArray(raw.partners)) return seed()
  const base = seed()
  const invoices = raw.invoices ?? []
  const bills = raw.bills ?? []

  // v2 -> v3: documents used to carry only a binary `paid` flag. Convert each
  // settled document into a real payment so cash and documents agree.
  const payments: Payment[] = raw.payments ?? [
    ...invoices.filter(i => i.status === 'paid').map((i): Payment => ({
      id: uid(), date: i.date, kind: 'in', partnerId: i.partnerId,
      docType: 'invoice', docId: i.id, amount: invoiceTotals(i).total,
      method: 'bank', ref: i.number, reconciled: false, statementLineId: null,
    })),
    ...bills.filter(b => b.status === 'paid').map((b): Payment => ({
      id: uid(), date: b.date, kind: 'out', partnerId: b.partnerId,
      docType: 'bill', docId: b.id, amount: billTotals(b).total,
      method: 'bank', ref: b.number, reconciled: false, statementLineId: null,
    })),
  ]

  // Keep accounts the user added, but guarantee accounts introduced by newer
  // versions (e.g. cash on hand) always exist.
  const stored = raw.accounts && raw.accounts.length ? raw.accounts : CHART
  const accounts = [...stored, ...CHART.filter(c => !stored.some(a => a.code === c.code))]

  return {
    version: 3,
    company: { ...base.company, ...(raw.company || {}) },
    partners: raw.partners ?? [],
    products: raw.products ?? [],
    invoices,
    moves: raw.moves ?? [],
    bills,
    expenses: raw.expenses ?? [],
    payments,
    statementLines: raw.statementLines ?? [],
    accounts,
    manualEntries: raw.manualEntries ?? [],
  }
}

function loadSync(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch { /* corrupted or unavailable */ }
  return seed()
}

let state: DB = loadSync()
const listeners = new Set<() => void>()

/** Called once at boot: IndexedDB is the source of truth when present. */
export async function initDB(): Promise<void> {
  try {
    const stored = await idbGet()
    if (stored) {
      state = migrate(stored)
      listeners.forEach(l => l())
    }
    await idbPut(state)
  } catch { /* stay on the localStorage snapshot */ }
}

function commit(next: DB) {
  state = next
  // localStorage keeps a synchronous mirror so first paint never blocks.
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota */ }
  void idbPut(next)
  listeners.forEach(l => l())
}

export function getDB(): DB { return state }

export function update(fn: (d: DB) => void) {
  const next: DB = JSON.parse(JSON.stringify(state))
  fn(next)
  commit(next)
}

export function replaceDB(next: DB) { commit(migrate(next)) }

export function resetDB() { commit(seed()) }

export function useDB(): DB {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
    () => state,
  )
}

/* ---------- derived helpers ---------- */

export const lineNet = (l: InvoiceLine) => l.qty * l.price
export const lineTax = (l: InvoiceLine) => (lineNet(l) * l.taxRate) / 100

export const billTotals = (b: Bill) => {
  const net = b.lines.reduce((s, l) => s + l.qty * l.price, 0)
  const tax = b.lines.reduce((s, l) => s + (l.qty * l.price * l.taxRate) / 100, 0)
  return { net, tax, total: net + tax }
}

export const expenseTotals = (e: Expense) => {
  const net = e.amount
  const tax = (e.amount * e.taxRate) / 100
  return { net, tax, total: net + tax }
}

export function invoiceTotals(inv: Invoice) {
  const net = inv.lines.reduce((s, l) => s + lineNet(l), 0)
  const tax = inv.lines.reduce((s, l) => s + lineTax(l), 0)
  return { net, tax, total: net + tax }
}

export function money(v: number, currency = getDB().company.currency) {
  return new Intl.NumberFormat('en-BW', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(isFinite(v) ? v : 0)
}

export function nextInvoiceNumber(d: DB) {
  const n = d.invoices.reduce((m, i) => {
    const x = parseInt(i.number.replace(/\D/g, ''), 10)
    return isNaN(x) ? m : Math.max(m, x)
  }, 0)
  return 'INV-' + String(n + 1).padStart(4, '0')
}

export function isOverdue(inv: Invoice) {
  if (inv.status === 'draft') return false
  // Pre-v3 snapshots used a paid flag instead of payment records.
  if (inv.status === 'paid' && paymentsFor(getDB(), 'invoice', inv.id).length === 0) return false
  return balanceDue(getDB(), 'invoice', inv.id, invoiceTotals(inv).total) > 0.005
    && inv.dueDate < today()
}

/* ---------- payments ---------- */

/** Every payment allocated to a given document. */
export function paymentsFor(d: DB, docType: 'invoice' | 'bill', docId: ID) {
  return d.payments.filter(p => p.docType === docType && p.docId === docId)
}

export function paidAmount(d: DB, docType: 'invoice' | 'bill', docId: ID) {
  return round2(paymentsFor(d, docType, docId).reduce((s, p) => s + p.amount, 0))
}

export function balanceDue(d: DB, docType: 'invoice' | 'bill', docId: ID, total: number) {
  return round2(total - paidAmount(d, docType, docId))
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function stockOf(d: DB, productId: ID) {
  return d.moves.reduce((s, m) => {
    if (m.productId !== productId) return s
    if (m.kind === 'in') return s + m.qty
    if (m.kind === 'out') return s - m.qty
    return m.qty
  }, 0)
}

export function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `nova-erp-${today()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importJSON(file: File) {
  const text = await file.text()
  const parsed = JSON.parse(text) as DB
  if (!parsed || !Array.isArray(parsed.partners)) throw new Error('Not a Nova ERP backup file')
  replaceDB(parsed)
}
