import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetDB, update, getDB, uid, today, migrate, invoiceTotals, billTotals,
  balanceDue, paidAmount, isOverdue,
  type Invoice, type Bill, type Payment, type StatementLine,
} from './db'
import { trialBalance, journal, journalIsBalanced } from './accounting'
import {
  invoiceStatus, billStatus, openInvoices, openBills, totalReceivable, totalPayable,
  cashFlow, reconciliation, suggestPayments, suggestDocuments, parseStatementCSV,
  normaliseDate, cashAccount, docLabel,
} from './payments'
import { receivablesAgeing, payablesAgeing, cashSummary } from './reports'

const acc = (code: string) => trialBalance(getDB()).find(b => b.account.code === code)!

beforeEach(() => {
  resetDB()
  update(d => {
    d.invoices = []; d.bills = []; d.expenses = []
    d.manualEntries = []; d.payments = []; d.statementLines = []
  })
})

const yesterday = () => {
  const x = new Date(); x.setDate(x.getDate() - 1); return x.toISOString().slice(0, 10)
}

const mkInvoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: uid(), kind: 'invoice', number: 'INV-T1', partnerId: null, date: today(), dueDate: today(),
  status: 'sent', currency: 'BWP', note: '',
  lines: [{ productId: null, label: 'Work', qty: 2, price: 100, taxRate: 10 }], // 220 total
  ...over,
})

const mkBill = (over: Partial<Bill> = {}): Bill => ({
  id: uid(), number: 'BILL-T1', partnerId: null, date: today(), dueDate: today(),
  status: 'received', currency: 'BWP', note: '',
  lines: [{ label: 'Parts', qty: 1, price: 400, taxRate: 10, account: '6900' }], // 440 total
  ...over,
})

const mkPayment = (over: Partial<Payment> = {}): Payment => ({
  id: uid(), date: today(), kind: 'in', partnerId: null, docType: null, docId: null,
  amount: 100, method: 'bank', ref: '', reconciled: false, statementLineId: null,
  ...over,
})

const mkLine = (over: Partial<StatementLine> = {}): StatementLine => ({
  id: uid(), date: today(), description: 'EFT', amount: 220, matchedPaymentId: null, ...over,
})

describe('settlement from payments', () => {
  it('tracks part payments and the balance still due', () => {
    const inv = mkInvoice()
    update(d => {
      d.invoices.push(inv)
      d.payments.push(mkPayment({ docType: 'invoice', docId: inv.id, amount: 80 }))
    })
    expect(paidAmount(getDB(), 'invoice', inv.id)).toBeCloseTo(80)
    expect(balanceDue(getDB(), 'invoice', inv.id, 220)).toBeCloseTo(140)
    expect(invoiceStatus(getDB(), inv)).toBe('partial')
  })

  it('marks a document paid once it is fully settled', () => {
    const inv = mkInvoice()
    update(d => {
      d.invoices.push(inv)
      d.payments.push(
        mkPayment({ docType: 'invoice', docId: inv.id, amount: 100 }),
        mkPayment({ docType: 'invoice', docId: inv.id, amount: 120 }),
      )
    })
    expect(invoiceStatus(getDB(), inv)).toBe('paid')
    expect(openInvoices(getDB())).toHaveLength(0)
  })

  it('flags an unpaid document past its due date as overdue', () => {
    const inv = mkInvoice({ dueDate: yesterday() })
    update(d => { d.invoices.push(inv) })
    expect(invoiceStatus(getDB(), inv)).toBe('overdue')
    expect(isOverdue(inv)).toBe(true)
  })

  it('never treats a draft as collectable', () => {
    const inv = mkInvoice({ status: 'draft', dueDate: yesterday() })
    update(d => { d.invoices.push(inv) })
    expect(invoiceStatus(getDB(), inv)).toBe('draft')
    expect(isOverdue(inv)).toBe(false)
    expect(totalReceivable(getDB())).toBeCloseTo(0)
  })

  it('reports outstanding receivables and payables', () => {
    const inv = mkInvoice(), bill = mkBill()
    update(d => {
      d.invoices.push(inv); d.bills.push(bill)
      d.payments.push(mkPayment({ docType: 'invoice', docId: inv.id, amount: 20 }))
      d.payments.push(mkPayment({ kind: 'out', docType: 'bill', docId: bill.id, amount: 40 }))
    })
    expect(totalReceivable(getDB())).toBeCloseTo(200)
    expect(totalPayable(getDB())).toBeCloseTo(400)
    expect(billStatus(getDB(), bill)).toBe('partial')
    expect(openBills(getDB())).toHaveLength(1)
  })
})

