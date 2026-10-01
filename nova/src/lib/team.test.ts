import { describe, it, expect, beforeEach } from 'vitest'
import { resetDB, update, getDB, uid, migrate, type User } from './db'
import {
  ROLES, can, canSee, currentUser, isReadOnly, newUser, addUser, removeUser,
  canRemove, switchUser, initials, activityByUser, userName,
} from './team'

const mk = (over: Partial<User> = {}): User => ({
  ...newUser('sales'), id: uid(), name: 'Neo Dintwe', email: 'neo@co.bw', ...over,
})

beforeEach(() => { resetDB() })

describe('workspace identity', () => {
  it('starts with exactly one owner who can do everything', () => {
    const d = getDB()
    expect(d.users).toHaveLength(1)
    expect(currentUser(d).role).toBe('owner')
    expect(ROLES.every(r => can(d, 'sales.write', { ...currentUser(d), role: 'owner' }))).toBe(true)
    expect(can(d, 'data.destroy')).toBe(true)
  })

  it('falls back to a safe identity if the pointer is stale', () => {
    update(d => { d.currentUserId = 'does-not-exist' })
    expect(currentUser(getDB()).role).toBe('owner')
  })

  it('abbreviates names for the avatar', () => {
    expect(initials('Neo Dintwe')).toBe('ND')
    expect(initials('kabo')).toBe('K')
    expect(initials('   ')).toBe('?')
  })
})

describe('roles decide what each teammate may do', () => {
  const asRole = (role: User['role']) => {
    const u = mk({ role })
    update(d => { addUser(d, u); switchUser(d, u.id) })
    return getDB()
  }

  it('lets sales raise invoices but never touch the ledger or the bank', () => {
    const d = asRole('sales')
    expect(can(d, 'sales.write')).toBe(true)
    expect(can(d, 'crm.write')).toBe(true)
    expect(can(d, 'accounting.write')).toBe(false)
    expect(can(d, 'banking.write')).toBe(false)
    expect(canSee(d, '/banking')).toBe(false)
    expect(canSee(d, '/invoices')).toBe(true)
  })

  it('lets the bookkeeper run the books but not the company settings', () => {
    const d = asRole('accountant')
    expect(can(d, 'accounting.write')).toBe(true)
    expect(can(d, 'banking.write')).toBe(true)
    expect(can(d, 'settings.write')).toBe(false)
    expect(can(d, 'team.manage')).toBe(false)
    expect(canSee(d, '/accounting')).toBe(true)
  })

  it('makes an auditor read-only everywhere while still seeing every page', () => {
    const d = asRole('viewer')
    expect(isReadOnly(d)).toBe(true)
    expect(can(d, 'sales.write')).toBe(false)
    expect(can(d, 'purchasing.write')).toBe(false)
    expect(canSee(d, '/accounting')).toBe(true)
  })

  it('stops an administrator short of destroying the workspace', () => {
    const d = asRole('admin')
    expect(can(d, 'settings.write')).toBe(true)
    expect(can(d, 'team.manage')).toBe(true)
    expect(can(d, 'data.destroy')).toBe(false)
  })
})

describe('managing the team', () => {
  it('adds a teammate and lets the device work as them', () => {
    const u = mk({ role: 'accountant' })
    update(d => addUser(d, u))
    expect(getDB().users).toHaveLength(2)
    update(d => switchUser(d, u.id))
    expect(currentUser(getDB()).name).toBe('Neo Dintwe')
  })

  it('never lets the last owner be removed', () => {
    const owner = getDB().users[0]
    expect(canRemove(getDB(), owner.id)).toBe(false)
    update(d => removeUser(d, owner.id))
    expect(getDB().users).toHaveLength(1)

    const second = mk({ role: 'owner' })
    update(d => addUser(d, second))
    expect(canRemove(getDB(), owner.id)).toBe(true)
  })

  it('hands the device back to somebody when the active user is removed', () => {
    const u = mk()
    update(d => { addUser(d, u); switchUser(d, u.id) })
    update(d => removeUser(d, u.id))
    expect(getDB().users.some(x => x.id === getDB().currentUserId)).toBe(true)
  })

  it('refuses to work as a deactivated teammate', () => {
    const u = mk({ active: false })
    update(d => { addUser(d, u); switchUser(d, u.id) })
    expect(currentUser(getDB()).id).not.toBe(u.id)
  })

  it('names a teammate who is gone without crashing', () => {
    expect(userName(getDB(), 'ghost')).toBe('—')
    expect(userName(getDB())).toBe('—')
  })
})

describe('attribution', () => {
  it('counts what each teammate recorded', () => {
    const u = mk()
    update(d => { addUser(d, u); switchUser(d, u.id) })
    update(d => {
      d.invoices[0] = { ...d.invoices[0], createdBy: u.id }
      d.payments[0] = { ...d.payments[0], createdBy: u.id }
    })
    const row = activityByUser(getDB()).find(r => r.user.id === u.id)!
    expect(row.documents).toBe(1)
    expect(row.payments).toBe(1)
  })
})

describe('upgrading a single-user file', () => {
  it('turns the implicit owner into a real user record', () => {
    const old = JSON.parse(JSON.stringify({ ...getDB(), version: 6, users: undefined, currentUserId: undefined }))
    const d = migrate(old)
    expect(d.version).toBe(7)
    expect(d.users).toHaveLength(1)
    expect(d.users[0].role).toBe('owner')
    expect(currentUser(d).id).toBe(d.currentUserId)
  })

  it('keeps an existing team and repairs a dangling active user', () => {
    const u = mk()
    update(d => addUser(d, u))
    const raw = JSON.parse(JSON.stringify({ ...getDB(), currentUserId: 'gone' }))
    const d = migrate(raw)
    expect(d.users).toHaveLength(2)
    expect(d.users.some(x => x.id === d.currentUserId)).toBe(true)
  })
})

describe('live sync between open windows', () => {
  it('adopts a workspace published by another window on this device', async () => {
    if (typeof BroadcastChannel === 'undefined') return   // ancient runtime: feature is optional
    const other = new BroadcastChannel('nova-erp-sync')
    const published = { ...getDB(), company: { ...getDB().company, name: 'Edited Next Door' } }
    other.postMessage(JSON.parse(JSON.stringify(published)))
    await new Promise(r => setTimeout(r, 20))
    other.close()
    expect(getDB().company.name).toBe('Edited Next Door')
  })

  it('ignores rubbish broadcast on the same channel', async () => {
    if (typeof BroadcastChannel === 'undefined') return
    const before = getDB().company.name
    const other = new BroadcastChannel('nova-erp-sync')
    other.postMessage('not a workspace')
    await new Promise(r => setTimeout(r, 20))
    other.close()
    expect(getDB().company.name).toBe(before)
  })
})
