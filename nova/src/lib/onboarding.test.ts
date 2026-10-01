import { describe, it, expect, beforeEach } from 'vitest'
import { resetDB, update, getDB, uid, migrate, type Channel } from './db'
import {
  checklist, progress, applyCountry, COUNTRY_DEFAULTS, BUSINESS_KINDS, guessCountry,
} from './onboarding'
import {
  PROVIDERS, searchProviders, recommendedProviders, validateAccount, providerOf,
  liveChannels, servesCountry, COUNTRIES, countryName,
} from './tender'

const chan = (over: Partial<Channel> = {}): Channel => ({
  id: uid(), kind: 'card', provider: 'paypal', label: 'PayPal', enabled: true,
  account: 'novaerp', detail: '', rate: 0, ...over,
})

beforeEach(() => resetDB())

describe('catalogue breadth', () => {
  it('offers a serious number of rails across every kind', () => {
    expect(PROVIDERS.length).toBeGreaterThanOrEqual(40)
    const byKind = (k: string) => PROVIDERS.filter(p => p.kind === k).length
    expect(byKind('card')).toBeGreaterThanOrEqual(12)
    expect(byKind('mobile')).toBeGreaterThanOrEqual(10)
    expect(byKind('crypto')).toBeGreaterThanOrEqual(5)
    expect(byKind('bank')).toBeGreaterThanOrEqual(5)
  })

  it('states a fee, a settlement time and a region for every provider', () => {
    PROVIDERS.forEach(p => {
      expect(p.fee).toBeTruthy()
      expect(p.settlement).toBeTruthy()
      expect(p.regions.length).toBeGreaterThan(0)
      expect(p.mark).toBeTruthy()
    })
  })

  it('has no duplicate provider keys', () => {
    expect(new Set(PROVIDERS.map(p => p.key)).size).toBe(PROVIDERS.length)
  })

  it('covers the instant national rails people actually use', () => {
    const keys = PROVIDERS.map(p => p.key)
    expect(keys).toEqual(expect.arrayContaining(['upi', 'pix', 'promptpay', 'interac', 'zelle', 'sepa']))
    expect(keys).toEqual(expect.arrayContaining(['wave', 'telebirr', 'bkash', 'gcash']))
  })
})

describe('catalogue search and recommendations', () => {
  it('filters by kind and free text', () => {
    expect(searchProviders('bitcoin', {}).some(p => p.key === 'btc')).toBe(true)
    expect(searchProviders('', { kind: 'mobile' }).every(p => p.kind === 'mobile')).toBe(true)
    expect(searchProviders('zzzz', {})).toHaveLength(0)
  })

  it('can restrict the catalogue to what works in the user country', () => {
    const local = searchProviders('', { country: 'BW', localOnly: true })
    expect(local.every(p => servesCountry(p, 'BW'))).toBe(true)
    expect(local.some(p => p.key === 'myzaka')).toBe(true)
    expect(local.some(p => p.key === 'zelle')).toBe(false)
  })

  it('recommends local rails ahead of global ones', () => {
    const bw = recommendedProviders('BW', 'BWP').map(p => p.key)
    expect(bw.slice(0, 4)).toEqual(expect.arrayContaining(['myzaka']))
    const ke = recommendedProviders('KE', 'KES').map(p => p.key)
    expect(ke).toContain('mpesa')
    const india = recommendedProviders('IN', 'INR').map(p => p.key)
    expect(india).toContain('upi')
  })

  it('always finds something, even for an unlisted country', () => {
    expect(recommendedProviders('XX', 'USD').length).toBeGreaterThan(0)
  })
})