describe('cash ledger postings', () => {
  it('moves a receipt from receivables to the bank', () => {
    const inv = mkInvoice()
    update(d => {
      d.invoices.push(inv)
      d.payments.push(mkPayment({ docType: 'invoice', docId: inv.id, amount: 220 }))
    })
    expect(acc('1100').balance).toBeCloseTo(0)
    expect(acc('1000').balance).toBeCloseTo(220)
    expect(journalIsBalanced(getDB()).ok).toBe(true)
  })

  it('posts cash payments to the cash account, not the bank', () => {
    const inv = mkInvoice()
    update(d => {
      d.invoices.push(inv)
      d.payments.push(mkPayment({ docType: 'invoice', docId: inv.id, amount: 220, method: 'cash' }))
    })
    expect(acc('1010').balance).toBeCloseTo(220)
    expect(acc('1000').balance).toBeCloseTo(0)
    expect(cashAccount({ method: 'cash' })).toBe('1010')
  })

  it('clears payables when a vendor is paid', () => {
    const bill = mkBill()
    update(d => {
      d.bills.push(bill)
      d.payments.push(mkPayment({ kind: 'out', docType: 'bill', docId: bill.id, amount: 440 }))
    })
    expect(acc('2000').balance).toBeCloseTo(0)
    expect(acc('1000').balance).toBeCloseTo(-440)
  })

  it('ignores payments whose document no longer exists', () => {
    update(d => { d.payments.push(mkPayment({ docType: 'invoice', docId: 'ghost', amount: 500 })) })
    expect(journal(getDB())).toHaveLength(0)
  })

  it('still settles legacy documents flagged paid without a payment record', () => {
    update(d => { d.invoices.push(mkInvoice({ status: 'paid' })) })
    expect(acc('1100').balance).toBeCloseTo(0)
    expect(acc('1000').balance).toBeCloseTo(220)
  })

  it('summarises cash in and out for a period', () => {
    const inv = mkInvoice(), bill = mkBill()
    update(d => {
      d.invoices.push(inv); d.bills.push(bill)
      d.payments.push(
        mkPayment({ docType: 'invoice', docId: inv.id, amount: 220, date: '2026-01-10' }),
        mkPayment({ kind: 'out', docType: 'bill', docId: bill.id, amount: 100, date: '2026-01-20' }),
        mkPayment({ kind: 'out', docType: 'bill', docId: bill.id, amount: 50, date: '2026-02-05' }),
      )
    })
    const jan = cashFlow(getDB(), '2026-01-01', '2026-01-31')
    expect(jan.received).toBeCloseTo(220)
    expect(jan.spent).toBeCloseTo(100)
    expect(jan.net).toBeCloseTo(120)
    expect(cashSummary(getDB(), '2026-12-31').balance).toBeCloseTo(70)
  })
})

describe('reporting reflects part payments', () => {
  it('ages only what is still owed', () => {
    const inv = mkInvoice({ dueDate: yesterday() })
    update(d => {
      d.invoices.push(inv)
      d.payments.push(mkPayment({ docType: 'invoice', docId: inv.id, amount: 20 }))
    })
    expect(receivablesAgeing(getDB(), today()).grand).toBeCloseTo(200)
  })

  it('drops fully paid bills out of the payables ageing', () => {
    const bill = mkBill()
    update(d => {
      d.bills.push(bill)
      d.payments.push(mkPayment({ kind: 'out', docType: 'bill', docId: bill.id, amount: 440 }))
    })
    expect(payablesAgeing(getDB(), today()).grand).toBeCloseTo(0)
  })
})

