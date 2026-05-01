/**
 * Rate Limiter - Prevents abuse and DoS attacks
 * Uses in-memory store for free tier (can switch to Upstash for distributed)
 */

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number }
}

const store: RateLimitStore = {}

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (req: any) => string
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (req: any): Promise<{ success: boolean; remaining: number }> => {
    const key = config.keyGenerator ? config.keyGenerator(req) : req.ip
    const now = Date.now()

    if (!store[key]) {
      store[key] = { count: 1, resetTime: now + config.windowMs }
      return { success: true, remaining: config.maxRequests - 1 }
    }

    if (now > store[key].resetTime) {
      store[key] = { count: 1, resetTime: now + config.windowMs }
      return { success: true, remaining: config.maxRequests - 1 }
    }

    store[key].count++

    if (store[key].count > config.maxRequests) {
      return { success: false, remaining: 0 }
    }

    return { success: true, remaining: config.maxRequests - store[key].count }
  }
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 3600000)
