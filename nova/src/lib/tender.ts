/**
 * Getting paid — without a server.
 *
 * Nova never touches card data and never runs a payment gateway: that would
 * require a backend, PCI scope and a merchant contract. Instead it does what a
 * static app *can* do perfectly well — turn any document into the exact
 * payment instruction a customer needs: a hosted checkout link, a mobile-money
 * USSD dial string, a crypto URI, EFT details or a voucher redemption.
 *
 * Every provider below is free to sign up for; the money lands in the
 * merchant's own account, and Nova only records the receipt.
 */
import { Channel, ChannelKind, Coupon, DB, ID, Invoice, uid, round2 } from './db'
export { DEFAULT_CHANNELS } from './db'

export interface ProviderSpec {
  key: string
  name: string
  kind: ChannelKind
  /** What goes in the "account" box. */
  accountLabel: string
  accountHint: string
  /** Link or dial-string template. Tokens: {account} {amount} {amountMinor} {cur} {ref} {detail} */
  template?: string
  /** Where the merchant signs up (free). */
  signup?: string
  /** Shown in the UI so nobody is misled about what the channel does. */
  note: string
}

/* ---------- provider catalogue (all free to set up) ---------- */

export const PROVIDERS: ProviderSpec[] = [
  // Cards & wallets — hosted checkout, merchant keeps full control of funds.
  {
    key: 'stripe', name: 'Stripe Payment Link (Visa/Mastercard/Amex/Apple Pay/Google Pay)',
    kind: 'card', accountLabel: 'Payment link URL', accountHint: 'https://buy.stripe.com/…',
    template: '{account}?client_reference_id={ref}', signup: 'https://dashboard.stripe.com/payment-links',
    note: 'Free to create, no monthly fee; Stripe charges per successful transaction only.',
  },
  {
    key: 'paypal', name: 'PayPal.Me (cards + PayPal balance)',
    kind: 'card', accountLabel: 'PayPal.Me handle', accountHint: 'yourname',
    template: 'https://paypal.me/{account}/{amount}{cur}', signup: 'https://paypal.me',
    note: 'Amount is pre-filled in the link. Free account, per-transaction fee only.',
  },
  {
    key: 'paystack', name: 'Paystack payment page (Visa/Mastercard/Verve)',
    kind: 'card', accountLabel: 'Payment page URL', accountHint: 'https://paystack.com/pay/your-page',
    template: '{account}?amount={amountMinor}&reference={ref}', signup: 'https://paystack.com',
    note: 'Africa-focused. Free page, per-transaction fee only.',
  },
  {
    key: 'flutterwave', name: 'Flutterwave store link (cards, bank, mobile money)',
    kind: 'card', accountLabel: 'Store/payment link', accountHint: 'https://flutterwave.com/pay/your-link',
    template: '{account}?amount={amount}&currency={cur}', signup: 'https://flutterwave.com/store',
    note: 'Accepts cards and African mobile money through one hosted page.',
  },
  {
    key: 'revolut', name: 'Revolut.Me',
    kind: 'card', accountLabel: 'Revolut handle', accountHint: 'yourname',
    template: 'https://revolut.me/{account}/{amount}{cur}', signup: 'https://revolut.com',
    note: 'Instant links for card and account-to-account payment.',
  },
  {
    key: 'sumup', name: 'SumUp payment link / tap-to-pay',
    kind: 'card', accountLabel: 'Payment link', accountHint: 'https://pay.sumup.com/…',
    template: '{account}', signup: 'https://sumup.com',
    note: 'Pairs with a card reader or phone tap-to-pay for in-person card sales.',
  },

  // Mobile money — USSD dial strings and merchant codes.
  {
    key: 'mpesa', name: 'M-Pesa (Safaricom / Vodacom)',
    kind: 'mobile', accountLabel: 'Paybill or till number', accountHint: '123456',
    template: 'tel:*150*00%23', signup: 'https://m-pesa.com',
    note: 'Dials the M-Pesa menu; the payer confirms your till and the amount shown.',
  },
  {
    key: 'orange', name: 'Orange Money',
    kind: 'mobile', accountLabel: 'Merchant / wallet number', accountHint: '+267 7x xxx xxx',
    template: 'tel:%23145%23', signup: 'https://orange.com',
    note: 'Dial code varies by country — edit the template to match your market.',
  },
  {
    key: 'myzaka', name: 'MyZaka (Mascom)',
    kind: 'mobile', accountLabel: 'Merchant / wallet number', accountHint: '+267 7x xxx xxx',
    template: 'tel:*167%23', signup: 'https://mascom.bw',
    note: 'Botswana mobile wallet.',
  },
  {
    key: 'smega', name: 'Smega (BTC Mobile Money)',
    kind: 'mobile', accountLabel: 'Merchant / wallet number', accountHint: '+267 7x xxx xxx',
    template: 'tel:*177%23', signup: 'https://btc.bw',
    note: 'Botswana mobile wallet.',
  },
  {
    key: 'momo', name: 'MTN MoMo',
    kind: 'mobile', accountLabel: 'MoMo merchant code', accountHint: '123456',
    template: 'tel:*165%23', signup: 'https://mtn.com',
    note: 'Pan-African MTN wallet.',
  },
  {
    key: 'airtel', name: 'Airtel Money',
    kind: 'mobile', accountLabel: 'Merchant / wallet number', accountHint: '+2xx xxx xxx',
    template: 'tel:*185%23', signup: 'https://airtel.africa',
    note: 'Pan-African Airtel wallet.',
  },
  {
    key: 'ecocash', name: 'EcoCash',
    kind: 'mobile', accountLabel: 'Merchant code', accountHint: '12345',
    template: 'tel:*151%23', signup: 'https://ecocash.co.zw',
    note: 'Zimbabwe mobile wallet.',
  },
  {
    key: 'posomoney', name: 'Poso Money',
    kind: 'mobile', accountLabel: 'Merchant / wallet number', accountHint: 'merchant id',
    template: 'tel:{account}',
    note: 'Generic wallet entry — set the dial string your operator publishes.',
  },
  {
    key: 'skrill', name: 'Skrill',
    kind: 'card', accountLabel: 'Skrill email or skrill.me tag', accountHint: 'you@example.com',
    template: 'https://skrill.me/rq/{account}/{amount}/{cur}', signup: 'https://skrill.com',
    note: 'Wallet and card payments with a request-money link.',
  },
  {
    key: 'wise', name: 'Wise request',
    kind: 'bank', accountLabel: 'Wise handle', accountHint: 'yourname',
    template: 'https://wise.com/pay/me/{account}', signup: 'https://wise.com',
    note: 'Low-cost international bank transfer requests.',
  },

  // Crypto — plain wallet URIs, no custodian, no fees to Nova.
  {
    key: 'btc', name: 'Bitcoin (on-chain)',
    kind: 'crypto', accountLabel: 'BTC address', accountHint: 'bc1…',
    template: 'bitcoin:{account}?amount={coin}&label={ref}',
    note: 'Amount converted with the rate you set on the channel.',
  },
  {
    key: 'eth', name: 'Ethereum (ETH)',
    kind: 'crypto', accountLabel: 'ETH address', accountHint: '0x…',
    template: 'ethereum:{account}?value={coin}',
    note: 'Also works for any EVM wallet QR.',
  },
  {
    key: 'usdt', name: 'USDT (Tether, TRC20/ERC20)',
    kind: 'crypto', accountLabel: 'USDT address', accountHint: 'T… or 0x…',
    template: '{account}',
    note: 'Stablecoin: set the rate to your currency per 1 USDT.',
  },
  {
    key: 'lightning', name: 'Bitcoin Lightning (LNURL / address)',
    kind: 'crypto', accountLabel: 'Lightning address', accountHint: 'you@walletofsatoshi.com',
    template: 'lightning:{account}',
    note: 'Near-zero fee instant settlement for small amounts.',
  },

  // Bank, cash, vouchers.
  {
    key: 'eft', name: 'Bank transfer / EFT',
    kind: 'bank', accountLabel: 'Account number', accountHint: '0123456789',
    note: 'Details are printed on the document and shared as text.',
  },
  {
    key: 'cash', name: 'Cash',
    kind: 'cash', accountLabel: 'Till / location', accountHint: 'Front desk',
    note: 'Recorded against the Cash on hand account.',
  },
  {
    key: 'voucher', name: 'Voucher / coupon code',
    kind: 'voucher', accountLabel: 'Programme name', accountHint: 'Loyalty vouchers',
    note: 'Redeem a coupon code as a discount line on the document.',
  },
]

