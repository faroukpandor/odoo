import { describe, it, expect, beforeEach } from 'vitest'
import { resetDB, update, getDB, uid, type Channel } from './db'
import {
  PROVIDERS, providerOf, fillTemplate, tendersFor, paymentInstructions,
  applyCoupon, canAcceptOnline, newChannel,
} from './tender'
import { MODULES, CORE_IDS, DEFAULT_MODULES, modulesForTier, isEnabled, navModules } from './modules'
import { whatsappLink, mailtoLink, smsLink } from './share'

const chan = (over: Partial<Channel> = {}): Channel => ({
  id: uid(), kind: 'card', provider: 'paypal', label: 'PayPal', enabled: true,
  account: 'novaerp', detail: '', rate: 0, ...over,
})

beforeEach(() => {
  resetDB()
  update(d => { d.channels = []; d.coupons = [] })
})

describe('payment channel catalogue', () => {
  it('covers cards, mobile money, crypto, bank, cash and vouchers', () => {
    const kinds = new Set(PROVIDERS.map(p => p.kind))
    expect([...kinds].sort()).toEqual(['bank', 'card', 'cash', 'crypto', 'mobile', 'voucher'])
  })

  it('includes the major African mobile wallets and card rails', () => {
    const keys = PROVIDERS.map(p => p.key)
    expect(keys).toEqual(expect.arrayContaining(['stripe', 'paypal', 'paystack', 'flutterwave', 'skrill']))
    expect(keys).toEqual(expect.arrayContaining(['mpesa', 'orange', 'myzaka', 'momo', 'airtel', 'posomoney']))
    expect(keys).toEqual(expect.arrayContaining(['btc', 'eth', 'usdt', 'lightning']))
  })

  it('gives every provider an account label and an honest note', () => {
    PROVIDERS.forEach(p => {
      expect(p.accountLabel.length).toBeGreaterThan(2)
      expect(p.note.length).toBeGreaterThan(10)
    })
  })
})

describe('payment links', () => {
  it('pre-fills the amount in a PayPal.Me link', () => {
    const c = chan()
    const uri = fillTemplate(providerOf('paypal')!.template!, c, 1250.5, 'BWP', 'INV-0007')
    expect(uri).toBe('https://paypal.me/novaerp/1250.50BWP')
  })

  it('passes the amount in minor units to Paystack and keeps the reference', () => {
    const c = chan({ provider: 'paystack', account: 'https://paystack.com/pay/nova' })
    const uri = fillTemplate(providerOf('paystack')!.template!, c, 99.99, 'BWP', 'INV-1')
    expect(uri).toContain('amount=9999')
    expect(uri).toContain('reference=INV-1')
  })

  it('converts fiat to coin for a crypto URI using the posted rate', () => {
    const c = chan({ provider: 'btc', kind: 'crypto', account: 'bc1qexample', rate: 500000 })
    const uri = fillTemplate(providerOf('btc')!.template!, c, 50000, 'BWP', 'INV-2')
    expect(uri).toContain('bitcoin:bc1qexample')
    expect(uri).toContain('amount=0.1')
  })

  it('builds a dialable USSD link for mobile money', () => {
    const c = chan({ provider: 'mpesa', kind: 'mobile', account: '123456' })
    const t = tendersFor({ ...getDB(), channels: [c] }, 300, 'KES', 'INV-3')[0]
    expect(t.uri.startsWith('tel:')).toBe(true)
    expect(t.qr).toBe(false)      // a dial string is tapped, not scanned
    expect(t.text).toContain('123456')
  })

  it('ignores channels that are off or not configured', () => {
    const d = { ...getDB(), channels: [chan({ enabled: false }), chan({ account: '  ' })] }
    expect(tendersFor(d, 10, 'BWP', 'X')).toHaveLength(0)
  })

  it('produces a shareable instruction block for every live channel', () => {
    const d = {
      ...getDB(),
      channels: [chan(), chan({ provider: 'eft', kind: 'bank', account: '0123456789', label: 'Bank' })],
    }
    const text = paymentInstructions(d, 500, 'BWP', 'INV-9')
    expect(text).toContain('INV-9')
    expect(text).toContain('PayPal')
    expect(text).toContain('0123456789')
  })

  it('knows whether the business can take money online at all', () => {
    expect(canAcceptOnline(getDB())).toBe(false)
    update(d => { d.channels = [chan()] })
    expect(canAcceptOnline(getDB())).toBe(true)
  })

  it('creates new channels from the catalogue with the right kind', () => {
    expect(newChannel('mpesa').kind).toBe('mobile')
    expect(newChannel('usdt').kind).toBe('crypto')
  })
})

