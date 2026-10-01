import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetDB, update, getDB, uid, today, money, invoiceTotals, balanceDue,
  type Invoice, type Payment, type Recurring,
} from './db'
import { trialBalance, journalIsBalanced } from './accounting'
import {
  invoiceStatus, openInvoices, openCredits, totalCredits, totalReceivable,
  cashFlow, reconciliation, applyCreditAllocations, isPosted,
} from './payments'
import { vatReturn, topCustomers } from './reports'
import { runSchedules, addPeriod, isDue, mrr, scheduleTotal, dueSchedules } from './recurring'
import { statement, statementPartners } from './statement'
import { migrate } from './db'

const acc = (code: string) => trialBalance(getDB()).find(b => b.account.code === code)!

const mkInvoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: uid(), kind: 'invoice', number: 'INV-T1', partnerId: 'p1', date: '2026-03-01',
  dueDate: '2026-03-31', status: 'sent', currency: 'BWP', note: '',
  lines: [{ productId: null, label: 'Work', qty: 2, price: 100, taxRate: 10 }], // 220
  ...over,
})

const mkPayment = (over: Partial<Payment> = {}): Payment => ({
  id: uid(), date: '2026-03-05', kind: 'in', partnerId: 'p1', docType: null, docId: null,
  amount: 100, method: 'bank', ref: '', reconciled: false, statementLineId: null, ...over,
})

const mkSchedule = (over: Partial<Recurring> = {}): Recurring => ({
  id: uid(), name: 'Retainer', partnerId: 'p1',
  lines: [{ productId: null, label: 'Support', qty: 1, price: 1000, taxRate: 10 }],
  every: 'month', nextRun: '2026-01-01', until: '', dueDays: 30, active: true,
  note: '', generated: [], ...over,
})

beforeEach(() => {
  resetDB()
  update(d => {
    d.invoices = []; d.bills = []; d.expenses = []; d.payments = []
    d.statementLines = []; d.manualEntries = []; d.recurring = []
    d.partners = [{
      id: 'p1', name: 'Kalahari Fresh', email: 'a@b.com', phone: '+267 71 000 111',
      kind: 'customer', stage: 'won', value: 0, note: '', createdAt: '2026-01-01',
    }]
  })
})

describe('credit notes', () => {
  it('reverses revenue, output tax and receivables', () => {
    update(d => {
      d.invoices.push(mkInvoice())
      d.invoices.push(mkInvoice({ kind: 'credit', number: 'CN-0001' }))
    })
    expect(acc('1100').balance).toBeCloseTo(0)
    expect(acc('4000').balance).toBeCloseTo(0)
    expect(acc('2100').balance).toBeCloseTo(0)
    expect(journalIsBalanced(getDB()).ok).toBe(true)
  })

  it('reduces the tax return instead of adding to it', () => {
    update(d => { d.invoices.push(mkInvoice(), mkInvoice({ kind: 'credit', number: 'CN-1' })) })
    const vat = vatReturn(getDB(), '2026-01-01', '2026-12-31')
    expect(vat.salesNet).toBeCloseTo(0)
    expect(vat.outputTax).toBeCloseTo(0)
  })

  it('nets off revenue ranking and the receivable total', () => {
    update(d => {
      d.invoices.push(mkInvoice(), mkInvoice({ kind: 'credit', number: 'CN-1', lines: [
        { productId: null, label: 'Work', qty: 1, price: 100, taxRate: 10 }] }))
    })
    expect(topCustomers(getDB())[0].value).toBeCloseTo(100)
    expect(totalCredits(getDB())).toBeCloseTo(110)
    expect(totalReceivable(getDB())).toBeCloseTo(110)
  })

  it('keeps credit notes out of the open-invoice list', () => {
    update(d => { d.invoices.push(mkInvoice({ kind: 'credit' })) })
    expect(openInvoices(getDB())).toHaveLength(0)
    expect(openCredits(getDB())).toHaveLength(1)
  })

  it('applies a credit to an invoice without moving any cash', () => {
    const inv = mkInvoice()
    const cn = mkInvoice({ kind: 'credit', number: 'CN-1' })
    update(d => {
      d.invoices.push(inv, cn)
      d.payments.push(...applyCreditAllocations(cn, inv, 220, today(), uid))
    })
    expect(invoiceStatus(getDB(), inv)).toBe('paid')
    expect(openCredits(getDB())).toHaveLength(0)
    expect(acc('1000').balance).toBeCloseTo(0)      // bank untouched
    expect(cashFlow(getDB()).received).toBeCloseTo(0)
    expect(reconciliation(getDB()).unreconciled).toHaveLength(0)
    expect(journalIsBalanced(getDB()).ok).toBe(true)
  })
})

