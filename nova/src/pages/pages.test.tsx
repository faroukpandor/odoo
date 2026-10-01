import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import React from 'react'
import App from '../App'
import Dashboard from './Dashboard'
import CRM from './CRM'
import Invoices from './Invoices'
import Purchases from './Purchases'
import Banking from './Banking'
import Inventory from './Inventory'
import Accounting from './Accounting'
import Reports from './Reports'
import Settings from './Settings'
import { ErrorBoundary, ToastHost } from '../lib/ui'

/**
 * Smoke test: every route must render without throwing, using the seeded
 * demo database. This is the cheap guard that catches a broken page before
 * it ever reaches a user.
 */
const routes: [string, string, React.ReactNode][] = [
  ['/', 'Dashboard', <Dashboard key="d" />],
  ['/crm', 'CRM', <CRM key="c" />],
  ['/invoices', 'Invoicing', <Invoices key="i" />],
  ['/purchases', 'Purchasing', <Purchases key="p" />],
  ['/banking', 'Banking', <Banking key="b" />],
  ['/inventory', 'Inventory', <Inventory key="n" />],
  ['/accounting', 'Accounting', <Accounting key="a" />],
  ['/reports', 'Reports', <Reports key="r" />],
  ['/settings', 'Settings', <Settings key="s" />],
]

const render = (path: string, el: React.ReactNode) =>
  renderToString(
    <ErrorBoundary>
      <ToastHost>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/" element={<App />}>
              <Route path={path === '/' ? '' : path.slice(1)} element={el} index={path === '/'} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastHost>
    </ErrorBoundary>,
  )

describe('page smoke tests', () => {
  routes.forEach(([path, heading, el]) => {
    it(`renders ${heading} without crashing`, () => {
      const html = render(path, el)
      expect(html).toContain(heading)
      expect(html).not.toContain('Something went wrong')
    })
  })

  it('renders the shared navigation shell on every page', () => {
    const html = render('/', <Dashboard />)
    expect(html).toContain('Nova ERP')
    expect(html).toContain('Offline-first')
  })
})