describe('account validation', () => {
  it('rejects an empty account', () => {
    expect(validateAccount(providerOf('stripe'), '').ok).toBe(false)
  })

  it('accepts a valid Stripe link and rejects a random URL', () => {
    expect(validateAccount(providerOf('stripe'), 'https://buy.stripe.com/test_abc').ok).toBe(true)
    expect(validateAccount(providerOf('stripe'), 'https://example.com/pay').ok).toBe(false)
  })

  it('checks wallet address shapes', () => {
    expect(validateAccount(providerOf('eth'), '0x' + 'a'.repeat(40)).ok).toBe(true)
    expect(validateAccount(providerOf('eth'), '0xnope').ok).toBe(false)
    expect(validateAccount(providerOf('btc'), 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4').ok).toBe(true)
    expect(validateAccount(providerOf('upi'), 'nova@okaxis').ok).toBe(true)
    expect(validateAccount(providerOf('upi'), 'nova').ok).toBe(false)
  })

  it('keeps a misconfigured channel off invoices', () => {
    update(d => { d.channels = [chan({ provider: 'eth', account: 'not-an-address', kind: 'crypto' })] })
    expect(liveChannels(getDB())).toHaveLength(0)
    update(d => { d.channels = [chan()] })
    expect(liveChannels(getDB())).toHaveLength(1)
  })
})

describe('country defaults', () => {
  it('sets currency, tax rate and tax wording per country', () => {
    const c = applyCountry(getDB().company, 'IN')
    expect(c.currency).toBe('INR')
    expect(c.taxLabel).toBe('GST')
    expect(c.taxRate).toBeCloseTo(18)
  })

  it('keeps the country even when there is no default for it', () => {
    expect(applyCountry(getDB().company, 'XX').country).toBe('XX')
  })

  it('offers a default for every country in the picker', () => {
    COUNTRIES.forEach(c => expect(COUNTRY_DEFAULTS[c.code]).toBeTruthy())
    expect(countryName('BW')).toBe('Botswana')
  })

  it('guesses a country without crashing in any environment', () => {
    expect(typeof guessCountry()).toBe('string')
  })
})

describe('getting-started checklist', () => {
  it('derives progress from the data, not a stored flag', () => {
    update(d => {
      d.company.name = 'My Company'
      d.partners = []; d.products = []; d.invoices = []; d.payments = []; d.channels = []
    })
    const before = progress(getDB())
    update(d => {
      d.company.name = 'Kalahari Trading'
      d.partners.push({
        id: uid(), name: 'A', email: '', phone: '', kind: 'customer', stage: 'lead',
        value: 0, note: '', createdAt: '2026-01-01',
      })
      d.channels = [chan()]
    })
    const after = progress(getDB())
    expect(after.done).toBeGreaterThan(before.done)
    expect(after.pct).toBeGreaterThan(before.pct)
    expect(checklist(getDB()).find(t => t.id === 'channel')!.done).toBe(true)
  })

  it('marks every task done for a fully set-up workspace', () => {
    update(d => {
      d.company.name = 'Kalahari Trading'
      d.channels = [chan()]
      d.setup = { done: true, step: 0, dismissedChecklist: true }
    })
    const tasks = checklist(getDB())
    expect(tasks.every(t => t.done)).toBe(true)
    expect(progress(getDB()).pct).toBe(100)
  })

  it('points every task at a real route', () => {
    checklist(getDB()).forEach(t => expect(t.to.startsWith('/')).toBe(true))
  })

  it('maps each business kind to modules that exist', () => {
    BUSINESS_KINDS.forEach(b => expect(b.modules.length).toBeGreaterThan(0))
  })
})

describe('migration to the onboarding schema', () => {
  it('treats an existing workspace with invoices as already set up', () => {
    const m = migrate({
      version: 4, partners: [], products: [], moves: [],
      invoices: [{ id: 'i1', kind: 'invoice', number: 'INV-1', partnerId: null, date: '2026-01-01',
        dueDate: '2026-01-31', status: 'sent', currency: 'BWP', note: '', lines: [] }],
    } as never)
    expect(m.setup.done).toBe(true)
  })

  it('shows the wizard to a workspace that never traded', () => {
    const m = migrate({ version: 4, partners: [], products: [], moves: [], invoices: [] } as never)
    expect(m.setup.done).toBe(false)
    expect(m.company.country).toBeTruthy()
    expect(m.company.taxLabel).toBeTruthy()
  })
})
