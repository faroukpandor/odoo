import { NavLink, Outlet } from 'react-router-dom'
import { useDB } from './lib/db'

const nav = [
  { to: '/', label: 'Dashboard', icon: '◎', end: true },
  { to: '/crm', label: 'CRM', icon: '◈' },
  { to: '/invoices', label: 'Invoicing', icon: '▤' },
  { to: '/inventory', label: 'Inventory', icon: '▦' },
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
        <div className="side-foot">
          <span className="dot" /> Offline-first · no server
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  )
}
