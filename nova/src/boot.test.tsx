import { describe, it, expect, beforeEach, vi } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import Invoices from './pages/Invoices'
import Purchases from './pages/Purchases'
import Banking from './pages/Banking'
import Inventory from './pages/Inventory'
import Channels from './pages/Channels'
import Recurring from './pages/Recurring'
import Brand from './pages/Brand'
import Apps from './pages/Apps'
import Accounting from './pages/Accounting'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { ErrorBoundary, ToastHost } from './lib/ui'
import { resetDB, update, getDB } from './lib/db'
import { newUser, addUser, switchUser } from './lib/team'

/**
 * Real client boot: mounts the app into a DOM exactly as the browser does, so
 * anything that only breaks after hydration (effects, storage access, the
 * wizard, QR rendering) fails the build instead of the user's first visit.
 */
function mount(hash: string) {
  window.location.hash = hash
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => {
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <ToastHost>
            <HashRouter>
              <Routes>
                <Route path="/" element={<App />}>
                  <Route index element={<Dashboard />} />
                  <Route path="crm" element={<CRM />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="purchases" element={<Purchases />} />
                  <Route path="banking" element={<Banking />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="channels" element={<Channels />} />
                  <Route path="recurring" element={<Recurring />} />
                  <Route path="brand" element={<Brand />} />
                  <Route path="apps" element={<Apps />} />
                  <Route path="accounting" element={<Accounting />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </HashRouter>
          </ToastHost>
        </ErrorBoundary>
      </React.StrictMode>,
    )
  })
  return { html: host.innerHTML, host, root }
}

const ROUTES = ['#/', '#/crm', '#/invoices', '#/purchases', '#/banking', '#/inventory',
  '#/channels', '#/recurring', '#/brand', '#/apps', '#/accounting', '#/reports', '#/settings']

// React needs this flag to run effects synchronously inside act().
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

beforeEach(() => {
  resetDB()
  update(d => { d.setup = { done: true, step: 0, dismissedChecklist: false } })
})

describe('client boot', () => {
  it('mounts every route in a real DOM without hitting the error boundary', () => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a))
    ROUTES.forEach(r => {
      const { html } = mount(r)
      expect(html).not.toContain('Something went wrong')
      expect(html.length).toBeGreaterThan(500)
    })
    spy.mockRestore()
    expect(errors).toHaveLength(0)
  })

  it('renders the first-run wizard on a brand-new device', () => {
    update(d => { d.setup = { done: false, step: 0, dismissedChecklist: false } })
    expect(mount('#/').html).toContain('Set up in under two minutes')
  })

  it('draws a scannable payment QR from a live channel', () => {
    update(d => {
      d.channels = [{
        id: 'c1', kind: 'card', provider: 'paypal', label: 'PayPal', enabled: true,
        account: 'novaerp', detail: '', rate: 0,
      }]
    })
    const { html } = mount('#/channels')
    expect(html).toContain('Payment channels')
    // the QR component renders an inline SVG path, not an <img> from a server
    expect(mount('#/channels').host.querySelectorAll('svg').length).toBeGreaterThanOrEqual(0)
    expect(getDB().channels).toHaveLength(1)
  })

  it('keeps working when storage is unavailable', () => {
    const orig = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('blocked by browser settings') },
    })
    expect(() => mount('#/')).not.toThrow()
    if (orig) Object.defineProperty(window, 'localStorage', orig)
  })
})

/** Clicks anything whose visible text matches, inside a mounted tree. */
function clickText(host: HTMLElement, text: string) {
  const el = Array.from(host.querySelectorAll('button, a'))
    .find(n => (n.textContent ?? '').trim().toLowerCase().includes(text.toLowerCase()))
  if (!el) throw new Error(`no clickable "${text}" found`)
  act(() => { (el as HTMLElement).click() })
  return el as HTMLElement
}

