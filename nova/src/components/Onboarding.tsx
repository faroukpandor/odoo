import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDB, update, uid, resetDB, Company, Role, User } from '../lib/db'
import { COUNTRIES, recommendedProviders, newChannel, providerOf, validateAccount } from '../lib/tender'
import { applyCountry, guessCountry, BUSINESS_KINDS } from '../lib/onboarding'
import { TIERS, modulesForTier, CORE_IDS } from '../lib/modules'
import { ROLES, newUser, initials, roleLabel } from '../lib/team'
import { useToast } from '../lib/ui'
import LogoPicker from './LogoPicker'

/**
 * First-run wizard.
 *
 * It asks who you are before it asks for anything else, then shows only the
 * fields that size of business actually needs: a solo trader answers three
 * questions, an enterprise is asked for its legal identity, logo and team.
 * Every step is skippable and answers are written as they are given, so
 * closing the tab never loses the setup.
 */
export default function Onboarding() {
  const db = useDB()
  const nav = useNavigate()
  const toast = useToast()

  const [step, setStep] = useState(db.setup.step || 0)
  const [kind, setKind] = useState('services')
  const [tier, setTier] = useState<(typeof TIERS)[number]['id']>('micro')
  const [company, setCompany] = useState<Company>(() =>
    db.company.name === 'My Company'
      ? applyCountry({ ...db.company, name: '' }, guessCountry(db.company.country))
      : db.company)
  const [team, setTeam] = useState<User[]>([])
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [more, setMore] = useState(false)

  /** Bigger organisations get the extra identity and team questions. */
  const isOrg = tier === 'small' || tier === 'medium' || tier === 'large' || tier === 'enterprise'
  const steps = ['Welcome', 'Who you are', 'Your business', ...(isOrg ? ['Your team'] : []), 'Getting paid', 'Your data']
  const name = (n: number) => steps[n]
  const last = steps.length - 1
  const recommended = recommendedProviders(company.country, company.currency, 6)

  const go = (n: number) => { setStep(n); update(d => { d.setup.step = n }) }

  function finish(keepDemo: boolean) {
    update(d => {
      if (!keepDemo) {
        d.partners = []; d.products = []; d.invoices = []; d.moves = []
        d.bills = []; d.expenses = []; d.payments = []; d.statementLines = []
        d.manualEntries = []; d.recurring = []
      }
      d.company = { ...company, name: company.name.trim() || 'My Company' }
      const kindModules = BUSINESS_KINDS.find(b => b.id === kind)?.modules ?? []
      d.modules.enabled = Array.from(new Set([...CORE_IDS, ...modulesForTier(tier), ...kindModules]))

      // The person doing the setup is the owner; anyone they named joins the team.
      const owner = d.users[0]
      if (owner) owner.name = owner.name === 'Owner' && company.name ? `${company.name} owner` : owner.name
      team.filter(u => u.name.trim()).forEach(u => d.users.push({ ...u, id: uid() }))

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
          {steps.map((s, i) => (
            <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>
              <span>{i < step ? '✓' : i + 1}</span>{s}
            </li>
          ))}
        </ol>

        <div className="wiz-body">
          {name(step) === 'Welcome' && (
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

          {name(step) === 'Who you are' && (
            <section>
              <h2>Who are we setting up?</h2>
              <p className="muted">
                This decides which modules switch on and how much setup we ask for.
                Everything can be changed later in Apps.
              </p>
              <div className="pick-grid">
                {BUSINESS_KINDS.map(b => (
                  <button key={b.id} className={'pick' + (kind === b.id ? ' on' : '')} onClick={() => setKind(b.id)}>
                    <b>{b.label}</b><span className="muted small">{b.detail}</span>
                  </button>
                ))}
              </div>
              <h3 className="section-title">How big?</h3>
              <div className="pick-grid">
                {TIERS.map(t => (
                  <button key={t.id} className={'pick' + (tier === t.id ? ' on' : '')} onClick={() => setTier(t.id)}>
                    <b>{t.label}</b><span className="muted small">{t.detail}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {name(step) === 'Your business' && (
            <section>
              <h2>{isOrg ? 'Your organisation' : 'Your business'}</h2>
              <p className="muted">
                {isOrg
                  ? 'The legal identity and branding printed on every document you issue.'
                  : 'Just the essentials — this is what customers see on your invoices.'}
              </p>

              <div className="form">
                <label className="wide">{isOrg ? 'Registered name' : 'Business name'}
                  <input autoFocus value={company.name} placeholder="Kalahari Trading (Pty) Ltd"
                    onChange={e => setCompany({ ...company, name: e.target.value })} />
                </label>
                <label>Country
                  <select value={company.country} onChange={e => setCompany(applyCountry(company, e.target.value))}>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </label>
                <label>Currency
                  <input value={company.currency}
                    onChange={e => setCompany({ ...company, currency: e.target.value.toUpperCase() })} />
                </label>
                <label>{company.taxLabel || 'Tax'} rate %
                  <input type="number" step="0.01" value={company.taxRate}
                    onChange={e => setCompany({ ...company, taxRate: parseFloat(e.target.value) || 0 })} />
                </label>
              </div>

              <LogoPicker name={company.name} value={company.logo}
                onChange={logo => setCompany(c => ({ ...c, logo }))} />

              {(isOrg || more) ? (
                <div className="form">
                  <h3 className="section-title wide">Details on your documents</h3>
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
                  <label>{company.taxLabel || 'Tax'} registration number
                    <input value={company.vatId} placeholder="C1234567890"
                      onChange={e => setCompany({ ...company, vatId: e.target.value })} />
                  </label>
                  <label>Company registration number
                    <input value={company.regNo ?? ''} placeholder="BW00001234567"
                      onChange={e => setCompany({ ...company, regNo: e.target.value })} />
                  </label>
                  {isOrg && (
                    <>
                      <label>Financial year starts
                        <select value={company.fyStart}
                          onChange={e => setCompany({ ...company, fyStart: e.target.value })}>
                          {['01-01', '03-01', '04-01', '07-01', '09-01', '10-01'].map(v =>
                            <option key={v} value={v}>{MONTHS[parseInt(v.slice(0, 2), 10) - 1]} 1</option>)}
                        </select>
                      </label>
                      <label>Trading as / division (optional)
                        <input value={company.legalName ?? ''} placeholder="Nova Retail Division"
                          onChange={e => setCompany({ ...company, legalName: e.target.value })} />
                      </label>
                    </>
                  )}
                </div>
              ) : (
                <button className="btn link-btn" onClick={() => setMore(true)}>
                  + Add contact details and tax number
                </button>
              )}
            </section>
          )}

          {name(step) === 'Your team' && (
            <section>
              <h2>Who else works in here?</h2>
              <p className="muted">
                Everyone shares these books. A role decides what each person can open and change,
                and every window on this device updates the moment somebody saves. You can add
                the rest later in Settings.
              </p>

              {team.length > 0 && (
                <ul className="team-list">
                  {team.map((u, i) => (
                    <li key={i}>
                      <span className="avatar sm" aria-hidden>{initials(u.name || '?')}</span>
                      <b>{u.name || 'Teammate'}</b>
                      <span className="muted small">{roleLabel(u.role)}</span>
                      <button className="x" aria-label="Remove"
                        onClick={() => setTeam(team.filter((_, j) => j !== i))}>×</button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="form">
                <label>Name
                  <input id="tm-name" placeholder="Neo Dintwe" onKeyDown={e => {
                    if (e.key === 'Enter') (document.getElementById('tm-add') as HTMLButtonElement)?.click()
                  }} />
                </label>
                <label>Role
                  <select id="tm-role" defaultValue="sales">
                    {ROLES.filter(r => r.id !== 'owner').map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </label>
                <div className="form-actions wide" style={{ justifyContent: 'flex-start' }}>
                  <button id="tm-add" className="btn" onClick={() => {
                    const n = document.getElementById('tm-name') as HTMLInputElement | null
                    const r = document.getElementById('tm-role') as HTMLSelectElement | null
                    if (!n?.value.trim()) return
                    setTeam([...team, { ...newUser((r?.value ?? 'sales') as Role), name: n.value.trim() }])
                    n.value = ''
                  }}>+ Add teammate</button>
                </div>
              </div>

              <ul className="ticks small">
                {ROLES.filter(r => r.id !== 'owner').map(r => <li key={r.id}><b>{r.label}</b> — {r.detail}</li>)}
              </ul>
            </section>
          )}

          {name(step) === 'Getting paid' && (
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

          {name(step) === 'Your data' && (
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
          <span className="muted small">Step {step + 1} of {steps.length}</span>
          {step < last
            ? <button className="btn primary" onClick={() => go(step + 1)}>Continue</button>
            : <button className="btn" onClick={() => finish(true)}>Finish</button>}
        </footer>
      </div>
    </div>
  )
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

/** Dashboard widget: the same tasks, tracked from the data itself. */
export function resetWorkspace() {
  resetDB()
  update(d => { d.setup = { done: false, step: 0, dismissedChecklist: false } })
}
