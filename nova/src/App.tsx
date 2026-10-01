import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDB } from './lib/db'
import { navModules } from './lib/modules'
import CommandPalette from './components/CommandPalette'
import Onboarding from './components/Onboarding'

export default function App() {
  const db = useDB()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = navModules(db.modules.enabled)

  return (
    <div className={'shell' + (open ? ' nav-open' : '')}>
      <header className="topbar">
        <button className="burger" aria-label="Menu" onClick={() => setOpen(v => !v)}>☰</button>
        <strong>Nova ERP</strong>
        <button className="burger" aria-label="Search"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>⌕</button>
      </header>

      <aside className="side" onClick={() => setOpen(false)}>
        <div className="brand">
          <span className="logo">N</span>
          <div>
            <strong>Nova ERP</strong>
            <small>{db.company.name}</small>
          </div>
        </div>
        <nav>
          {nav.map(n => (
            <NavLink key={n.to} to={n.to!} end={n.to === '/'}
              className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
              <span className="ico">{n.icon}</span>{n.name}
            </NavLink>
          ))}
          <NavLink to="/settings" className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
            <span className="ico">⚙</span>Settings
          </NavLink>
        </nav>
        <button className="cmdk" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          Search <kbd>Ctrl</kbd><kbd>K</kbd>
        </button>
        <div className="side-foot">
          <span className="dot" /> Offline-first · no server
        </div>
      </aside>

      <main className="main" key={loc.pathname}><Outlet /></main>
      {!db.setup.done && <Onboarding />}
      <CommandPalette />
    </div>
  )
}
