/**
 * Content Security Policy Configuration
 * Prevents XSS, clickjacking, and other injection attacks
 */

export const cspHeader = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://'],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
}

export function getCspHeader(): string {
  return Object.entries(cspHeader)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}
