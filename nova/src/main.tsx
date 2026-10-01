import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import Invoices from './pages/Invoices'
import Inventory from './pages/Inventory'
import Purchases from './pages/Purchases'
import Banking from './pages/Banking'
import Apps from './pages/Apps'
import Channels from './pages/Channels'
import Recurring from './pages/Recurring'
import Accounting from './pages/Accounting'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { initDB, update, getDB, uid, today } from './lib/db'
import { runSchedules, dueSchedules } from './lib/recurring'
import { initTheme } from './lib/theme'
import { autoSnapshot } from './lib/backup'
import { ErrorBoundary, ToastHost } from './lib/ui'
import './styles.css'

function start() {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {/* HashRouter => deep links work on GitHub Pages / any static host */}
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
            <Route path="apps" element={<Apps />} />
            <Route path="channels" element={<Channels />} />
            <Route path="recurring" element={<Recurring />} />
            <Route path="inventory" element={<Inventory />} />
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
}

// Hydrate from IndexedDB first, then render; never block boot on storage errors.
initTheme()

initDB().finally(() => {
  // Catch up any recurring invoice that fell due while the app was closed.
  try {
    if (dueSchedules(getDB()).length) update(d => { runSchedules(d, today(), uid) })
  } catch { /* never block boot on billing */ }
  start()
  // Restore points are created in the background, never blocking first paint.
  void autoSnapshot()
})

// Installable, fully offline PWA.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
