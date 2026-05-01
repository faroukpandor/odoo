/**
 * Input Validation Tests
 * Ensures security and data integrity
 */

import { sanitizeInput, emailSchema, validateRequest } from '@/lib/security/input-validation'
import { z } from 'zod'

describe('Input Validation', () => {
  describe('sanitizeInput', () => {
    it('should remove angle brackets', () => {
      const input = '<script>alert("xss")</script>'
      const result = sanitizeInput(input)
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should remove quotes', () => {
      const input = 'test"quote\'test'
      const result = sanitizeInput(input)
      expect(result).not.toContain('"')
      expect(result).not.toContain("'")
    })

    it('should trim whitespace', () => {
      const input = '  test  '
      const result = sanitizeInput(input)
      expect(result).toBe('test')
    })

    it('should limit length to 1000 characters', () => {
      const input = 'a'.repeat(2000)
      const result = sanitizeInput(input)
      expect(result.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('emailSchema', () => {
    it('should validate correct email', () => {
      const result = emailSchema.safeParse('user@example.com')
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = emailSchema.safeParse('invalid-email')
      expect(result.success).toBe(false)
    })

    it('should convert to lowercase', () => {
      const result = emailSchema.safeParse('USER@EXAMPLE.COM')
      expect(result.data).toBe('user@example.com')
    })
  })

  describe('validateRequest', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    })

    it('should validate correct data', async () => {
      const data = { name: 'John', age: 30 }
      const result = await validateRequest(data, testSchema)
      expect(result.valid).toBe(true)
      expect(result.data).toEqual(data)
    })

    it('should reject invalid data', async () => {
      const data = { name: '', age: -5 }
      const result = await validateRequest(data, testSchema)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