describe('bank reconciliation', () => {
  it('reports the gap between the statement and the books', () => {
    const inv = mkInvoice()
    update(d => {
      d.invoices.push(inv)
      d.payments.push(mkPayment({ docType: 'invoice', docId: inv.id, amount: 220, reconciled: true }))
      d.statementLines.push(mkLine({ amount: 300 }))
    })
    const r = reconciliation(getDB())
    expect(r.statementBalance).toBeCloseTo(300)
    expect(r.matchedBalance).toBeCloseTo(220)
    expect(r.difference).toBeCloseTo(80)
    expect(r.clean).toBe(false)
  })

  it('is clean when every line and payment is matched', () => {
    const inv = mkInvoice()
    update(d => {
      d.invoices.push(inv)
      const p = mkPayment({ docType: 'invoice', docId: inv.id, amount: 220, reconciled: true })
      d.payments.push(p)
      d.statementLines.push(mkLine({ amount: 220, matchedPaymentId: p.id }))
    })
    expect(reconciliation(getDB()).clean).toBe(true)
  })

  it('suggests the closest unreconciled payment for a statement line', () => {
    update(d => {
      d.payments.push(
        mkPayment({ amount: 999, ref: 'far' }),
        mkPayment({ amount: 220, ref: 'exact' }),
        mkPayment({ kind: 'out', amount: 220, ref: 'wrong direction' }),
      )
    })
    const s = suggestPayments(getDB(), mkLine({ amount: 220 }))
    expect(s[0].ref).toBe('exact')
    expect(s.every(p => p.kind === 'in')).toBe(true)
  })

  it('suggests open documents a line could settle', () => {
    const inv = mkInvoice()
    const bill = mkBill()
    update(d => { d.invoices.push(inv); d.bills.push(bill) })
    expect(suggestDocuments(getDB(), mkLine({ amount: 220 }))[0].type).toBe('invoice')
    expect(suggestDocuments(getDB(), mkLine({ amount: -440 }))[0].type).toBe('bill')
  })

  it('labels what a payment settles', () => {
    const inv = mkInvoice({ number: 'INV-9' })
    update(d => { d.invoices.push(inv) })
    expect(docLabel(getDB(), mkPayment({ docType: 'invoice', docId: inv.id }))).toBe('INV-9')
    expect(docLabel(getDB(), mkPayment())).toBe('On account')
  })
})

describe('statement parsing', () => {
  it('reads date, description, amount with a header row', () => {
    const rows = parseStatementCSV(
      'Date,Description,Amount\n2026-10-01,EFT 8841 KALAHARI,10000\n2026-10-02,"SUPPLY CO, LTD",-4674',
    )
    expect(rows).toHaveLength(2)
    expect(rows[0].amount).toBeCloseTo(10000)
    expect(rows[1].description).toBe('SUPPLY CO, LTD')
    expect(rows[1].amount).toBeCloseTo(-4674)
  })

  it('reads separate debit and credit columns', () => {
    const rows = parseStatementCSV('01/10/2026,Rent,5000,0\n02/10/2026,Deposit,0,1200')
    expect(rows[0].date).toBe('2026-10-01')
    expect(rows[0].amount).toBeCloseTo(-5000)
    expect(rows[1].amount).toBeCloseTo(1200)
  })

  it('skips junk, headers and zero-value rows', () => {
    expect(parseStatementCSV('nonsense\n,,\n2026-10-01,Nothing,0')).toHaveLength(0)
    expect(normaliseDate('31-12-2026')).toBe('2026-12-31')
    expect(normaliseDate('not a date')).toBe('')
  })
})

describe('migration to the payments schema', () => {
  it('converts legacy paid documents into payment records', () => {
    const inv = mkInvoice({ status: 'paid' })
    const bill = mkBill({ status: 'paid' })
    const m = migrate({
      version: 2, partners: [], products: [], moves: [],
      invoices: [inv], bills: [bill], expenses: [],
    } as never)
    expect(m.payments).toHaveLength(2)
    expect(m.payments.find(p => p.kind === 'in')!.amount).toBeCloseTo(invoiceTotals(inv).total)
    expect(m.payments.find(p => p.kind === 'out')!.amount).toBeCloseTo(billTotals(bill).total)
    expect(m.statementLines).toEqual([])
  })

  it('adds accounts introduced by newer versions to an older chart', () => {
    const m = migrate({
      version: 2, partners: [], products: [], moves: [],
      accounts: [{ code: '9999', name: 'Custom', type: 'expense' }],
    } as never)
    expect(m.accounts.some(a => a.code === '9999')).toBe(true)
    expect(m.accounts.some(a => a.code === '1010')).toBe(true)
  })
})
