# Nova ERP

An offline-first, zero-server ERP that runs entirely in the browser and deploys for free
to GitHub Pages, Cloudflare Pages or Vercel.

![tests](https://img.shields.io/badge/tests-201%20passing-35d39a) ![deps](https://img.shields.io/badge/runtime%20deps-4-5b8cff) ![cost](https://img.shields.io/badge/hosting%20cost-%240-9b5bff)

## Modules

| Module | What works today |
|---|---|
| **Dashboard** | Revenue invoiced, outstanding, overdue, net profit, owed to vendors, total spend, pipeline, stock value, low-stock count, 6-month invoicing chart and a "needs attention" action feed |
| **CRM** | Contacts (customer/supplier/both), 5-stage pipeline with per-stage totals, search, full CRUD |
| **Sales & invoicing** | Quotations → pro-forma → tax invoices → delivery notes, one-click quote conversion, coupon redemption, per-line tax, credit notes that reverse an invoice in the ledger and can be applied to another invoice or refunded in cash, derived settlement status (draft/open/partial/paid/overdue), balance due, print/PDF and native share to WhatsApp, email or anything else on the device |
| **Purchasing** | Vendor bills with per-line account coding, part-payment tracking, plus expenses with company-paid vs reimbursable employee spend |
| **Payment channels** | 50-provider catalogue with search, country filter and "recommended for your market": cards & wallets (Stripe, PayPal, Square, SumUp, Revolut, Wise, Skrill, Payoneer, Mollie, Paystack, Flutterwave, Yoco, PayFast, Razorpay, Mercado Pago, Cash App, Venmo, Alipay, WeChat Pay), instant bank rails (UPI, Pix, PromptPay, Interac, Zelle, SEPA, Ozow, EFT), mobile money (M-Pesa, Orange, MyZaka, Smega, MoMo, Airtel, EcoCash, Wave, telebirr, bKash, GCash, OVO, TrueMoney, Poso), crypto (BTC, Lightning, ETH, USDT, USDC, SOL), cash/COD and vouchers. Account validation, stated fees and settlement times, ordering, and a live customer preview |
| **Onboarding** | Adaptive first-run wizard: it asks who you are first, then shows only what that size of business needs — a solo trader answers three questions, an enterprise is also asked for registered name, company and tax registration numbers, financial year, trading name, logo and team. Country-aware currency/tax defaults, recommended local payment rails, demo-vs-clean books, every step skippable, plus a data-derived getting-started checklist on the dashboard |
| **Team & roles** | Several people share one workspace with their own identity: Owner, Administrator, Accountant, Sales, Viewer. Roles hide pages and disable actions (sales never sees the ledger or the bank; a viewer is read-only everywhere), work is attributed to whoever recorded it, and the last owner cannot be removed. Every open window on the device updates live over BroadcastChannel |
| **Apps & modules** | In-app module marketplace: activate what you need, keep the rest on standby, or apply a one-click business profile from solo hacker to corporate enterprise |
| **Banking** | Payment register for customer receipts and vendor payments (bank or cash), part-payments, payments on account, CSV bank-statement import, one-click matching with suggestions, and a reconciliation summary that proves the statement agrees with the books |
| **Inventory** | Products with cost/price/margin, live on-hand computed from the move ledger, reorder points and alerts, manual in/out/adjust moves |
| **Accounting** | True double-entry ledger auto-derived from documents: journal, trial balance, profit & loss, balance sheet, date cut-off, printable, plus manual adjusting entries that must balance before posting |
| **Recurring billing** | Retainers and subscriptions that issue their own invoices — weekly to yearly, end dates, pause/skip, MRR and annualised revenue. Missed runs are caught up the next time the app opens, so nothing depends on a server being awake |
| **Reports** | AR/AP ageing by bucket, VAT return, revenue concentration with risk warning, cash summary, per-customer statement of account (opening balance → movement → closing, with ageing) that prints or shares, CSV export of ageing, VAT and the full journal |
| **Logo studio** | No logo? Nova draws one: six deterministic SVG marks (monogram, badge, wordmark, shield, orbit, stack) built from your business name on the device, recolourable, yours to keep with no licence or watermark — or upload your own file, during onboarding or any time later in Settings |
| **Workspace health** | On-demand integrity check doing the job a database's constraints would: dangling references, duplicate document numbers, over-allocated payments, negative invoices, postings to unknown accounts, a journal that must balance, and no-owner lockout — with a one-click repair for the findings that have an unambiguous fix |
| **Settings** | Company profile, registration numbers and logo (printed on quotes, invoices, delivery notes and statements), JSON export/import, automatic restore points, storage quota meter, persistent-storage request, crash diagnostics |

Plus a **Ctrl/Cmd+K command palette** that searches every contact, invoice, bill and product,
**toast notifications**, and an **error boundary** that keeps your data safe if anything throws.

## Why this is different from Odoo / ERPNext / Dynamics / QuickBooks

- **No server, no database bill.** Odoo and ERPNext need Python + PostgreSQL/MariaDB hosting; Dynamics and QuickBooks charge per user per month. Nova is static files plus browser storage — hosting cost is literally zero.
- **Works offline.** Installable PWA with a service worker and IndexedDB; competitors are SaaS-dependent.
- **Books that cannot drift.** Journal entries are *derived* from invoices, bills, expenses and payments instead of posted separately, so operations and accounting are reconciled by construction. A live "books balanced" check proves it.
- **Real cash, not a paid checkbox.** Payments are first-class: part-payments, cash vs bank, payments on account, and a bank reconciliation that tells you exactly which lines are unexplained.
- **Zero lock-in.** The entire company database is one JSON file you own, export and re-import in a click.
- **Instant.** No login, no onboarding wizard, no install — open the URL and the demo company is already there.
- **Tiny attack surface.** Three runtime dependencies, no telemetry, no network calls at all.

## Getting paid

Nova is a static app, so it never *processes* a card itself — that would need a server,
PCI scope and a merchant contract. Instead it produces the exact payment instruction your
customer needs and records the receipt:

| Rail | What the customer gets | Who holds the money |
|---|---|---|
| Visa / Mastercard / Amex / Apple Pay / Google Pay | Hosted checkout link + QR (Stripe Payment Link, Paystack, Flutterwave, SumUp, PayPal, Revolut, Skrill) | your own merchant account |
| Mobile money (M-Pesa, Orange, MyZaka, Smega, MoMo, Airtel, EcoCash, Poso) | Tap-to-dial USSD string, till/merchant number and reference | your wallet |
| Crypto (BTC, Lightning, ETH, USDT) | Wallet URI + QR, amount converted at your posted rate | your self-custody wallet |
| Bank EFT / Wise | Account details on the document and in the shared text | your bank |
| Cash & vouchers | Till instruction, coupon codes redeemed as a discount line | you |

Every provider is free to sign up for and charges per transaction, directly to you —
Nova takes no cut, stores no card data and makes no network calls.

## Platforms

Installable everywhere from the same build: Android and iOS home-screen apps, Windows,
macOS and Linux desktop installs, Play Store via Bubblewrap/TWA, App Store via Capacitor,
native desktop binaries via Tauri. See [docs/PACKAGING.md](docs/PACKAGING.md).
The UI is fully responsive — one-hand phone layout, tablet and desktop.

## Run locally

```bash
cd nova
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # strict TypeScript, no errors
npm test           # 201 tests
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

## Performance and durability

- Payment-by-document and stock-by-product lookups are **indexed per version of
  the workspace** in a `WeakMap`, so ageing, statements and the ledger are linear
  rather than quadratic; the index is rebuilt automatically on the next edit and
  can never go stale.
- Durable writes are **coalesced**: a burst of keystrokes becomes one IndexedDB
  write 120 ms later, while `localStorage` keeps a synchronous mirror so a crash
  or a reload never loses the last edit. `flushDB()` forces a write before export.
- Dark, light and system appearance, stored outside the workspace so it never
  travels inside an exported backup.
- Phones get a bottom tab bar; printing hides all chrome.

## Architecture

```
src/
  lib/db.ts          schema, seed data, IndexedDB persistence, migration, store
  lib/accounting.ts  double-entry engine: journal, trial balance, P&L, balance sheet
  lib/payments.ts    settlement status, cash flow, statement parsing, reconciliation
  lib/tender.ts      payment-channel catalogue, payment links/QR, coupons
  lib/modules.ts     module registry, business-size profiles
  lib/share.ts       Web Share API, WhatsApp/email/SMS deep links
  lib/onboarding.ts  checklist, country tax/currency defaults, business profiles
  lib/team.ts        users, roles, permissions, attribution
  lib/logo.ts        generated SVG logo marks, palettes, data URLs
  lib/health.ts      integrity checks and safe repairs
  lib/theme.ts       dark/light/system appearance
  lib/recurring.ts   recurring schedules, catch-up billing run, MRR
  lib/statement.ts   customer statement of account with running balance
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
- `payments.test.ts`, `gaps.test.ts`, `team.test.ts` — settlement, credit notes, refunds, recurring runs, statements, roles and migrations.
- `pages.test.tsx` / `boot.test.tsx` — every route renders, and the real client boots into a DOM with zero console errors, including the adaptive wizard and role gating.

## What multi-user does and does not mean here

Nova has **no server**, so be precise about collaboration:

- ✅ **Several people, one workspace, one device.** Real user records, five roles,
  pages hidden and actions disabled by role, work attributed to whoever recorded it.
- ✅ **Several windows at once, live.** Two tabs or two browser windows on the same
  machine — a till and a back office, say — stay in sync instantly over
  `BroadcastChannel`. No refresh, no conflicts, no server.
- ❌ **Several devices at once.** Two laptops cannot edit the same books
  simultaneously today. Moving a workspace between devices is an explicit
  export/import, and roles are organisation, not security: anyone with the device
  has the file.

Simultaneous multi-device editing needs a sync service. That is a deliberate
decision, not an oversight — see the roadmap.

## Roadmap

1. ~~IndexedDB storage + service worker for full installable PWA~~ ✅
2. ~~Purchasing, expenses and double-entry ledger~~ ✅
3. ~~Reports: ageing, VAT, analytics, CSV~~ ✅
4. ~~Restore points, error boundary, command palette, CI~~ ✅
5. ~~Bank reconciliation, credit notes, recurring invoices, statements~~ ✅
6. ~~Users, roles and live sync between windows on one device~~ ✅
7. Multi-device collaboration on a free tier (Supabase / Cloudflare D1, or
   peer-to-peer CRDT) — the only part that needs infrastructure
8. Multi-currency, and an optional connector to the Odoo backend in this repository