describe('coupons', () => {
  beforeEach(() => {
    update(d => {
      d.coupons = [
        { code: 'WELCOME10', kind: 'percent', value: 10, expires: '', limit: 0, used: 0 },
        { code: 'FLAT50', kind: 'fixed', value: 50, expires: '2020-01-01', limit: 0, used: 0 },
        { code: 'ONCE', kind: 'fixed', value: 20, expires: '', limit: 1, used: 1 },
      ]
    })
  })

  it('takes a percentage off the net', () => {
    const r = applyCoupon(getDB(), 'welcome10', 800, '2026-10-01')
    expect(r.ok).toBe(true)
    expect(r.discount).toBeCloseTo(80)
  })

  it('never discounts more than the document is worth', () => {
    update(d => { d.coupons.push({ code: 'BIG', kind: 'fixed', value: 9999, expires: '', limit: 0, used: 0 }) })
    expect(applyCoupon(getDB(), 'BIG', 100, '2026-10-01').discount).toBeCloseTo(100)
  })

  it('rejects unknown, expired and exhausted codes', () => {
    expect(applyCoupon(getDB(), 'NOPE', 100, '2026-10-01').reason).toBe('Unknown code')
    expect(applyCoupon(getDB(), 'FLAT50', 100, '2026-10-01').reason).toBe('Expired')
    expect(applyCoupon(getDB(), 'ONCE', 100, '2026-10-01').reason).toBe('Usage limit reached')
  })
})

describe('module registry', () => {
  it('ships every live module with a route and a blurb', () => {
    MODULES.filter(m => m.status === 'live').forEach(m => {
      expect(m.to).toBeTruthy()
      expect(m.blurb.length).toBeGreaterThan(10)
    })
  })

  it('covers every business size from hacker to enterprise', () => {
    const tiers = new Set(MODULES.map(m => m.tier))
    expect(tiers.size).toBe(6)
  })

  it('keeps core modules on even when a workspace disables everything', () => {
    CORE_IDS.forEach(id => expect(isEnabled([], id)).toBe(true))
    expect(isEnabled([], 'inventory')).toBe(false)
    expect(navModules([]).length).toBe(CORE_IDS.filter(id => MODULES.find(m => m.id === id)!.to).length)
  })

  it('grows the module set as the business profile grows', () => {
    const hacker = modulesForTier('hacker')
    const enterprise = modulesForTier('enterprise')
    expect(enterprise.length).toBeGreaterThanOrEqual(hacker.length)
    hacker.forEach(id => expect(enterprise).toContain(id))
  })

  it('starts a fresh workspace with the core plus stock and payments', () => {
    expect(DEFAULT_MODULES).toEqual(expect.arrayContaining([...CORE_IDS, 'inventory', 'payments']))
  })
})

describe('sharing links', () => {
  it('builds WhatsApp, mail and SMS deep links', () => {
    expect(whatsappLink('hi there', '+267 71 000 111')).toBe('https://wa.me/26771000111?text=hi%20there')
    expect(mailtoLink('a@b.com', 'INV-1', 'body')).toContain('mailto:a@b.com?subject=INV-1')
    expect(smsLink('+267 71', 'pay me')).toContain('sms:+26771?body=pay%20me')
  })
})
