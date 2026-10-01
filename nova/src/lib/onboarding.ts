/**
 * Onboarding: a short wizard on first run, then a checklist that keeps
 * nudging until the workspace is genuinely usable.
 *
 * Everything is derived from the data itself — no tracking, no server, and a
 * returning user never sees a task they have already done.
 */
import { DB, Company } from './db'
import { liveChannels } from './tender'
import { MODULES } from './modules'

export interface Task {
  id: string
  label: string
  detail: string
  to: string
  done: boolean
  /** Tasks the business cannot really trade without. */
  essential: boolean
}

export function checklist(d: DB): Task[] {
  const hasCustomer = d.partners.some(p => p.kind !== 'supplier')
  const hasSalesDoc = d.invoices.length > 0
  return [
    {
      id: 'company', label: 'Name your company', to: '/settings', essential: true,
      detail: 'Appears on every quote, invoice and delivery note.',
      done: !!d.company.name && d.company.name !== 'My Company',
    },
    {
      id: 'tax', label: `Set your ${d.company.taxLabel || 'tax'} rate`, to: '/settings', essential: true,
      detail: 'Used as the default on new document lines and in the tax return.',
      done: d.company.taxRate > 0 || !!d.company.vatId,
    },
    {
      id: 'contact', label: 'Add your first customer', to: '/crm', essential: true,
      detail: 'Contacts feed quotes, invoices and the pipeline.',
      done: hasCustomer,
    },
    {
      id: 'product', label: 'Add a product or service', to: '/inventory', essential: false,
      detail: 'Lets you build documents from a price list instead of typing.',
      done: d.products.length > 0,
    },
    {
      id: 'channel', label: 'Choose how you get paid', to: '/channels', essential: true,
      detail: 'Puts a tap-to-pay link and QR code on every invoice.',
      done: liveChannels(d).length > 0,
    },
    {
      id: 'document', label: 'Send your first quote or invoice', to: '/invoices', essential: true,
      detail: 'Share it straight to WhatsApp, email or PDF.',
      done: hasSalesDoc,
    },
    {
      id: 'brand', label: 'Make your stationery', to: '/brand', essential: false,
      detail: 'Business cards, letterhead and a matching invoice theme in one click.',
      done: !!d.company.brand,
    },
    {
      id: 'payment', label: 'Record a payment', to: '/banking', essential: false,
      detail: 'Settles the invoice and posts the cash side of the ledger.',
      done: d.payments.length > 0,
    },
    {
      id: 'modules', label: 'Pick your business profile', to: '/apps', essential: false,
      detail: 'Switches on the modules a business your size actually needs.',
      done: d.modules.enabled.length !== 0 && d.setup.done,
    },
    {
      id: 'backup', label: 'Export a backup', to: '/settings', essential: false,
      detail: 'Your whole company is one JSON file you own.',
      done: d.setup.dismissedChecklist,
    },
  ]
}

export const progress = (d: DB) => {
  const list = checklist(d)
  const done = list.filter(t => t.done).length
  return { done, total: list.length, pct: Math.round((done / list.length) * 100) }
}