describe('refunds', () => {
  it('refunding a customer credits the bank and clears receivables', () => {
    const cn = mkInvoice({ kind: 'credit', number: 'CN-1' })
    update(d => {
      d.invoices.push(cn)
      d.payments.push(mkPayment({ kind: 'out', docType: 'invoice', docId: cn.id, amount: 220 }))
    })
    expect(acc('1000').balance).toBeCloseTo(-220)   // money out
    expect(acc('1100').balance).toBeCloseTo(0)      // receivable cleared
    expect(journalIsBalanced(getDB()).ok).toBe(true)
  })

  it('still routes supplier payments through payables', () => {
    update(d => {
      d.bills.push({
        id: 'b1', number: 'BILL-1', partnerId: 'p1', date: '2026-03-01', dueDate: '2026-03-15',
        status: 'received', currency: 'BWP', note: '',
        lines: [{ label: 'Parts', qty: 1, price: 400, taxRate: 10, account: '6900' }],
      })
      d.payments.push(mkPayment({ kind: 'out', docType: 'bill', docId: 'b1', amount: 440 }))
    })
    expect(acc('2000').balance).toBeCloseTo(0)
    expect(acc('1000').balance).toBeCloseTo(-440)
  })
})

describe('quotes never touch the books', () => {
  it('posts nothing for quotes or pro-formas', () => {
    update(d => {
      d.invoices.push(mkInvoice({ kind: 'quote', number: 'QUO-1' }))
      d.invoices.push(mkInvoice({ kind: 'proforma', number: 'PRO-1' }))
    })
    expect(acc('1100').balance).toBeCloseTo(0)
    expect(acc('4000').balance).toBeCloseTo(0)
    expect(vatReturn(getDB(), '2026-01-01', '2026-12-31').outputTax).toBeCloseTo(0)
    expect(getDB().invoices.filter(isPosted)).toHaveLength(0)
  })

  it('shows an accepted quote as accepted, not as paid', () => {
    const q = mkInvoice({ kind: 'quote', number: 'QUO-1', convertedTo: 'inv-9' })
    expect(invoiceStatus(getDB(), q)).toBe('paid')     // rendered as "accepted"
    const open = mkInvoice({ kind: 'quote', number: 'QUO-2', dueDate: '2099-01-01' })
    expect(invoiceStatus(getDB(), open)).toBe('open')
  })
})

describe('recurring billing', () => {
  it('advances a date by the right period', () => {
    expect(addPeriod('2026-01-31', 'month')).toBe('2026-02-28')  // clamped, never rolls over
    expect(addPeriod('2024-01-31', 'month')).toBe('2024-02-29')  // leap year
    expect(addPeriod('2026-01-01', 'week')).toBe('2026-01-08')
    expect(addPeriod('2026-01-01', 'quarter')).toBe('2026-04-01')
    expect(addPeriod('2026-01-01', 'year')).toBe('2027-01-01')
  })

  it('catches up every missed period in one run', () => {
    update(d => { d.recurring.push(mkSchedule()) })
    let made: number = 0
    update(d => { made = runSchedules(d, '2026-04-15', uid).length })
    expect(made).toBe(4)                                  // Jan, Feb, Mar, Apr
    expect(getDB().invoices).toHaveLength(4)
    expect(getDB().recurring[0].nextRun).toBe('2026-05-01')
    expect(getDB().invoices.every(i => i.kind === 'invoice' && i.status === 'sent')).toBe(true)
  })

  it('numbers generated invoices in sequence and posts them to the ledger', () => {
    update(d => { d.recurring.push(mkSchedule()) })
    update(d => { runSchedules(d, '2026-02-15', uid) })
    const numbers = getDB().invoices.map(i => i.number).sort()
    expect(new Set(numbers).size).toBe(numbers.length)
    expect(acc('4000').balance).toBeCloseTo(2000)
  })

  it('stops at the end date and when paused', () => {
    update(d => { d.recurring.push(mkSchedule({ until: '2026-02-28' })) })
    update(d => { runSchedules(d, '2026-12-31', uid) })
    expect(getDB().invoices).toHaveLength(2)
    expect(getDB().recurring[0].active).toBe(false)

    update(d => { d.recurring = [mkSchedule({ active: false })] })
    update(d => { runSchedules(d, '2026-12-31', uid) })
    expect(isDue(getDB().recurring[0], '2026-12-31')).toBe(false)
  })

  it('does nothing when nothing is due', () => {
    update(d => { d.recurring.push(mkSchedule({ nextRun: '2099-01-01' })) })
    expect(dueSchedules(getDB(), today())).toHaveLength(0)
    update(d => { expect(runSchedules(d, today(), uid)).toHaveLength(0) })
  })

  it('normalises recurring revenue to a monthly figure', () => {
    update(d => {
      d.recurring.push(mkSchedule(), mkSchedule({ every: 'year', lines: [
        { productId: null, label: 'Licence', qty: 1, price: 1200, taxRate: 0 }] }))
    })
    expect(scheduleTotal(getDB().recurring[0]).total).toBeCloseTo(1100)
    expect(mrr(getDB())).toBeCloseTo(1000 + 100)
  })
})