export const providerOf = (key: string) => PROVIDERS.find(p => p.key === key)

/* ---------- building the actual payment instruction ---------- */

export interface Tender {
  channel: Channel
  provider: ProviderSpec
  /** Clickable/dialable/scannable URI, when the provider supports one. */
  uri: string
  /** Human instruction, always present — safe to paste into WhatsApp or email. */
  text: string
  /** Whether a QR code is worth rendering. */
  qr: boolean
}

const enc = (v: string) => encodeURIComponent(v)

/**
 * Renders a provider template for one document amount.
 * `{coin}` converts the fiat total using the channel's rate.
 */
export function fillTemplate(tpl: string, c: Channel, amount: number, cur: string, ref: string) {
  const coin = c.rate > 0 ? (amount / c.rate).toFixed(8).replace(/0+$/, '').replace(/\.$/, '') : ''
  return tpl
    .replace(/{account}/g, enc(c.account))
    .replace(/{amount}/g, amount.toFixed(2))
    .replace(/{amountMinor}/g, String(Math.round(amount * 100)))
    .replace(/{coin}/g, coin)
    .replace(/{cur}/g, cur)
    .replace(/{ref}/g, enc(ref))
    .replace(/{detail}/g, enc(c.detail))
}

/** Every way this customer can settle this document, ready to show or share. */
export function tendersFor(d: DB, amount: number, cur: string, ref: string): Tender[] {
  return d.channels
    .filter(c => c.enabled && c.account.trim() !== '')
    .map(c => {
      const provider = providerOf(c.provider) ?? PROVIDERS[0]
      const uri = provider.template ? fillTemplate(provider.template, c, amount, cur, ref) : ''
      return { channel: c, provider, uri, qr: !!uri && !uri.startsWith('tel:'), text: instruction(c, provider, amount, cur, ref) }
    })
}

