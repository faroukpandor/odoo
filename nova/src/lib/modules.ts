/**
 * Module registry — Nova's "app store".
 *
 * Everything ships inside the same static bundle, so activating a module is
 * instant and offline: there is nothing to download, licence or provision.
 * Modules marked `planned` are not built yet; a workspace can request one and
 * the request is stored locally so it shows up on the roadmap board.
 */
export type Tier = 'hacker' | 'micro' | 'small' | 'medium' | 'large' | 'enterprise'

export interface ModuleSpec {
  id: string
  name: string
  icon: string
  /** Route path, when the module has its own page. */
  to?: string
  group: 'Core' | 'Finance' | 'Operations' | 'People' | 'Growth' | 'Platform'
  /** Smallest business size that typically needs it. */
  tier: Tier
  /** Core modules cannot be switched off. */
  core?: boolean
  /** `live` = shipping today, `planned` = request it and vote with your data. */
  status: 'live' | 'planned'
  blurb: string
}

export const TIERS: { id: Tier; label: string; detail: string }[] = [
  { id: 'hacker', label: 'Hacker / solo', detail: 'One person, side project, invoices and books only' },
  { id: 'micro', label: 'Micro business', detail: 'Under 5 people, stock and bills start to matter' },
  { id: 'small', label: 'Small business', detail: 'Quotes, delivery notes, payroll-lite, projects' },
  { id: 'medium', label: 'Medium', detail: 'Multi-warehouse, manufacturing, approvals, budgets' },
  { id: 'large', label: 'Large', detail: 'Multi-entity consolidation, fixed assets, audit trail' },
  { id: 'enterprise', label: 'Corporate / enterprise', detail: 'Everything, including governance and integrations' },
]

