import { useRef, useState } from 'react'
import { logoOptions, recolour, logoBytes, LogoOption } from '../lib/logo'
import { useToast } from '../lib/ui'

/**
 * Three honest ways to get a logo: let Nova draw one, upload your own, or do
 * neither and come back later. Generated marks are plain SVG built on the
 * device, so they cost nothing, work offline and print sharp at any size.
 */
export default function LogoPicker({ name, value, onChange, compact }: {
  name: string
  value?: string
  onChange: (dataUrl: string) => void
  compact?: boolean
}) {
  const toast = useToast()
  const file = useRef<HTMLInputElement>(null)
  const [options, setOptions] = useState<LogoOption[]>(() => logoOptions(name || 'Nova'))
  const [open, setOpen] = useState(false)

  const regenerate = () => {
    setOptions(o => o.map(x => recolour(x, name || 'Nova')))
    setOpen(true)
  }

  function upload(f: File) {
    if (f.size > 400_000) { toast('That image is over 400 KB — please use a smaller one', 'bad'); return }
    const reader = new FileReader()
    reader.onload = () => { onChange(String(reader.result)); toast('Logo saved') }
    reader.readAsDataURL(f)
  }

  return (
    <div className="logo-studio">
      <div className="logo-row">
        {value
          ? <img className="doc-logo big" src={value} alt="Your logo" />
          : <div className="logo-ph muted small">No logo yet</div>}
        <div>
          {!compact && <b>Your logo</b>}
          <p className="muted small">
            Printed on quotes, invoices, delivery notes and statements.
            {value ? ` About ${Math.round(logoBytes(value) / 1024)} KB.` : ' Optional — you can add one any time.'}
          </p>
          <div className="form-actions" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <button type="button" className="btn primary" onClick={() => setOpen(v => !v)}>
              {open ? 'Hide designs' : 'Design one for me'}
            </button>
            <button type="button" className="btn" onClick={() => file.current?.click()}>Upload my logo</button>
            {value && <button type="button" className="btn danger" onClick={() => onChange('')}>Remove</button>}
          </div>
          <input ref={file} type="file" accept="image/*" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </div>
      </div>

      {open && (
        <>
          <div className="logo-grid">
            {options.map(o => (
              <button type="button" key={o.id}
                className={'logo-option' + (value === o.dataUrl ? ' on' : '')}
                aria-label={`Use the ${o.style} design`}
                onClick={() => { onChange(o.dataUrl); toast('Logo applied') }}>
                <img src={o.dataUrl} alt="" />
                <span className="muted small">{o.style}</span>
              </button>
            ))}
          </div>
          <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="btn tiny" onClick={regenerate}>↻ Different colours</button>
            <span className="muted small">
              Drawn from your business name on this device — yours to keep, no licence, no watermark.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
