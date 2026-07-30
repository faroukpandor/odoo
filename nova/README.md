# Nova ERP

An offline-first, zero-server ERP that runs entirely in the browser and deploys for free
to GitHub Pages, Cloudflare Pages or Vercel.

Modules in this MVP:

| Module | What works today |
|---|---|
| **Dashboard** | Revenue invoiced, outstanding, overdue, open pipeline, stock value, low-stock count, 6-month invoicing chart, "needs attention" action feed |
| **CRM** | Contacts (customer/supplier/both), 5-stage pipeline with per-stage totals, search, full CRUD |
| **Invoicing** | Multi-line invoices, per-line tax, product picker, auto-numbering, status tracking, overdue detection, printable/PDF document, auto-posts stock moves |
| **Inventory** | Products with cost/price/margin, live on-hand computed from the move ledger, reorder points and alerts, manual in/out/adjust moves |
| **Settings** | Company profile, currency, default tax, JSON export/import of the whole database, demo reset |

## Why this is different from Odoo / ERPNext / Dynamics / QuickBooks

- **No server, no database bill.** Odoo and ERPNext need Python + PostgreSQL/MariaDB hosting; Dynamics and QuickBooks charge per user per month. Nova is static files plus browser storage — hosting cost is literally zero.
- **Works offline.** The app keeps functioning with no internet; competitors are SaaS-dependent.
- **Zero lock-in.** The entire company database is one JSON file you own, export and re-import in a click.
- **Instant.** No login, no onboarding wizard, no 20-minute install — open the URL and the demo company is already there.

## Run locally

```bash
cd nova
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

## Deploy free

**GitHub Pages** — copy `nova/deploy/github-pages.yml` to `.github/workflows/nova-pages.yml`
and push it (GitHub blocks apps from creating workflow files, so this one step is manual).
Then enable *Settings → Pages → Source: GitHub Actions*. It builds on push and publishes `nova/dist`.

**Cloudflare Pages / Vercel** — connect the repo and use:
- Root directory: `nova`
- Build command: `npm run build`
- Output directory: `dist`

Routing uses `HashRouter`, so deep links work on any static host without rewrite rules.
`NOVA_BASE` controls the asset base path (`/` for Vercel/Cloudflare, `/<repo>/` for Pages).

## Roadmap

1. IndexedDB storage + service worker for full installable PWA
2. Purchasing, expenses and simple double-entry ledger
3. Multi-device sync via an optional free backend (Cloudflare D1 / Supabase free tier)
4. Optional connector to the Odoo backend in this repository
