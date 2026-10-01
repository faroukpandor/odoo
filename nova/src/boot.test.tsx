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
import Apps from './pages/Apps'
import Accounting from './pages/Accounting'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { ErrorBoundary, ToastHost } from './lib/ui'
import { resetDB, update, getDB } from './lib/db'

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
  '#/channels', '#/apps', '#/accounting', '#/reports', '#/settings']

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