function instruction(c: Channel, p: ProviderSpec, amount: number, cur: string, ref: string) {
  const money = `${cur} ${amount.toFixed(2)}`
  switch (p.kind) {
    case 'card':
      return `${c.label}: pay ${money} securely at ${c.account} (reference ${ref})`
    case 'mobile':
      return `${c.label}: send ${money} to ${c.account}${c.detail ? ' · ' + c.detail : ''} and use reference ${ref}`
    case 'crypto': {
      const coin = c.rate > 0 ? ` (≈ ${(amount / c.rate).toFixed(8)} units at your posted rate)` : ''
      return `${c.label}: send ${money}${coin} to ${c.account}`
    }
    case 'bank':
      return `${c.label}: transfer ${money} to account ${c.account}${c.detail ? ' · ' + c.detail : ''}, reference ${ref}`
    case 'cash':
      return `${c.label}: pay ${money} at ${c.account}, reference ${ref}`
    default:
      return `${c.label}: redeem your voucher code for ${money} against ${ref}`
  }
}

/** One shareable block covering every enabled channel. */
export function paymentInstructions(d: DB, amount: number, cur: string, ref: string) {
  const lines = tendersFor(d, amount, cur, ref).map(t => `• ${t.text}${t.uri && !t.uri.startsWith('tel:') ? `\n  ${decodeURI(t.uri)}` : ''}`)
  return lines.length
    ? `How to pay ${ref} (${cur} ${amount.toFixed(2)}):\n${lines.join('\n')}`
    : `Payment for ${ref}: ${cur} ${amount.toFixed(2)}`
}

/* ---------- coupons ---------- */

export interface CouponResult { ok: boolean; reason?: string; discount: number; coupon?: Coupon }

/** Validates a code against the register and returns the money it takes off. */
export function applyCoupon(d: DB, code: string, net: number, asAt: string): CouponResult {
  const coupon = d.coupons.find(c => c.code.toLowerCase() === code.trim().toLowerCase())
  if (!coupon) return { ok: false, reason: 'Unknown code', discount: 0 }
  if (coupon.expires && coupon.expires < asAt) return { ok: false, reason: 'Expired', discount: 0, coupon }
  if (coupon.limit > 0 && coupon.used >= coupon.limit) return { ok: false, reason: 'Usage limit reached', discount: 0, coupon }
  const raw = coupon.kind === 'percent' ? (net * coupon.value) / 100 : coupon.value
  return { ok: true, discount: round2(Math.min(raw, net)), coupon }
}

export const newChannel = (provider: string): Channel => ({
  id: '', kind: providerOf(provider)?.kind ?? 'card', provider,
  label: providerOf(provider)?.name.split(' (')[0] ?? provider,
  enabled: true, account: '', detail: '', rate: 0,
})

/** Payment channels grouped for the settings UI. */
export const CHANNEL_GROUPS: { kind: ChannelKind; title: string; blurb: string }[] = [
  { kind: 'card', title: 'Cards & wallets', blurb: 'Visa, Mastercard, Amex, Apple/Google Pay, PayPal, Skrill' },
  { kind: 'mobile', title: 'Mobile money', blurb: 'M-Pesa, Orange Money, MyZaka, Smega, MoMo, Airtel, EcoCash, Poso' },
  { kind: 'crypto', title: 'Crypto', blurb: 'Bitcoin, Lightning, Ethereum, USDT — self-custody, no middleman' },
  { kind: 'bank', title: 'Bank transfer', blurb: 'EFT details and Wise requests' },
  { kind: 'cash', title: 'Cash', blurb: 'Over-the-counter takings' },
  { kind: 'voucher', title: 'Vouchers & coupons', blurb: 'Discount codes redeemed at checkout' },
]

export function channelsByKind(d: DB, kind: ChannelKind) {
  return d.channels.filter(c => (providerOf(c.provider)?.kind ?? c.kind) === kind)
}

export const channelId = (): ID => uid()

/** Does the workspace have at least one working way to get paid online? */
export function canAcceptOnline(d: DB) {
  return d.channels.some(c => c.enabled && c.account.trim() && ['card', 'mobile', 'crypto'].includes(providerOf(c.provider)?.kind ?? c.kind))
}

export function documentRef(inv: Invoice) { return inv.number }