/** Currency and tax defaults so a new user types as little as possible. */
export const COUNTRY_DEFAULTS: Record<string, { currency: string; taxRate: number; taxLabel: string }> = {
  BW: { currency: 'BWP', taxRate: 14, taxLabel: 'VAT' },
  ZA: { currency: 'ZAR', taxRate: 15, taxLabel: 'VAT' },
  NA: { currency: 'NAD', taxRate: 15, taxLabel: 'VAT' },
  ZW: { currency: 'USD', taxRate: 15, taxLabel: 'VAT' },
  ZM: { currency: 'ZMW', taxRate: 16, taxLabel: 'VAT' },
  KE: { currency: 'KES', taxRate: 16, taxLabel: 'VAT' },
  TZ: { currency: 'TZS', taxRate: 18, taxLabel: 'VAT' },
  UG: { currency: 'UGX', taxRate: 18, taxLabel: 'VAT' },
  RW: { currency: 'RWF', taxRate: 18, taxLabel: 'VAT' },
  NG: { currency: 'NGN', taxRate: 7.5, taxLabel: 'VAT' },
  GH: { currency: 'GHS', taxRate: 15, taxLabel: 'VAT' },
  ET: { currency: 'ETB', taxRate: 15, taxLabel: 'VAT' },
  EG: { currency: 'EGP', taxRate: 14, taxLabel: 'VAT' },
  GB: { currency: 'GBP', taxRate: 20, taxLabel: 'VAT' },
  DE: { currency: 'EUR', taxRate: 19, taxLabel: 'VAT' },
  FR: { currency: 'EUR', taxRate: 20, taxLabel: 'VAT' },
  NL: { currency: 'EUR', taxRate: 21, taxLabel: 'VAT' },
  US: { currency: 'USD', taxRate: 0, taxLabel: 'Sales tax' },
  CA: { currency: 'CAD', taxRate: 5, taxLabel: 'GST' },
  BR: { currency: 'BRL', taxRate: 17, taxLabel: 'ICMS' },
  MX: { currency: 'MXN', taxRate: 16, taxLabel: 'IVA' },
  IN: { currency: 'INR', taxRate: 18, taxLabel: 'GST' },
  BD: { currency: 'BDT', taxRate: 15, taxLabel: 'VAT' },
  PH: { currency: 'PHP', taxRate: 12, taxLabel: 'VAT' },
  ID: { currency: 'IDR', taxRate: 11, taxLabel: 'PPN' },
  TH: { currency: 'THB', taxRate: 7, taxLabel: 'VAT' },
  AE: { currency: 'AED', taxRate: 5, taxLabel: 'VAT' },
  AU: { currency: 'AUD', taxRate: 10, taxLabel: 'GST' },
  SG: { currency: 'SGD', taxRate: 9, taxLabel: 'GST' },
  CN: { currency: 'CNY', taxRate: 13, taxLabel: 'VAT' },
}

export function applyCountry(company: Company, code: string): Company {
  const d = COUNTRY_DEFAULTS[code]
  return d ? { ...company, country: code, ...d } : { ...company, country: code }
}

/** Best guess from the browser, so the wizard opens on the right country. */
export function guessCountry(fallback = 'BW'): string {
  try {
    const loc = typeof navigator !== 'undefined' ? navigator.language : ''
    const region = loc.split('-')[1]?.toUpperCase()
    if (region && COUNTRY_DEFAULTS[region]) return region
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    const byTz: Record<string, string> = {
      'Africa/Gaborone': 'BW', 'Africa/Johannesburg': 'ZA', 'Africa/Nairobi': 'KE',
      'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Harare': 'ZW',
      'Europe/London': 'GB', 'America/New_York': 'US', 'Asia/Kolkata': 'IN',
    }
    return byTz[tz] ?? fallback
  } catch {
    return fallback
  }
}

/** Modules that make sense for what the user says they do. */
export const BUSINESS_KINDS: { id: string; label: string; detail: string; modules: string[] }[] = [
  { id: 'services', label: 'Services & consulting', detail: 'Bill time and deliverables', modules: ['payments'] },
  { id: 'retail', label: 'Retail / trading', detail: 'Buy, hold and sell stock', modules: ['inventory', 'payments'] },
  { id: 'online', label: 'Online / e-commerce', detail: 'Orders from links and socials', modules: ['inventory', 'payments'] },
  { id: 'trades', label: 'Trades & field work', detail: 'Quotes on site, invoice on completion', modules: ['payments'] },
  { id: 'ngo', label: 'NGO / association', detail: 'Grants, budgets and accountability', modules: ['payments'] },
  { id: 'other', label: 'Something else', detail: 'Start lean, add modules later', modules: ['payments'] },
]

export const moduleName = (id: string) => MODULES.find(m => m.id === id)?.name ?? id
