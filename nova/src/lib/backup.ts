/**
 * Automatic local restore points.
 *
 * Every session (at most once per hour) Nova snapshots the whole database into
 * IndexedDB, keeping the last 10. Losing work to a mistaken bulk delete or a
 * bad import is the single biggest risk in a local-first app, so this is the
 * safety net that makes the zero-server model genuinely production-safe.
 */
import { DB, getDB, replaceDB } from './db'

const IDB_NAME = 'nova-erp'
const STORE = 'snapshots'
const MAX = 10
const MIN_INTERVAL_MS = 60 * 60 * 1000

export interface Snapshot {
  id: string
  at: string
  reason: string
  counts: { partners: number; invoices: number; bills: number; products: number }
  data: DB
}

function open(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    // Version 2 adds the snapshots store alongside the existing kv store.
    const req = indexedDB.open(IDB_NAME, 2)
    req.onupgradeneeded = () => {
      const d = req.result
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv')
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const d = await open()
  if (!d || !d.objectStoreNames.contains(STORE)) return []
  return new Promise(resolve => {
    const r = d.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    r.onsuccess = () => resolve(((r.result as Snapshot[]) || []).sort((a, b) => (a.at < b.at ? 1 : -1)))
    r.onerror = () => resolve([])
  })
}

export async function takeSnapshot(reason = 'auto'): Promise<Snapshot | null> {
  const d = await open()
  if (!d || !d.objectStoreNames.contains(STORE)) return null
  const db = getDB()
  const snap: Snapshot = {
    id: `${Date.now()}`,
    at: new Date().toISOString(),
    reason,
    counts: {
      partners: db.partners.length, invoices: db.invoices.length,
      bills: db.bills.length, products: db.products.length,
    },
    data: JSON.parse(JSON.stringify(db)),
  }
  const tx = d.transaction(STORE, 'readwrite')
  tx.objectStore(STORE).put(snap)
  // prune oldest beyond MAX
  const all = await listSnapshots()
  const extra = all.slice(MAX - 1)
  if (extra.length) {
    const tx2 = d.transaction(STORE, 'readwrite')
    extra.forEach(s => tx2.objectStore(STORE).delete(s.id))
  }
  return snap
}

/** Called at boot: snapshot if the newest restore point is older than an hour. */
export async function autoSnapshot() {
  try {
    const all = await listSnapshots()
    const newest = all[0]
    if (!newest || Date.now() - Date.parse(newest.at) > MIN_INTERVAL_MS) {
      await takeSnapshot('auto')
    }
  } catch { /* never block boot */ }
}

export async function restoreSnapshot(id: string): Promise<boolean> {
  const all = await listSnapshots()
  const snap = all.find(s => s.id === id)
  if (!snap) return false
  await takeSnapshot('before-restore')
  replaceDB(snap.data)
  return true
}

export async function deleteSnapshot(id: string) {
  const d = await open()
  if (!d || !d.objectStoreNames.contains(STORE)) return
  d.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
}

/** Browser storage pressure, so users know how much headroom they have. */
export async function storageEstimate() {
  try {
    if (!navigator.storage?.estimate) return null
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota, pct: quota ? (usage / quota) * 100 : 0 }
  } catch { return null }
}

/** Ask the browser to make storage persistent so it is not evicted. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    return await navigator.storage.persist()
  } catch { return false }
}

export function readErrorLog(): { at: string; message: string }[] {
  try { return JSON.parse(localStorage.getItem('nova-errors') || '[]') } catch { return [] }
}

export function clearErrorLog() {
  try { localStorage.removeItem('nova-errors') } catch { /* ignore */ }
}