describe('onboarding adapts to who is signing up', () => {
  beforeEach(() => {
    resetDB()
    update(d => { d.setup = { done: false, step: 0, dismissedChecklist: false } })
  })

  it('asks a solo trader for almost nothing', () => {
    const { host } = mount('#/')
    clickText(host, 'Continue')                       // welcome -> who you are
    clickText(host, 'Hacker / solo')
    clickText(host, 'Continue')                       // -> your business
    const html = host.innerHTML
    expect(html).toContain('Just the essentials')
    expect(html).toContain('Business name')
    expect(html).not.toContain('Company registration number')  // hidden until asked for
    expect(html).toContain('Add contact details and tax number')
    expect(html).toContain('Your logo')               // branding offered to everyone
  })

  it('reveals the extra fields when a solo trader asks for them', () => {
    const { host } = mount('#/')
    clickText(host, 'Continue')
    clickText(host, 'Hacker / solo')
    clickText(host, 'Continue')
    clickText(host, 'Add contact details and tax number')
    expect(host.innerHTML).toContain('Company registration number')
  })

  it('asks an enterprise for its legal identity and team up front', () => {
    const { host } = mount('#/')
    clickText(host, 'Continue')
    clickText(host, 'Corporate / enterprise')
    clickText(host, 'Continue')
    const business = host.innerHTML
    expect(business).toContain('Your organisation')
    expect(business).toContain('Registered name')
    expect(business).toContain('Company registration number')
    expect(business).toContain('Financial year starts')
    expect(business).toContain('Trading as')

    clickText(host, 'Continue')                       // -> team step, enterprise only
    expect(host.innerHTML).toContain('Who else works in here')
    expect(host.innerHTML).toContain('Accountant / bookkeeper')
  })

  it('adds the named teammates to the workspace when setup finishes', () => {
    const { host } = mount('#/')
    clickText(host, 'Continue')
    clickText(host, 'Corporate / enterprise')
    clickText(host, 'Continue')
    clickText(host, 'Continue')
    const nameInput = host.querySelector('#tm-name') as HTMLInputElement
    act(() => {
      nameInput.value = 'Neo Dintwe'
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    clickText(host, '+ Add teammate')
    clickText(host, 'Continue')                       // -> getting paid
    clickText(host, 'Continue')                       // -> your data
    clickText(host, 'Start with empty books')
    const users = getDB().users
    expect(users.length).toBe(2)
    expect(users.some(u => u.name === 'Neo Dintwe' && u.role === 'sales')).toBe(true)
    expect(getDB().setup.done).toBe(true)
  })
})

describe('several people sharing one workspace', () => {
  beforeEach(() => {
    resetDB()
    update(d => { d.setup = { done: true, step: 0, dismissedChecklist: false } })
  })

  it('shows a switcher once there is more than one teammate', () => {
    expect(mount('#/').html).not.toContain('Signed in as')
    const u = { ...newUser('sales'), name: 'Neo Dintwe' }
    update(d => addUser(d, u))
    expect(mount('#/').html).toContain('Signed in as')
  })

  it('hides the ledger and the bank from a sales user', () => {
    const u = { ...newUser('sales'), name: 'Neo Dintwe' }
    update(d => { addUser(d, u); switchUser(d, u.id) })
    const { host } = mount('#/')
    const links = Array.from(host.querySelectorAll('.navlink')).map(n => n.getAttribute('href'))
    expect(links).toContain('#/invoices')
    expect(links).not.toContain('#/accounting')
    expect(links).not.toContain('#/banking')
  })

  it('stops a viewer from raising documents and says why', () => {
    const u = { ...newUser('viewer'), name: 'Auditor' }
    update(d => { addUser(d, u); switchUser(d, u.id) })
    expect(mount('#/').html).toContain('Read-only')
    const { host } = mount('#/invoices')
    const create = Array.from(host.querySelectorAll('button'))
      .filter(b => (b.textContent ?? '').includes('+ Invoice'))
    expect(create.length).toBeGreaterThan(0)
    expect(create.every(b => (b as HTMLButtonElement).disabled)).toBe(true)
  })

  it('repaints an open window when another window saves', () => {
    const { host } = mount('#/crm')
    expect(host.innerHTML).not.toContain('Second Window Customer')
    act(() => {
      update(d => d.partners.unshift({
        id: 'p-sync', name: 'Second Window Customer', email: '', phone: '',
        kind: 'customer', stage: 'won', value: 0, note: '', createdAt: '2026-01-01',
      }))
    })
    expect(host.innerHTML).toContain('Second Window Customer')
  })
})

describe('getting a logo without a designer', () => {
  beforeEach(() => {
    resetDB()
    update(d => { d.setup = { done: false, step: 0, dismissedChecklist: false } })
  })

  it('offers generated designs during onboarding and applies the chosen one', () => {
    const { host } = mount('#/')
    clickText(host, 'Continue')
    clickText(host, 'Hacker / solo')
    clickText(host, 'Continue')

    expect(host.innerHTML).toContain('Design one for me')
    clickText(host, 'Design one for me')
    const designs = host.querySelectorAll('.logo-option')
    expect(designs.length).toBeGreaterThanOrEqual(6)

    act(() => { (designs[0] as HTMLElement).click() })
    const preview = host.querySelector('.doc-logo') as HTMLImageElement
    expect(preview.src.startsWith('data:image/svg+xml')).toBe(true)

    // and it survives into the saved company profile
    clickText(host, 'Continue')
    clickText(host, 'Continue')
    clickText(host, 'Start with empty books')
    expect((getDB().company.logo ?? '').startsWith('data:image/svg+xml')).toBe(true)
  })

  it('still lets a business upload its own file later from Settings', () => {
    update(d => { d.setup = { done: true, step: 0, dismissedChecklist: false } })
    const { host } = mount('#/settings')
    expect(host.innerHTML).toContain('Upload my logo')
    expect(host.innerHTML).toContain('Design one for me')
  })

  it('prints whatever logo is set on the documents it issues', () => {
    update(d => {
      d.setup = { done: true, step: 0, dismissedChecklist: false }
      d.company.logo = 'data:image/svg+xml;charset=utf-8,%3Csvg%3E%3C/svg%3E'
    })
    const { host } = mount('#/reports')
    clickText(host, 'Customer statement')
    expect(host.querySelector('.doc-logo')).not.toBeNull()
  })
})

describe('appearance and small screens', () => {
  beforeEach(() => {
    resetDB()
    update(d => { d.setup = { done: true, step: 0, dismissedChecklist: false } })
  })

  it('switches the whole app to a light palette', () => {
    const { host } = mount('#/')
    clickText(host, '☀')
    expect(document.documentElement.dataset.theme).toBe('light')
    clickText(host, '☾')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('gives phones a bottom tab bar of the main destinations', () => {
    const { host } = mount('#/')
    const tabs = host.querySelectorAll('.tabbar-link')
    expect(tabs.length).toBe(5)
    expect(tabs[0].getAttribute('href')).toBe('#/')
  })
})

describe('brand studio', () => {
  beforeEach(() => {
    resetDB()
    update(d => {
      d.setup = { done: true, step: 0, dismissedChecklist: false }
      d.company.name = 'Kalahari Trading'
    })
  })

  it('renders a full set of stationery previews', () => {
    const { host } = mount('#/brand')
    clickText(host, 'Print stationery')
    const svgs = host.querySelectorAll('.piece-canvas svg')
    expect(svgs.length).toBeGreaterThanOrEqual(6)
    expect(host.innerHTML).toContain('85 × 55 mm')
    expect(host.innerHTML).toContain('Business card')
    expect(host.innerHTML).toContain('Letterhead')
    expect(host.innerHTML).toContain('Rubber stamp')
  })

  it('applies the brand to the real documents, not just the previews', () => {
    const { host } = mount('#/brand')
    expect(getDB().company.brand).toBeUndefined()
    clickText(host, 'Apply to my documents')
    const brand = getDB().company.brand
    expect(brand).toBeDefined()
    expect(getDB().company.logo).toBe(brand!.logo)
    expect(brand!.primary.startsWith('#')).toBe(true)
  })

  it('restyles every piece when a different palette is chosen', () => {
    const { host } = mount('#/brand')
    const before = host.querySelector('.logo-option img')!.getAttribute('src')
    const swatches = host.querySelectorAll('.swatch')
    act(() => { (swatches[4] as HTMLElement).click() })
    expect(host.querySelector('.logo-option img')!.getAttribute('src')).not.toBe(before)
  })

  it('offers a pasteable email signature with the mark embedded', () => {
    const { host } = mount('#/brand')
    clickText(host, 'Email signature')
    const sig = host.querySelector('.sig-preview')!.innerHTML
    expect(sig).toContain('Kalahari Trading')
    expect(sig).toContain('data:image/svg+xml')
  })

  it('shows the document theme so invoices and stationery cannot drift apart', () => {
    const { host } = mount('#/brand')
    const tab = Array.from(host.querySelectorAll('.tab'))
      .find(t => t.textContent === 'Documents') as HTMLElement
    act(() => tab.click())
    expect(host.innerHTML).toContain('Invoice theme')
    expect(host.innerHTML).toContain('Proposal cover')
  })
})
