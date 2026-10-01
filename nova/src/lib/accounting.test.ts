import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetDB, update, getDB, invoiceTotals, uid, today, migrate, CHART,
  type Invoice, type Bill, type Expense,
} from './db'
import {
  journal, trialBalance, profitAndLoss, balanceSheet, journalIsBalanced,
  billTotals, expenseTotals,
} from './accounting'

const acc = (code: string) => trialBalance(getDB()).find(b => b.account.code === code)!

beforeEach(() => {
  resetDB()
  update(d => {
    d.invoices = []; d.bills = []; d.expenses = []
    d.manualEntries = []; d.payments = []; d.statementLines = []
  })
})

const mkInvoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: uid(), kind: 'invoice', number: 'INV-T1', partnerId: null, date: today(), dueDate: today(),
  status: 'sent', currency: 'BWP', note: '',
  lines: [{ productId: null, label: 'Work', qty: 2, price: 100, taxRate: 10 }],
  ...over,
})

const mkBill = (over: Partial<Bill> = {}): Bill => ({
  id: uid(), number: 'BILL-T1', partnerId: null, date: today(), dueDate: today(),
  status: 'received', currency: 'BWP', note: '',
  lines: [{ label: 'Parts', qty: 1, price: 400, taxRate: 10, account: '6900' }],
  ...over,
})

const mkExpense = (over: Partial<Expense> = {}): Expense => ({
  id: uid(), date: today(), label: 'Taxi', amount: 100, taxRate: 0,
  account: '6400', paidBy: 'company', reimbursed: true, note: '', ...over,
})

describe('document totals', () => {
  it('computes invoice net, tax and total', () => {
    const t = invoiceTotals(mkInvoice())
    expect(t.net).toBe(200)
    expect(t.tax).toBeCloseTo(20)
    expect(t.total).toBeCloseTo(220)
  })

  it('computes bill and expense totals with tax', () => {
    expect(billTotals(mkBill()).total).toBeCloseTo(440)
    expect(expenseTotals(mkExpense({ amount: 200, taxRate: 14 })).total).toBeCloseTo(228)
  })
})

describe('double-entry invariants', () => {
  it('keeps every generated entry balanced', () => {
    update(d => {
      d.invoices.push(mkInvoice(), mkInvoice({ status: 'paid' }))
      d.bills.push(mkBill(), mkBill({ status: 'paid' }))
      d.expenses.push(mkExpense(), mkExpense({ paidBy: 'employee', reimbursed: false }))
    })
    journal(getDB()).forEach(e => {
      const dr = e.lines.reduce((s, l) => s + l.debit, 0)
      const cr = e.lines.reduce((s, l) => s + l.credit, 0)
      expect(dr).toBeCloseTo(cr)
    })
    expect(journalIsBalanced(getDB()).ok).toBe(true)
  })

  it('never posts draft documents', () => {
    update(d => {
      d.invoices.push(mkInvoice({ status: 'draft' }))
      d.bills.push(mkBill({ status: 'draft' }))
    })
    expect(journal(getDB())).toHaveLength(0)
  })
})

describe('invoice posting', () => {
  it('debits receivables and credits revenue plus output VAT', () => {
    update(d => { d.invoices.push(mkInvoice()) })
    expect(acc('1100').balance).toBeCloseTo(220)  // AR
    expect(acc('4000').balance).toBeCloseTo(200)  // revenue
    expect(acc('2100').balance).toBeCloseTo(20)   // VAT payable
    expect(acc('1000').balance).toBeCloseTo(0)    // bank untouched
  })

  it('clears receivables into the bank once paid', () => {
    update(d => { d.invoices.push(mkInvoice({ status: 'paid' })) })
    expect(acc('1100').balance).toBeCloseTo(0)
    expect(acc('1000').balance).toBeCloseTo(220)
  })
})

