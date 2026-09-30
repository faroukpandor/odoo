import { NavLink, Outlet } from 'react-router-dom'
import { useDB } from './lib/db'
import CommandPalette from './components/CommandPalette'

const nav = [
  { to: '/', label: 'Dashboard', icon: '◎', end: true },
  { to: '/crm', label: 'CRM', icon: '◈' },
  { to: '/invoices', label: 'Invoicing', icon: '▤' },
  { to: '/purchases', label: 'Purchasing', icon: '▣' },
  { to: '/inventory', label: 'Inventory', icon: '▦' },
  { to: '/accounting', label: 'Accounting', icon: '∑' },
  { to: '/reports', label: 'Reports', icon: '◱' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function App() {
  const db = useDB()
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <span className="logo">N</span>
          <div>
            <strong>Nova ERP</strong>
            <small>{db.company.name}</small>
          </div>
        </div>
        <nav>
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => 'navlink' + (isActive ? ' active' : '')}>
              <span className="ico">{n.icon}</span>{n.label}
            </NavLink>
          ))}
        </nav>
        <button className="cmdk" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}>
          Search <kbd>Ctrl</kbd><kbd>K</kbd>
        </button>
        <div className="side-foot">
          <span className="dot" /> Offline-first · no server
        </div>
      </aside>
      <main className="main"><Outlet /></main>
      <CommandPalette />
    </div>
  )
}
