import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import Dashboard from './pages/Dashboard'
import CRM from './pages/CRM'
import Invoices from './pages/Invoices'
import Inventory from './pages/Inventory'
import Settings from './pages/Settings'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HashRouter => deep links work on GitHub Pages / any static host */}
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Dashboard />} />
          <Route path="crm" element={<CRM />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