describe('customer statements', () => {
  it('runs a balance from opening, through movement, to closing', () => {
    const inv = mkInvoice()
    update(d => {
      d.invoices.push(mkInvoice({ number: 'INV-OLD', date: '2026-01-05', dueDate: '2026-01-31' }))
      d.invoices.push(inv)
      d.payments.push(mkPayment({ docType: 'invoice', docId: inv.id, amount: 100, date: '2026-03-10' }))
    })
    const st = statement(getDB(), 'p1', '2026-02-01', '2026-03-31')
    expect(st.opening).toBeCloseTo(220)        // January invoice
    expect(st.rows).toHaveLength(2)            // March invoice + payment
    expect(st.closing).toBeCloseTo(340)        // 220 + 220 - 100
  })

  it('ages what is still open and flags the overdue part', () => {
    update(d => { d.invoices.push(mkInvoice({ dueDate: '2026-01-31' })) })
    const st = statement(getDB(), 'p1', '2026-01-01', '2026-06-30')
    expect(st.overdue).toBeCloseTo(220)
    expect(st.ageing['90+']).toBeCloseTo(220)
  })

  it('shows a credit applied as a movement, not as cash', () => {
    const inv = mkInvoice()
    const cn = mkInvoice({ kind: 'credit', number: 'CN-1', date: '2026-03-02' })
    update(d => {
      d.invoices.push(inv, cn)
      d.payments.push(...applyCreditAllocations(cn, inv, 220, '2026-03-03', uid))
    })
    const st = statement(getDB(), 'p1', '2026-01-01', '2026-12-31')
    expect(st.rows.some(r => r.description === 'Credit applied')).toBe(true)
    expect(st.closing).toBeCloseTo(0)
  })

  it('lists customers with their balance, biggest first', () => {
    update(d => { d.invoices.push(mkInvoice()) })
    const rows = statementPartners(getDB())
    expect(rows[0].name).toBe('Kalahari Fresh')
    expect(rows[0].balance).toBeCloseTo(220)
  })
})

describe('formatting and coupons', () => {
  it('formats money for the company country without ever throwing', () => {
    update(d => { d.company.country = 'IN'; d.company.currency = 'INR' })
    expect(money(1250)).toContain('1,250')
    update(d => { d.company.currency = 'NOTACURRENCY' })
    expect(money(10)).toContain('10')
  })

  it('still shows a balance due per document', () => {
    const inv = mkInvoice()
    update(d => {
      d.invoices.push(inv)
      d.payments.push(mkPayment({ docType: 'invoice', docId: inv.id, amount: 20 }))
    })
    expect(balanceDue(getDB(), 'invoice', inv.id, invoiceTotals(inv).total)).toBeCloseTo(200)
  })
})

describe('upgrading an older file', () => {
  const v5 = () => JSON.parse(JSON.stringify({
    version: 5,
    company: { name: 'Old Co', email: '', phone: '', address: '', country: 'BW',
      currency: 'BWP', taxRate: 14, taxLabel: 'VAT', vatId: '', fyStart: '2026-01-01' },
    partners: [{ id: 'p1', name: 'Old Customer', email: '', phone: '', kind: 'customer',
      stage: 'won', value: 0, note: '', createdAt: '2025-01-01' }],
    products: [], moves: [], bills: [], expenses: [], payments: [], statementLines: [],
    channels: [], coupons: [], modules: {}, setup: { done: true, step: 0, dismissedChecklist: false },
    accounts: [], manualEntries: [],
    invoices: [
      { id: 'i1', kind: 'invoice', number: 'INV-1', partnerId: 'p1', date: '2025-06-01',
        dueDate: '2025-06-30', status: 'sent', currency: 'BWP', note: '',
        lines: [{ productId: null, label: 'Job', qty: 1, price: 500, taxRate: 14 }] },
      { id: 'q1', kind: 'quote', number: 'QUO-1', partnerId: 'p1', date: '2025-05-01',
        dueDate: '2025-05-15', status: 'paid', currency: 'BWP', note: '', lines: [] },
    ],
  }))

  it('lifts a v5 file to v6 without losing anything', () => {
    const d = migrate(v5())
    expect(d.version).toBe(6)
    expect(d.company.name).toBe('Old Co')
    expect(d.invoices).toHaveLength(2)
    expect(d.partners).toHaveLength(1)
  })

  it('gives the file the new v6 shapes', () => {
    const d = migrate(v5())
    expect(Array.isArray(d.recurring)).toBe(true)
    expect(d.recurring).toHaveLength(0)
    expect(d.company.logo ?? '').toBe('')
  })

  it('keeps a quote that was closed as won looking accepted', () => {
    const d = migrate(v5())
    const q = d.invoices.find(i => i.kind === 'quote')!
    expect(invoiceStatus(d, q)).toBe('paid')
  })

  it('still rebuilds a fresh file from nothing', () => {
    const d = migrate(null)
    expect(d.version).toBe(6)
    expect(d.recurring).toEqual([])
    expect(d.accounts.length).toBeGreaterThan(5)
  })
})
