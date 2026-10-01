import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDB, update, uid, resetDB, Company } from '../lib/db'
import { COUNTRIES, recommendedProviders, newChannel, providerOf, validateAccount } from '../lib/tender'
import { applyCountry, guessCountry, BUSINESS_KINDS } from '../lib/onboarding'
import { TIERS, modulesForTier, CORE_IDS } from '../lib/modules'
import { useToast } from '../lib/ui'

const STEPS = ['Welcome', 'Your business', 'What you do', 'Getting paid', 'Your data'] as const

/**
 * First-run wizard. Five short steps, every one skippable, nothing lost if the
 * tab closes — the answers are written to the database as they are given.
 */
export default function Onboarding() {
  const db = useDB()
  const nav = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(db.setup.step || 0)
  const [company, setCompany] = useState<Company>(() =>
    db.company.name === 'My Company'
      ? applyCountry({ ...db.company, name: '' }, guessCountry(db.company.country))
      : db.company)
  const [kind, setKind] = useState('services')
  const [tier, setTier] = useState<(typeof TIERS)[number]['id']>('micro')
  const [picked, setPicked] = useState<Record<string, string>>({})

  const recommended = recommendedProviders(company.country, company.currency, 6)

  const go = (n: number) => {
    setStep(n)
    update(d => { d.setup.step = n })
  }

  function finish(keepDemo: boolean) {
    update(d => {
      if (!keepDemo) {
        d.partners = []; d.products = []; d.invoices = []; d.moves = []
        d.bills = []; d.expenses = []; d.payments = []; d.statementLines = []
        d.manualEntries = []
      }
      d.company = { ...company, name: company.name.trim() || 'My Company' }
      const kindModules = BUSINESS_KINDS.find(b => b.id === kind)?.modules ?? []
      d.modules.enabled = Array.from(new Set([...CORE_IDS, ...modulesForTier(tier), ...kindModules]))
      // Only channels the user actually filled in go live.
      Object.entries(picked).forEach(([providerKey, account]) => {
        if (!account.trim()) return
        const spec = providerOf(providerKey)
        if (!validateAccount(spec, account).ok) return
        const existing = d.channels.find(c => c.provider === providerKey)
        if (existing) { existing.account = account; existing.enabled = true }
        else d.channels.push({ ...newChannel(providerKey), id: uid(), account, enabled: true })
      })
      d.setup = { done: true, step: 0, dismissedChecklist: false }
    })
    toast(keepDemo ? 'Workspace ready — demo data kept for exploring' : 'Workspace ready — clean books')
    nav('/')
  }

  const skip = () => {
    update(d => { d.setup = { done: true, step: 0, dismissedChecklist: false } })
    toast('Setup skipped — you can run it again from Settings')
  }

  return (
    <div className="overlay wizard-overlay">
      <div className="wizard">
        <header className="wiz-head">
          <div className="brand">
            <span className="logo">N</span>
            <div><strong>Nova ERP</strong><small>Set up in under two minutes</small></div>
          </div>
          <button className="btn tiny" onClick={skip}>Skip setup</button>
        </header>

        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>
              <span>{i < step ? '✓' : i + 1}</span>{s}
            </li>
          ))}
        </ol>

        <div className="wiz-body">
          {step === 0 && (
            <section>
              <h2>Your whole business, on your own device</h2>
              <p className="muted">
                Nova runs entirely in this browser. No account, no subscription, no server —
                your data never leaves the device unless you export it.
              </p>
              <ul className="ticks">
                <li>Quotes, invoices and delivery notes you can share on WhatsApp in seconds</li>
                <li>Get paid by card, mobile money, crypto, EFT or cash — straight into your own account</li>
                <li>Double-entry books that cannot drift from your operations</li>
                <li>Works offline; installs like an app on Android, iPhone, Windows, macOS and Linux</li>
              </ul>
            </section>
          )}

          {step === 1 && (
            <section>
              <h2>Your business</h2>
              <p className="muted">This is what customers see on every document.</p>
              <div className="form">
                <label>Business name
                  <input autoFocus value={company.name} placeholder="Kalahari Trading (Pty) Ltd"
                    onChange={e => setCompany({ ...company, name: e.target.value })} />
                </label>
                <label>Country
                  <select value={company.country} onChange={e => setCompany(applyCountry(company, e.target.value))}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </label>
                <label>Currency
                  <input value={company.currency} onChange={e => setCompany({ ...company, currency: e.target.value.toUpperCase() })} />
                </label>
                <label>{company.taxLabel || 'Tax'} rate %
                  <input type="number" step="0.01" value={company.taxRate}
                    onChange={e => setCompany({ ...company, taxRate: parseFloat(e.target.value) || 0 })} />
                </label>
                <label>Email
                  <input value={company.email} placeholder="billing@yourcompany.com"
                    onChange={e => setCompany({ ...company, email: e.target.value })} />
                </label>
                <label>Phone
                  <input value={company.phone} placeholder="+267 71 000 000"
                    onChange={e => setCompany({ ...company, phone: e.target.value })} />
                </label>
                <label className="wide">Address
                  <input value={company.address} placeholder="Plot 123, Gaborone"
                    onChange={e => setCompany({ ...company, address: e.target.value })} />
                </label>
                <label className="wide">{company.taxLabel || 'Tax'} registration number (optional)
                  <input value={company.vatId} onChange={e => setCompany({ ...company, vatId: e.target.value })} />
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <h2>What do you do, and how big are you?</h2>
              <p className="muted">We switch on the right modules — you can change any of this later in Apps.</p>
              <div className="pick-grid">
                {BUSINESS_KINDS.map(b => (
                  <button key={b.id} className={'pick' + (kind === b.id ? ' on' : '')} onClick={() => setKind(b.id)}>
                    <b>{b.label}</b><span className="muted small">{b.detail}</span>
                  </button>
                ))}
              </div>
              <h3 className="section-title">Size</h3>
              <div className="pick-grid">
                {TIERS.map(t => (
                  <button key={t.id} className={'pick' + (tier === t.id ? ' on' : '')} onClick={() => setTier(t.id)}>
                    <b>{t.label}</b><span className="muted small">{t.detail}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2>How should customers pay you?</h2>
              <p className="muted">
                Best options for {COUNTRIES.find(c => c.code === company.country)?.name ?? company.country}.
                Fill in any you already have — each one adds a pay link and QR code to your invoices.
                You can skip this and do it later.
              </p>
              <div className="form">
                {recommended.map(s => {
                  const value = picked[s.key] ?? ''
                  const check = value.trim() ? validateAccount(s, value) : { ok: true }
                  return (
                    <label key={s.key} className="wide">
                      <span className="chan-label">
                        <span className="mod-ico">{s.mark}</span>
                        <b>{s.short}</b>
                        <span className="muted small">{s.accountLabel} · {s.fee}</span>
                      </span>
                      <input value={value} placeholder={s.accountHint}
                        onChange={e => setPicked({ ...picked, [s.key]: e.target.value })} />
                      {!check.ok && <span className="muted small bad">{check.message}</span>}
                    </label>
                  )
                })}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2>Start clean, or explore first?</h2>
              <p className="muted">
                The demo company has a few contacts, products, an invoice and a bank statement so you can
                see every screen working. You can wipe it at any time from Settings.
              </p>
              <div className="pick-grid">
                <button className="pick" onClick={() => finish(true)}>
                  <b>Keep the demo data</b>
                  <span className="muted small">Explore a working business, delete it when you are ready</span>
                </button>
                <button className="pick primary" onClick={() => finish(false)}>
                  <b>Start with empty books</b>
                  <span className="muted small">Clean ledger — recommended if this is your real business</span>
                </button>
              </div>
            </section>
          )}
        </div>

        <footer className="wiz-foot">
          <button className="btn" disabled={step === 0} onClick={() => go(step - 1)}>Back</button>
          <span className="muted small">Step {step + 1} of {STEPS.length}</span>
          {step < STEPS.length - 1
            ? <button className="btn primary" onClick={() => go(step + 1)}>Continue</button>
            : <button className="btn" onClick={() => finish(true)}>Finish</button>}
        </footer>
      </div>
    </div>
  )
}

/** Dashboard widget: the same tasks, tracked from the data itself. */
export function resetWorkspace() {
  resetDB()
  update(d => { d.setup = { done: false, step: 0, dismissedChecklist: false } })
}
