/**
 * Caching Layer - Reduces database queries and improves response time
 * Uses in-memory cache with TTL (Time To Live)
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class CacheStore {
  private store: Map<string, CacheEntry<any>> = new Map()

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  invalidatePattern(pattern: RegExp): void {
    const keysToDelete = Array.from(this.store.keys()).filter((key) =>
      pattern.test(key)
    )
    keysToDelete.forEach((key) => this.delete(key))
  }
}

export const cache = new CacheStore()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cache['store'].entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key)
    }
  }
}, 300000)
