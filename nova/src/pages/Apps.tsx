import { useState } from 'react'
import { useDB, update } from '../lib/db'
import { MODULES, TIERS, Tier, modulesForTier, isEnabled, CORE_IDS, ModuleSpec } from '../lib/modules'
import { useToast } from '../lib/ui'

/**
 * The module marketplace. Everything is already in the bundle, so switching a
 * module on is instant and works offline — no licence server, no upsell call.
 */
export default function Apps() {
  const db = useDB()
  const toast = useToast()
  const [filter, setFilter] = useState<'all' | 'live' | 'planned'>('all')
  const enabled = db.modules.enabled

  const toggle = (m: ModuleSpec) => {
    if (m.core) { toast(`${m.name} is part of the core and stays on`); return }
    update(d => {
      d.modules.enabled = isEnabled(d.modules.enabled, m.id)
        ? d.modules.enabled.filter(x => x !== m.id)
        : [...d.modules.enabled, m.id]
    })
  }

  const request = (m: ModuleSpec) => {
    update(d => {
      d.modules.requested = d.modules.requested.includes(m.id)
        ? d.modules.requested.filter(x => x !== m.id)
        : [...d.modules.requested, m.id]
    })
    toast(db.modules.requested.includes(m.id) ? 'Request withdrawn' : `${m.name} added to your roadmap`)
  }

  const applyTier = (t: Tier) => {
    update(d => { d.modules.enabled = Array.from(new Set([...CORE_IDS, ...modulesForTier(t)])) })
    toast(`Profile applied: ${TIERS.find(x => x.id === t)!.label}`)
  }

  const live = MODULES.filter(m => m.status === 'live')
  const shown = MODULES.filter(m => filter === 'all' || m.status === filter)
  const groups = [...new Set(shown.map(m => m.group))]

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Apps & modules</h1>
          <p className="sub">
            Activate only what you need. Modules on standby cost nothing, add no clutter and
            switch on instantly — offline.
          </p>
        </div>
      </header>

      <div className="kpis">
        <Kpi label="Active modules" value={`${enabled.filter(e => live.some(m => m.id === e)).length}/${live.length}`} tone="brand" />
        <Kpi label="Shipping today" value={String(live.length)} tone="ok" />
        <Kpi label="On standby" value={String(MODULES.filter(m => m.status === 'planned').length)} />
        <Kpi label="On your roadmap" value={String(db.modules.requested.length)} tone={db.modules.requested.length ? 'warn' : undefined} />
        <Kpi label="Licence cost" value="Free forever" tone="ok" />
      </div>

      <section className="card">
        <h2>Business profile</h2>
        <p className="muted small">One click configures the workspace for your size — you can still fine-tune below.</p>
        <div className="tier-grid">
          {TIERS.map(t => (
            <button key={t.id} className="tier" onClick={() => applyTier(t.id)}>
              <b>{t.label}</b>
              <span className="muted small">{t.detail}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="tabs">
        {(['all', 'live', 'planned'] as const).map(f => (
          <button key={f} className={'tab' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Everything' : f === 'live' ? 'Available now' : 'On standby'}
          </button>
        ))}
      </div>

      {groups.map(g => (
        <section key={g}>
          <h2 className="section-title">{g}</h2>
          <div className="mod-grid">
            {shown.filter(m => m.group === g).map(m => {
              const on = isEnabled(enabled, m.id)
              const req = db.modules.requested.includes(m.id)
              return (
                <article key={m.id} className={'mod' + (on && m.status === 'live' ? ' on' : '')}>
                  <header>
                    <span className="mod-ico">{m.icon}</span>
                    <div>
                      <b>{m.name}</b>
                      <span className="muted small"> · {m.tier}</span>
                    </div>
                  </header>
                  <p className="muted small">{m.blurb}</p>
                  {m.status === 'live' ? (
                    <button className={'btn tiny ' + (on ? '' : 'primary')} onClick={() => toggle(m)}>
                      {m.core ? 'Core · always on' : on ? 'Deactivate' : 'Activate'}
                    </button>
                  ) : (
                    <button className={'btn tiny ' + (req ? '' : 'primary')} onClick={() => request(m)}>
                      {req ? 'Requested ✓' : 'Request build'}
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <div className={'kpi ' + (tone || '')}><span>{label}</span><strong>{value}</strong></div>
}