describe('bill posting', () => {
  it('debits the coded account and input VAT, credits payables', () => {
    update(d => { d.bills.push(mkBill()) })
    expect(acc('6900').balance).toBeCloseTo(400)
    expect(acc('1400').balance).toBeCloseTo(40)   // VAT receivable
    expect(acc('2000').balance).toBeCloseTo(440)  // AP
  })

  it('splits multi-line bills across accounts', () => {
    update(d => {
      d.bills.push(mkBill({
        lines: [
          { label: 'Stock', qty: 1, price: 1000, taxRate: 0, account: '1300' },
          { label: 'Rent', qty: 1, price: 500, taxRate: 0, account: '6200' },
        ],
      }))
    })
    expect(acc('1300').balance).toBeCloseTo(1000)
    expect(acc('6200').balance).toBeCloseTo(500)
    expect(acc('2000').balance).toBeCloseTo(1500)
  })

  it('moves payables to the bank when paid', () => {
    update(d => { d.bills.push(mkBill({ status: 'paid' })) })
    expect(acc('2000').balance).toBeCloseTo(0)
    expect(acc('1000').balance).toBeCloseTo(-440)
  })
})

describe('expense posting', () => {
  it('credits the bank for company-paid spend', () => {
    update(d => { d.expenses.push(mkExpense()) })
    expect(acc('6400').balance).toBeCloseTo(100)
    expect(acc('1000').balance).toBeCloseTo(-100)
    expect(acc('2200').balance).toBeCloseTo(0)
  })

  it('raises an employee liability until reimbursed', () => {
    update(d => { d.expenses.push(mkExpense({ paidBy: 'employee', reimbursed: false })) })
    expect(acc('2200').balance).toBeCloseTo(100)
    expect(acc('1000').balance).toBeCloseTo(0)
  })
})

describe('financial statements', () => {
  it('reports profit as income less expenses', () => {
    update(d => {
      d.invoices.push(mkInvoice())              // 200 revenue
      d.bills.push(mkBill())                    // 400 expense
      d.expenses.push(mkExpense())              // 100 expense
    })
    const pl = profitAndLoss(getDB())
    expect(pl.revenue).toBeCloseTo(200)
    expect(pl.costs).toBeCloseTo(500)
    expect(pl.net).toBeCloseTo(-300)
  })

  it('satisfies assets = liabilities + equity', () => {
    update(d => {
      d.invoices.push(mkInvoice(), mkInvoice({ status: 'paid' }))
      d.bills.push(mkBill({ status: 'paid' }))
      d.expenses.push(mkExpense({ paidBy: 'employee', reimbursed: false }))
    })
    const bs = balanceSheet(getDB())
    expect(bs.totalAssets).toBeCloseTo(bs.totalLiabilities + bs.totalEquity)
  })

  it('honours the reporting date cut-off', () => {
    update(d => {
      d.invoices.push(mkInvoice({ date: '2020-01-01' }), mkInvoice({ date: '2030-01-01' }))
    })
    expect(profitAndLoss(getDB(), '2025-01-01').revenue).toBeCloseTo(200)
    expect(profitAndLoss(getDB(), '2031-01-01').revenue).toBeCloseTo(400)
  })

  it('includes balanced manual adjustments', () => {
    update(d => {
      d.manualEntries.push({
        id: uid(), date: today(), ref: 'ADJ', memo: 'Owner capital', source: 'manual',
        lines: [{ account: '1000', debit: 5000, credit: 0 }, { account: '3000', debit: 0, credit: 5000 }],
      })
    })
    expect(acc('1000').balance).toBeCloseTo(5000)
    expect(acc('3000').balance).toBeCloseTo(5000)
    expect(journalIsBalanced(getDB()).ok).toBe(true)
  })
})

describe('schema migration', () => {
  it('reseeds when given junk', () => {
    expect(migrate(null).accounts.length).toBe(CHART.length)
  })

  it('backfills collections missing from an older snapshot', () => {
    const legacy = { version: 1, partners: [], products: [], invoices: [], moves: [] }
    const m = migrate(legacy as never)
    expect(m.bills).toEqual([])
    expect(m.expenses).toEqual([])
    expect(m.manualEntries).toEqual([])
    expect(m.accounts.length).toBeGreaterThan(0)
    expect(m.company.currency).toBeTruthy()
  })
})
