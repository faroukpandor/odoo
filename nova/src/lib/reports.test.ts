import { describe, it, expect, beforeEach } from 'vitest'
import { resetDB, update, getDB, uid, type Invoice, type Bill } from './db'
import {
  bucketOf, receivablesAgeing, payablesAgeing, vatReturn, topCustomers,
  cashSummary, toCSV,
} from './reports'

const ASAT = '2025-06-30'

beforeEach(() => {
  resetDB()
  update(d => {
    d.invoices = []; d.bills = []; d.expenses = []; d.manualEntries = []
    d.partners = [
      { id: 'c1', name: 'Alpha', email: '', phone: '', kind: 'customer', stage: 'won', value: 0, note: '', createdAt: '2025-01-01' },
      { id: 'c2', name: 'Beta', email: '', phone: '', kind: 'customer', stage: 'won', value: 0, note: '', createdAt: '2025-01-01' },
      { id: 'v1', name: 'Vendor', email: '', phone: '', kind: 'supplier', stage: 'won', value: 0, note: '', createdAt: '2025-01-01' },
    ]
  })
})

const inv = (o: Partial<Invoice>): Invoice => ({
  id: uid(), number: 'INV', partnerId: 'c1', date: '2025-01-01', dueDate: '2025-01-31',
  status: 'sent', currency: 'BWP', note: '',
  lines: [{ productId: null, label: 'x', qty: 1, price: 1000, taxRate: 10 }], ...o,
})

const bill = (o: Partial<Bill>): Bill => ({
  id: uid(), number: 'BILL', partnerId: 'v1', date: '2025-01-01', dueDate: '2025-01-31',
  status: 'received', currency: 'BWP', note: '',
  lines: [{ label: 'x', qty: 1, price: 500, taxRate: 10, account: '6900' }], ...o,
})

describe('ageing buckets', () => {
  it('classifies by days past due', () => {
    expect(bucketOf('2025-07-31', ASAT)).toBe('current')
    expect(bucketOf('2025-06-30', ASAT)).toBe('current')
    expect(bucketOf('2025-06-15', ASAT)).toBe('1-30')
    expect(bucketOf('2025-05-15', ASAT)).toBe('31-60')
    expect(bucketOf('2025-04-15', ASAT)).toBe('61-90')
    expect(bucketOf('2024-01-01', ASAT)).toBe('90+')
  })

  it('ages receivables per customer and excludes paid and draft invoices', () => {
    update(d => {
      d.invoices.push(
        inv({ partnerId: 'c1', dueDate: '2025-06-20' }),          // 1-30
        inv({ partnerId: 'c1', dueDate: '2024-01-01' }),          // 90+
        inv({ partnerId: 'c2', dueDate: '2025-12-01' }),          // current
        inv({ partnerId: 'c2', status: 'paid' }),                 // excluded
        inv({ partnerId: 'c2', status: 'draft' }),                // excluded
      )
    })
    const ar = receivablesAgeing(getDB(), ASAT)
    expect(ar.grand).toBeCloseTo(3300)
    expect(ar.totals['1-30']).toBeCloseTo(1100)
    expect(ar.totals['90+']).toBeCloseTo(1100)
    expect(ar.totals.current).toBeCloseTo(1100)
    expect(ar.rows.find(r => r.name === 'Alpha')!.total).toBeCloseTo(2200)
  })

  it('ignores documents dated after the as-at date', () => {
    update(d => { d.invoices.push(inv({ date: '2030-01-01' })) })
    expect(receivablesAgeing(getDB(), ASAT).grand).toBe(0)
  })

  it('ages payables and drops settled bills', () => {
    update(d => { d.bills.push(bill({}), bill({ status: 'paid' })) })
    const ap = payablesAgeing(getDB(), ASAT)
    expect(ap.grand).toBeCloseTo(550)
  })
})

describe('VAT return', () => {
  it('nets output tax against input tax within the period', () => {
    update(d => {
      d.invoices.push(inv({ date: '2025-03-01' }))                 // output 100
      d.bills.push(bill({ date: '2025-03-02' }))                   // input 50
      d.expenses.push({ id: uid(), date: '2025-03-03', label: 'e', amount: 100, taxRate: 10, account: '6400', paidBy: 'company', reimbursed: true, note: '' }) // input 10
    })
    const v = vatReturn(getDB(), '2025-01-01', ASAT)
    expect(v.outputTax).toBeCloseTo(100)
    expect(v.inputTax).toBeCloseTo(60)
    expect(v.payable).toBeCloseTo(40)
    expect(v.salesNet).toBeCloseTo(1000)
  })

  it('excludes documents outside the period', () => {
    update(d => { d.invoices.push(inv({ date: '2024-01-01' })) })
    expect(vatReturn(getDB(), '2025-01-01', ASAT).outputTax).toBe(0)
  })
})

describe('customer analytics and cash', () => {
  it('ranks customers by revenue share', () => {
    update(d => {
      d.invoices.push(
        inv({ partnerId: 'c1' }),
        inv({ partnerId: 'c1' }),
        inv({ partnerId: 'c2' }),
      )
    })
    const t = topCustomers(getDB())
    expect(t[0].name).toBe('Alpha')
    expect(t[0].share).toBeCloseTo(66.67, 1)
    expect(t).toHaveLength(2)
  })

  it('derives cash movement from the bank ledger', () => {
    update(d => {
      d.invoices.push(inv({ status: 'paid' }))        // +1100 in
      d.bills.push(bill({ status: 'paid' }))          // -550 out
    })
    const c = cashSummary(getDB(), ASAT)
    expect(c.received).toBeCloseTo(1100)
    expect(c.spent).toBeCloseTo(550)
    expect(c.balance).toBeCloseTo(550)
  })
})

describe('CSV export', () => {
  it('escapes quotes, commas and newlines', () => {
    const csv = toCSV(['a', 'b'], [['plain', 'has,comma'], ['say "hi"', 'line\nbreak']])
    expect(csv.split('\n')[0]).toBe('a,b')
    expect(csv).toContain('"has,comma"')
    expect(csv).toContain('"say ""hi"""')
    expect(csv).toContain('"line')
  })
})
