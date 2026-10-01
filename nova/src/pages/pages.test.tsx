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
import Apps from './Apps'
import Channels from './Channels'
import Inventory from './Inventory'
import Accounting from './Accounting'
import Reports from './Reports'
import Settings from './Settings'
import { ErrorBoundary, ToastHost } from '../lib/ui'
import { resetDB, update } from '../lib/db'

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
  ['/apps', 'Activate only what you need', <Apps key="ap" />],
  ['/channels', 'Payment channels', <Channels key="ch" />],
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

  it('shows the first-run wizard until setup is finished', () => {
    resetDB()
    update(d => { d.setup = { done: false, step: 0, dismissedChecklist: false } })
    expect(render('/', <Dashboard />)).toContain('Set up in under two minutes')
  })

  it('hides the wizard and shows the checklist once setup is done', () => {
    resetDB()
    update(d => { d.setup = { done: true, step: 0, dismissedChecklist: false } })
    const html = render('/', <Dashboard />)
    expect(html).not.toContain('Set up in under two minutes')
    expect(html).toContain('Get set up')
  })

  it('renders the shared navigation shell on every page', () => {
    const html = render('/', <Dashboard />)
    expect(html).toContain('Nova ERP')
    expect(html).toContain('Offline-first')
  })
})
