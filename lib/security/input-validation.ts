/**
 * Input Validation & Sanitization
 * Prevents SQL injection, XSS, and malformed data
 */

import { z } from 'zod'

// Sanitize user input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/["']/g, '') // Remove quotes
    .trim()
    .substring(0, 1000) // Limit length
}

// Validate email format
export const emailSchema = z.string().email().toLowerCase()

// Validate UUID
export const uuidSchema = z.string().uuid()

// Validate numeric input
export const positiveNumberSchema = z.number().positive()

// Generic request validation
export async function validateRequest(
  data: unknown,
  schema: z.ZodSchema
): Promise<{ valid: boolean; data?: unknown; error?: string }> {
  try {
    const validated = schema.parse(data)
    return { valid: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message }
    }
    return { valid: false, error: 'Validation failed' }
  }
}

// Prevent timing attacks in password comparison
export async function constantTimeCompare(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
