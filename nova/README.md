# Nova ERP

An offline-first, zero-server ERP that runs entirely in the browser and deploys for free
to GitHub Pages, Cloudflare Pages or Vercel.

![tests](https://img.shields.io/badge/tests-35%20passing-35d39a) ![deps](https://img.shields.io/badge/runtime%20deps-3-5b8cff) ![cost](https://img.shields.io/badge/hosting%20cost-%240-9b5bff)

## Modules

| Module | What works today |
|---|---|
| **Dashboard** | Revenue invoiced, outstanding, overdue, net profit, owed to vendors, total spend, pipeline, stock value, low-stock count, 6-month invoicing chart and a "needs attention" action feed |
| **CRM** | Contacts (customer/supplier/both), 5-stage pipeline with per-stage totals, search, full CRUD |
| **Invoicing** | Multi-line invoices, per-line tax, product picker, auto-numbering, status tracking, overdue detection, printable/PDF document, auto-posts stock moves |
| **Purchasing** | Vendor bills with per-line account coding, payment status, plus expenses with company-paid vs reimbursable employee spend |
| **Inventory** | Products with cost/price/margin, live on-hand computed from the move ledger, reorder points and alerts, manual in/out/adjust moves |
| **Accounting** | True double-entry ledger auto-derived from documents: journal, trial balance, profit & loss, balance sheet, date cut-off, printable, plus manual adjusting entries that must balance before posting |
| **Reports** | AR/AP ageing by bucket, VAT return, revenue concentration with risk warning, cash summary, CSV export of ageing, VAT and the full journal |
| **Settings** | Company profile, JSON export/import, automatic restore points, storage quota meter, persistent-storage request, crash diagnostics |

Plus a **Ctrl/Cmd+K command palette** that searches every contact, invoice, bill and product,
**toast notifications**, and an **error boundary** that keeps your data safe if anything throws.

## Why this is different from Odoo / ERPNext / Dynamics / QuickBooks

- **No server, no database bill.** Odoo and ERPNext need Python + PostgreSQL/MariaDB hosting; Dynamics and QuickBooks charge per user per month. Nova is static files plus browser storage — hosting cost is literally zero.
- **Works offline.** Installable PWA with a service worker and IndexedDB; competitors are SaaS-dependent.
- **Books that cannot drift.** Journal entries are *derived* from invoices, bills and expenses instead of posted separately, so operations and accounting are reconciled by construction. A live "books balanced" check proves it.
- **Zero lock-in.** The entire company database is one JSON file you own, export and re-import in a click.
- **Instant.** No login, no onboarding wizard, no install — open the URL and the demo company is already there.
- **Tiny attack surface.** Three runtime dependencies, no telemetry, no network calls at all.

## Run locally

```bash
cd nova
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # strict TypeScript, no errors
npm test           # 35 tests
npm run build      # -> dist/
```

## Deploy free

**Cloudflare Pages / Vercel** — connect the repo and use:
- Root directory: `nova`
- Build command: `npm run build`
- Output directory: `dist`

`public/_headers` and `public/_redirects` ship sensible security headers and SPA routing for
Cloudflare/Netlify; `vercel.json` covers Vercel.

**GitHub Pages** — copy `nova/deploy/github-pages.yml` to `.github/workflows/nova-pages.yml`
and push it (GitHub blocks apps from creating workflow files, so this one step is manual).
Then enable *Settings → Pages → Source: GitHub Actions*.

**CI** — copy `nova/deploy/ci.yml` to `.github/workflows/nova-ci.yml` to run typecheck,
tests and build on every push.

Routing uses `HashRouter`, so deep links work on any static host without rewrite rules.
`NOVA_BASE` controls the asset base path (`/` for Vercel/Cloudflare, `/<repo>/` for Pages).

## Architecture

```
src/
  lib/db.ts          schema, seed data, IndexedDB persistence, migration, store
  lib/accounting.ts  double-entry engine: journal, trial balance, P&L, balance sheet
  lib/reports.ts     ageing, VAT return, analytics, CSV
  lib/backup.ts      automatic restore points, storage quota, diagnostics
  lib/ui.tsx         toasts, error boundary, hotkeys
  components/        command palette
  pages/             one file per module
```

State is a single immutable JSON document behind `useSyncExternalStore`, mirrored
synchronously to localStorage (so first paint never blocks) and asynchronously to
IndexedDB (the source of truth). `migrate()` upgrades any older snapshot or backup file.

## Testing

- `accounting.test.ts` — 17 cases: every generated entry balances, draft documents never post, correct accounts are hit for invoices/bills/expenses/reimbursements, statements tie out, date cut-offs, manual adjustments, migration.
- `reports.test.ts` — 9 cases: ageing buckets, exclusions, VAT netting, concentration, cash, CSV escaping.
- `pages.test.tsx` — 9 cases: every route renders without throwing.

## Roadmap

1. ~~IndexedDB storage + service worker for full installable PWA~~ ✅
2. ~~Purchasing, expenses and double-entry ledger~~ ✅
3. ~~Reports: ageing, VAT, analytics, CSV~~ ✅
4. ~~Restore points, error boundary, command palette, CI~~ ✅
5. Bank reconciliation, recurring invoices, multi-currency
6. Optional multi-device sync on a free tier (Cloudflare D1 / Supabase)
7. Optional connector to the Odoo backend in this repository
