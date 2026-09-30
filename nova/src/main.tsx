import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import Invoices from './pages/Invoices'
import Inventory from './pages/Inventory'
import Purchases from './pages/Purchases'
import Accounting from './pages/Accounting'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import { initDB } from './lib/db'
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
initDB().finally(start)

// Installable, fully offline PWA.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}
