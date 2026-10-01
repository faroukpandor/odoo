import { describe, it, expect, beforeEach } from 'vitest'
import { resetDB, update, getDB, uid, type Payment } from './db'
import { checkWorkspace, repairWorkspace } from './health'
import { paymentsFor, stockOf } from './db'

const find = (id: string) => checkWorkspace(getDB()).findings.find(f => f.id === id)

beforeEach(() => { resetDB() })

describe('a healthy workspace', () => {
  it('passes the seeded books with no errors', () => {
    const r = checkWorkspace(getDB())
    expect(r.errors).toBe(0)
    expect(r.score).toBeGreaterThan(70)
    expect(r.findings.every(f => f.count > 0)).toBe(true)   // never reports a non-issue
  })

  it('notices the company has not been named yet', () => {
    expect(find('no-company-name')?.severity).toBe('warning')
    update(d => { d.company.name = 'Kalahari Trading' })
    expect(find('no-company-name')).toBeUndefined()
  })
})

describe('references that point nowhere', () => {
  it('catches a document whose customer was deleted', () => {
    update(d => { d.partners = [] })
    expect(find('orphan-invoice-partner')?.severity).toBe('error')
  })

  it('catches a payment allocated to a deleted invoice', () => {
    update(d => { d.invoices = [] })
    const f = find('orphan-payment-doc')
    expect(f?.severity).toBe('error')
    expect(f?.fixable).toBe(true)
  })

  it('catches stock movements for a deleted product', () => {
    update(d => { d.products = [] })
    expect(find('orphan-move')?.count).toBeGreaterThan(0)
  })
})

describe('numbers and money', () => {
  it('refuses to let two documents share a number', () => {
    update(d => { d.invoices.push({ ...d.invoices[0], id: uid() }) })
    const f = find('duplicate-numbers')
    expect(f?.severity).toBe('error')
    expect(f?.detail).toContain('INV-0001')
  })

  it('flags a document that has been paid twice', () => {
    update(d => {
      const inv = d.invoices[0]
      const p: Payment = {
        id: uid(), date: inv.date, kind: 'in', partnerId: inv.partnerId,
        docType: 'invoice', docId: inv.id, amount: 999999, method: 'bank',
        ref: '', reconciled: false, statementLineId: null,
      }
      d.payments.push(p)
    })
    expect(find('overpaid')?.count).toBe(1)
  })

  it('tells the ledger apart from the documents', () => {
    expect(find('unbalanced-journal')).toBeUndefined()
    update(d => {
      d.manualEntries.push({
        id: uid(), date: '2026-01-01', ref: 'ADJ', memo: 'broken', source: 'manual',
        lines: [{ account: '1000', debit: 100, credit: 0 }],
      })
    })
    expect(find('unbalanced-journal')?.severity).toBe('error')
  })

  it('spots postings to an account that is not in the chart', () => {
    update(d => { d.accounts = d.accounts.filter(a => a.code !== '1100') })
    expect(find('unknown-account')?.count).toBeGreaterThan(0)
  })
})

describe('governance', () => {
  it('insists somebody can administer the workspace', () => {
    update(d => { d.users = d.users.map(u => ({ ...u, role: 'viewer' as const })) })
    expect(find('no-owner')?.severity).toBe('error')
  })
})

describe('safe repair', () => {
  it('turns dangling allocations into payments on account and keeps the cash', () => {
    const cashBefore = getDB().payments.reduce((s, p) => s + p.amount, 0)
    update(d => { d.invoices = [] })
    let done: string[] = []
    update(d => { done = repairWorkspace(d) })
    expect(done.join(' ')).toContain('on account')
    expect(getDB().payments.reduce((s, p) => s + p.amount, 0)).toBe(cashBefore)
    expect(getDB().payments.every(p => p.docType !== 'invoice')).toBe(true)
    expect(checkWorkspace(getDB()).findings.find(f => f.id === 'orphan-payment-doc')).toBeUndefined()
  })

  it('drops orphan stock movements', () => {
    update(d => { d.products = [] })
    update(d => { repairWorkspace(d) })
    expect(getDB().moves).toHaveLength(0)
  })

  it('promotes somebody to owner rather than leaving the books locked', () => {
    update(d => { d.users = d.users.map(u => ({ ...u, role: 'sales' as const })) })
    update(d => { repairWorkspace(d) })
    expect(getDB().users[0].role).toBe('owner')
    expect(checkWorkspace(getDB()).findings.find(f => f.id === 'no-owner')).toBeUndefined()
  })

  it('does nothing to a healthy workspace', () => {
    update(d => { d.company.name = 'Kalahari Trading' })
    let done: string[] = []
    update(d => { done = repairWorkspace(d) })
    expect(done).toEqual([])
  })
})

describe('indexed lookups', () => {
  it('returns the same answers as a plain scan', () => {
    const d = getDB()
    const inv = d.invoices[0]
    const scan = d.payments.filter(p => p.docType === 'invoice' && p.docId === inv.id)
    expect(paymentsFor(d, 'invoice', inv.id)).toEqual(scan)
    expect(paymentsFor(d, 'invoice', 'nope')).toEqual([])
  })

  it('rebuilds itself after every edit instead of going stale', () => {
    const inv = getDB().invoices[0]
    const before = paymentsFor(getDB(), 'invoice', inv.id).length
    update(d => {
      d.payments.push({
        id: uid(), date: inv.date, kind: 'in', partnerId: inv.partnerId,
        docType: 'invoice', docId: inv.id, amount: 1, method: 'bank',
        ref: '', reconciled: false, statementLineId: null,
      })
    })
    expect(paymentsFor(getDB(), 'invoice', inv.id)).toHaveLength(before + 1)
  })

  it('keeps adjustment semantics when counting stock', () => {
    const pid = getDB().products[1].id
    update(d => {
      d.moves.push({ id: uid(), productId: pid, qty: 7, kind: 'adjust', ref: 'count', date: '2026-01-01' })
    })
    expect(stockOf(getDB(), pid)).toBe(7)
    update(d => {
      d.moves.push({ id: uid(), productId: pid, qty: 3, kind: 'out', ref: 'sale', date: '2026-01-02' })
    })
    expect(stockOf(getDB(), pid)).toBe(4)
  })

  it('stays fast on a large workspace', () => {
    update(d => {
      for (let i = 0; i < 4000; i++) {
        d.payments.push({
          id: 'p' + i, date: '2026-01-01', kind: 'in', partnerId: null,
          docType: 'invoice', docId: 'i' + (i % 500), amount: 1, method: 'bank',
          ref: '', reconciled: false, statementLineId: null,
        })
      }
    })
    const d = getDB()
    const t0 = performance.now()
    for (let i = 0; i < 500; i++) paymentsFor(d, 'invoice', 'i' + i)
    expect(performance.now() - t0).toBeLessThan(150)
  })
})
