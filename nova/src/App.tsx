import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDB, update } from './lib/db'
import { navModules } from './lib/modules'
import { currentUser, canSee, initials, roleLabel, switchUser, isReadOnly } from './lib/team'
import { THEMES, Theme, getTheme, applyTheme } from './lib/theme'
import CommandPalette from './components/CommandPalette'
import Onboarding from './components/Onboarding'

export default function App() {
  const db = useDB()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const me = currentUser(db)
  const [theme, setTheme] = useState<Theme>(getTheme)
  const nav = navModules(db.modules.enabled).filter(n => canSee(db, n.to!))

  return (
    <div className={'shell' + (open ? ' nav-open' : '')}>
      <header className="topbar">
        <button className="burger" aria-label="Menu" onClick={() => setOpen(v => !v)}>☰</button>
        <strong>Nova ERP</strong>
        <span className="grow" />
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
        {db.users.length > 1 && (
          <div className="who">
            <span className="avatar" aria-hidden>{initials(me.name)}</span>
            <select aria-label="Signed in as" value={me.id}
              onChange={e => update(d => switchUser(d, e.target.value))}>
              {db.users.filter(u => u.active).map(u =>
                <option key={u.id} value={u.id}>{u.name} · {roleLabel(u.role)}</option>)}
            </select>
          </div>
        )}
        <button className="cmdk" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          Search <kbd>Ctrl</kbd><kbd>K</kbd>
        </button>
        <div className="theme-switch" role="group" aria-label="Appearance">
          {THEMES.map(t => (
            <button key={t.id} className={'theme-btn' + (theme === t.id ? ' on' : '')}
              title={t.label} aria-label={t.label} aria-pressed={theme === t.id}
              onClick={() => { setTheme(t.id); applyTheme(t.id) }}>{t.icon}</button>
          ))}
        </div>
        <div className="side-foot">
          <span className="dot" /> Offline-first · no server
          {isReadOnly(db) && <div className="small warn">Read-only — you are signed in as a viewer</div>}
        </div>
      </aside>

      <main className="main" key={loc.pathname}><Outlet /></main>

      <nav className="tabbar" aria-label="Main">
        {nav.slice(0, 5).map(n => (
          <NavLink key={n.to} to={n.to!} end={n.to === '/'}
            className={({ isActive }) => 'tabbar-link' + (isActive ? ' active' : '')}>
            <span className="ico">{n.icon}</span>
            <span className="small">{n.name.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
      {!db.setup.done && <Onboarding />}
      <CommandPalette />
    </div>
  )
}
