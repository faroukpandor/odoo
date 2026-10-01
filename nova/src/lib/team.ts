/**
 * Teams and roles.
 *
 * Nova runs on the device, so "multi-user" means something precise here:
 * several people share one workspace — on one machine, or on several screens
 * of the same machine — each with their own identity and permissions, and
 * every window stays in sync live. Work is attributed to whoever recorded it.
 */
import { DB, ID, Role, User, today, uid } from './db'

export const ROLES: { id: Role; label: string; detail: string }[] = [
  { id: 'owner', label: 'Owner', detail: 'Everything, including company settings, team and data export' },
  { id: 'admin', label: 'Administrator', detail: 'Everything day to day; cannot delete the workspace' },
  { id: 'accountant', label: 'Accountant / bookkeeper', detail: 'Books, banking, bills, reports — no customer pricing changes' },
  { id: 'sales', label: 'Sales', detail: 'Quotes, invoices, customers and stock; no ledger or bank access' },
  { id: 'viewer', label: 'Viewer / auditor', detail: 'Read-only across the whole workspace' },
]

/** Everything a role can be allowed to do. Checked with `can()`. */
export type Permission =
  | 'sales.write' | 'purchasing.write' | 'banking.write' | 'accounting.write'
  | 'inventory.write' | 'crm.write' | 'settings.write' | 'team.manage' | 'data.destroy'

const GRANTS: Record<Role, Permission[] | 'all'> = {
  owner: 'all',
  admin: ['sales.write', 'purchasing.write', 'banking.write', 'accounting.write',
    'inventory.write', 'crm.write', 'settings.write', 'team.manage'],
  accountant: ['purchasing.write', 'banking.write', 'accounting.write', 'sales.write'],
  sales: ['sales.write', 'crm.write', 'inventory.write'],
  viewer: [],
}

/** Pages a role has no business opening at all. */
const HIDDEN: Record<Role, string[]> = {
  owner: [], admin: [], viewer: [],
  accountant: [],
  sales: ['/accounting', '/banking'],
}

export function currentUser(d: DB): User {
  return d.users.find(u => u.id === d.currentUserId && u.active)
    ?? d.users.find(u => u.active)
    ?? { id: '', name: 'Owner', email: '', role: 'owner', active: true, createdAt: today() }
}

export function can(d: DB, p: Permission, user = currentUser(d)): boolean {
  const g = GRANTS[user.role]
  return g === 'all' || g.includes(p)
}

/** True when the signed-in role should not even see this route. */
export const canSee = (d: DB, to: string, user = currentUser(d)) =>
  !HIDDEN[user.role].includes(to)

export const isReadOnly = (d: DB) => currentUser(d).role === 'viewer'

export const roleLabel = (r: Role) => ROLES.find(x => x.id === r)?.label ?? r

export const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'

export function newUser(role: Role = 'sales'): User {
  return { id: uid(), name: '', email: '', role, active: true, createdAt: today() }
}

/** A workspace must always keep one active owner, or nobody can administer it. */
export function canRemove(d: DB, id: ID): boolean {
  const u = d.users.find(x => x.id === id)
  if (!u) return false
  if (u.role !== 'owner') return true
  return d.users.filter(x => x.role === 'owner' && x.active).length > 1
}

export function addUser(d: DB, u: User) {
  d.users.push({ ...u, id: u.id || uid(), name: u.name.trim() || 'Teammate' })
}

export function removeUser(d: DB, id: ID) {
  if (!canRemove(d, id)) return
  d.users = d.users.filter(u => u.id !== id)
  if (d.currentUserId === id) d.currentUserId = d.users[0]?.id ?? ''
}

export function switchUser(d: DB, id: ID) {
  if (d.users.some(u => u.id === id && u.active)) d.currentUserId = id
}

/** Who recorded what — the audit question every enterprise asks first. */
export function activityByUser(d: DB) {
  return d.users.map(u => ({
    user: u,
    documents: d.invoices.filter(i => i.createdBy === u.id).length,
    payments: d.payments.filter(p => p.createdBy === u.id).length,
  }))
}

export const userName = (d: DB, id?: ID) =>
  (id && d.users.find(u => u.id === id)?.name) || '—'
