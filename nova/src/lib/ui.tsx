import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

/* ---------------- toasts ---------------- */

type Toast = { id: number; msg: string; kind: 'ok' | 'bad' | 'info' }
const ToastCtx = createContext<(msg: string, kind?: Toast['kind']) => void>(() => {})

export const useToast = () => useContext(ToastCtx)

export function ToastHost({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const push = useCallback((msg: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random()
    setItems(v => [...v, { id, msg, kind }])
    setTimeout(() => setItems(v => v.filter(t => t.id !== id)), 3200)
  }, [])

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map(t => <div key={t.id} className={'toast ' + t.kind}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------- error boundary ---------------- */

interface EBState { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null }

  static getDerivedStateFromError(error: Error): EBState { return { error } }

  componentDidCatch(error: Error) {
    // Nothing leaves the device: log locally so a user can report an issue.
    try {
      const log = JSON.parse(localStorage.getItem('nova-errors') || '[]')
      log.unshift({ at: new Date().toISOString(), message: error.message, stack: error.stack })
      localStorage.setItem('nova-errors', JSON.stringify(log.slice(0, 20)))
    } catch { /* ignore */ }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash">
        <h1>Something went wrong</h1>
        <p className="muted">
          Your data is safe — it is stored locally and was not touched by this error.
        </p>
        <pre>{this.state.error.message}</pre>
        <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
          <button className="btn primary" onClick={() => { location.hash = '#/'; location.reload() }}>
            Reload Nova
          </button>
          <button className="btn" onClick={() => this.setState({ error: null })}>Try to continue</button>
        </div>
      </div>
    )
  }
}

/* ---------------- keyboard shortcut helper ---------------- */

export function useHotkey(combo: (e: KeyboardEvent) => boolean, handler: () => void) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (combo(e)) { e.preventDefault(); handler() }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [combo, handler])
}
