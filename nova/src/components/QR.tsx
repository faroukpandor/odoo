import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/**
 * Offline QR renderer (MIT, zero network): turns a payment URI into an SVG so
 * a customer can scan it from the screen or a printed invoice.
 */
export default function QR({ value, size = 148, label }: { value: string; size?: number; label?: string }) {
  const path = useMemo(() => {
    try {
      const qr = qrcode(0, 'M')
      qr.addData(value)
      qr.make()
      const n = qr.getModuleCount()
      let d = ''
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
        }
      }
      return { d, n }
    } catch {
      return null
    }
  }, [value])

  if (!path) return <div className="muted small">QR unavailable for this value</div>
  return (
    <figure className="qr">
      <svg width={size} height={size} viewBox={`0 0 ${path.n} ${path.n}`} role="img" aria-label={label || 'Payment QR code'}>
        <rect width={path.n} height={path.n} fill="#fff" />
        <path d={path.d} fill="#000" />
      </svg>
      {label && <figcaption className="muted small">{label}</figcaption>}
    </figure>
  )
}
