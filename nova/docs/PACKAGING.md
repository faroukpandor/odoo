# Shipping Nova to every platform — for free

Nova is one static bundle. The same `dist/` folder becomes a website, an installable
app on every desktop OS, and a store-listed mobile app, with no paid tooling.

| Target | How | Cost | Offline |
|---|---|---|---|
| **Web / PWA** | Deploy `dist/` to GitHub Pages, Cloudflare Pages or Vercel | free | yes (service worker + IndexedDB) |
| **Android (install)** | Chrome → *Install app*. Full-screen, home-screen icon, works offline | free | yes |
| **Android (Play Store)** | [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) wraps the PWA as a Trusted Web Activity: `npx @bubblewrap/cli init --manifest https://your-host/manifest.webmanifest` | free tooling (Play has a one-off developer fee) | yes |
| **iOS / iPadOS (install)** | Safari → Share → *Add to Home Screen* | free | yes |
| **iOS (App Store)** | [Capacitor](https://capacitorjs.com): `npx cap init && npx cap add ios`, point `webDir` at `dist` | free tooling (Apple developer programme is paid) | yes |
| **Windows / macOS / Linux desktop** | Chrome/Edge → *Install Nova ERP*; or package with [Tauri](https://tauri.app) (`npm create tauri-app`, `frontendDist: "../dist"`) for a signed native binary of a few MB | free | yes |
| **Linux (Flathub / Snap)** | Wrap the Tauri binary; both stores are free for open-source | free | yes |
| **Self-hosted on a LAN** | `npx serve dist` on any PC or Raspberry Pi | free | yes |

Nothing in the codebase is tied to a packaging target: there is no server call,
no auth redirect and no native-only API in the critical path. The Web Share API,
`window.print()` (PDF), the camera and the file pickers all degrade gracefully.

## Why a PWA beats a hand-written native app here

* One codebase, one test suite, instant updates — no store review to ship a fix.
* The data lives in IndexedDB on the device, so the app is usable in a shop with
  no signal and syncs nothing to a vendor.
* Install prompts give users the same icon, splash screen and full-screen feel.

## Keeping it free

Hosting: GitHub Pages / Cloudflare Pages free tiers (static files only).
Payments: every provider in *Payment channels* is free to sign up for and charges
per transaction, directly to the merchant — Nova takes no cut and holds no funds.