export const MODULES: ModuleSpec[] = [
  // Core — always on.
  { id: 'dashboard', name: 'Dashboard', icon: '◎', to: '/', group: 'Core', tier: 'hacker', core: true, status: 'live', blurb: 'Live KPIs computed on device.' },
  { id: 'crm', name: 'CRM', icon: '◈', to: '/crm', group: 'Growth', tier: 'hacker', core: true, status: 'live', blurb: 'Contacts and a five-stage pipeline.' },
  { id: 'sales', name: 'Sales & invoicing', icon: '▤', to: '/invoices', group: 'Core', tier: 'hacker', core: true, status: 'live', blurb: 'Quotes, pro-forma, invoices, delivery notes, payment links.' },
  { id: 'purchasing', name: 'Purchasing & expenses', icon: '▣', to: '/purchases', group: 'Finance', tier: 'hacker', core: true, status: 'live', blurb: 'Vendor bills, expense claims, account coding.' },
  { id: 'banking', name: 'Banking', icon: '⛁', to: '/banking', group: 'Finance', tier: 'hacker', core: true, status: 'live', blurb: 'Payments, statement import, reconciliation.' },
  { id: 'accounting', name: 'Accounting', icon: '∑', to: '/accounting', group: 'Finance', tier: 'hacker', core: true, status: 'live', blurb: 'Derived double-entry ledger and statements.' },
  { id: 'reports', name: 'Reports', icon: '◱', to: '/reports', group: 'Finance', tier: 'hacker', core: true, status: 'live', blurb: 'Ageing, VAT, concentration, cash, CSV export.' },

  // Optional, shipping today.
  { id: 'inventory', name: 'Inventory', icon: '▦', to: '/inventory', group: 'Operations', tier: 'micro', status: 'live', blurb: 'Products, live stock from the move ledger, reorder alerts.' },
  { id: 'payments', name: 'Payment channels', icon: '⇄', to: '/channels', group: 'Finance', tier: 'micro', status: 'live', blurb: 'Cards, mobile money, crypto, EFT, vouchers — QR and links.' },
  { id: 'apps', name: 'Apps & modules', icon: '⊞', to: '/apps', group: 'Platform', tier: 'hacker', core: true, status: 'live', blurb: 'Turn modules on and off, pick a business profile.' },

  // Premium capability, on standby until requested.
  { id: 'pos', name: 'Point of sale', icon: '⌗', group: 'Operations', tier: 'micro', status: 'planned', blurb: 'Offline touch till with cash-up and receipt printing.' },
  { id: 'projects', name: 'Projects & timesheets', icon: '◳', group: 'Operations', tier: 'small', status: 'planned', blurb: 'Tasks, time capture, billable recovery per project.' },
  { id: 'hr', name: 'HR & payroll', icon: '☗', group: 'People', tier: 'small', status: 'planned', blurb: 'Employees, leave, payslips, PAYE schedules.' },
  { id: 'subscriptions', name: 'Recurring billing', icon: '↻', to: '/recurring', group: 'Growth', tier: 'small', status: 'live', blurb: 'Retainers and subscriptions that invoice themselves, with MRR.' },
  { id: 'multicurrency', name: 'Multi-currency', icon: '§', group: 'Finance', tier: 'small', status: 'planned', blurb: 'Per-document FX, revaluation and realised gain/loss.' },
  { id: 'warehouse', name: 'Multi-warehouse & barcode', icon: '⊟', group: 'Operations', tier: 'medium', status: 'planned', blurb: 'Locations, transfers, pick/pack, camera barcode scanning.' },
  { id: 'manufacturing', name: 'Manufacturing (MRP)', icon: '⚒', group: 'Operations', tier: 'medium', status: 'planned', blurb: 'Bills of materials, work orders, WIP valuation.' },
  { id: 'budgets', name: 'Budgets & forecasting', icon: '◴', group: 'Finance', tier: 'medium', status: 'planned', blurb: 'Budget vs actual by account and cash runway.' },
  { id: 'approvals', name: 'Approvals & workflow', icon: '✔', group: 'Platform', tier: 'medium', status: 'planned', blurb: 'Spend limits, sign-off chains, segregation of duties.' },
  { id: 'assets', name: 'Fixed assets', icon: '▥', group: 'Finance', tier: 'large', status: 'planned', blurb: 'Asset register, depreciation schedules, disposals.' },
  { id: 'multicompany', name: 'Multi-company consolidation', icon: '⌸', group: 'Platform', tier: 'large', status: 'planned', blurb: 'Several entities, intercompany elimination, group reports.' },
  { id: 'audit', name: 'Audit trail & compliance', icon: '⎙', group: 'Platform', tier: 'large', status: 'planned', blurb: 'Immutable change log, period locks, auditor export pack.' },
  { id: 'fieldservice', name: 'Field service', icon: '⌁', group: 'Operations', tier: 'medium', status: 'planned', blurb: 'Jobs, dispatch, signature capture, offline job cards.' },
  { id: 'ecommerce', name: 'E-commerce & catalogue sync', icon: '⌂', group: 'Growth', tier: 'medium', status: 'planned', blurb: 'Public price list, order intake, storefront export.' },
  { id: 'integrations', name: 'Integrations & API bridge', icon: '⇌', group: 'Platform', tier: 'enterprise', status: 'planned', blurb: 'Optional self-hosted sync bridge, webhooks, CSV/REST import.' },
  { id: 'teams', name: 'Multi-user & roles', icon: '☖', group: 'Platform', tier: 'enterprise', status: 'planned', blurb: 'Peer-to-peer sync with per-role permissions, still no vendor server.' },
]

export const byId = (id: string) => MODULES.find(m => m.id === id)

export const CORE_IDS = MODULES.filter(m => m.core).map(m => m.id)

/** What a fresh workspace switches on. */
export const DEFAULT_MODULES = [...CORE_IDS, 'inventory', 'payments', 'subscriptions']

const TIER_ORDER: Tier[] = ['hacker', 'micro', 'small', 'medium', 'large', 'enterprise']

/** Everything a business of this size typically needs, that actually ships. */
export function modulesForTier(tier: Tier): string[] {
  const max = TIER_ORDER.indexOf(tier)
  return MODULES
    .filter(m => m.status === 'live' && TIER_ORDER.indexOf(m.tier) <= max)
    .map(m => m.id)
}

export const isEnabled = (enabled: string[], id: string) =>
  CORE_IDS.includes(id) || enabled.includes(id)

/** Navigation entries for the modules this workspace has switched on. */
export function navModules(enabled: string[]) {
  return MODULES.filter(m => m.to && m.status === 'live' && isEnabled(enabled, m.id))
}
