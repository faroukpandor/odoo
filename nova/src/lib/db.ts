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

  return {
    version: 1,
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
  }
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch { /* corrupted storage -> reseed */ }
  const s = seed()
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ }
  return s
}

let state: DB = load()
const listeners = new Set<() => void>()

function commit(next: DB) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota */ }
  listeners.forEach(l => l())
}

export function getDB(): DB { return state }

export function update(fn: (d: DB) => void) {
  const next: DB = JSON.parse(JSON.stringify(state))
  fn(next)
  commit(next)
}

export function replaceDB(next: DB) { commit(next) }

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
  return inv.status !== 'paid' && inv.dueDate < today()
}

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
