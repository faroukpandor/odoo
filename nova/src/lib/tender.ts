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

export type Feature = 'link' | 'qr' | 'ussd' | 'instant' | 'recurring' | 'refunds' | 'inperson' | 'payout'

export interface ProviderSpec {
  key: string
  name: string
  /** Short name for chips and badges. */
  short: string
  kind: ChannelKind
  /** Glyph used as a lightweight, offline "logo". */
  mark: string
  /** ISO country codes it serves, or ['*'] for worldwide. */
  regions: string[]
  /** Currencies it settles in, or ['*']. */
  currencies: string[]
  features: Feature[]
  /** What goes in the "account" box. */
  accountLabel: string
  accountHint: string
  /** Validation for the account value — keeps a broken link off an invoice. */
  pattern?: RegExp
  patternHelp?: string
  /** Link or dial-string template. Tokens: {account} {amount} {amountMinor} {coin} {cur} {ref} {detail} */
  template?: string
  /** Typical merchant cost, stated plainly. */
  fee: string
  /** How fast the money lands. */
  settlement: string
  /** Where the merchant signs up (free). */
  signup?: string
  /** Shown in the UI so nobody is misled about what the channel does. */
  note: string
}

const AFRICA = ['BW', 'ZA', 'KE', 'TZ', 'UG', 'RW', 'GH', 'NG', 'ZM', 'ZW', 'MW', 'MZ', 'NA', 'LS', 'SZ', 'CI', 'SN', 'CM', 'ET']
const EU = ['DE', 'FR', 'NL', 'BE', 'ES', 'IT', 'PT', 'IE', 'AT', 'FI', 'SE', 'DK', 'PL', 'GB']

const p = (x: ProviderSpec) => x

/* ---------- provider catalogue (every entry is free to sign up for) ---------- */

export const PROVIDERS: ProviderSpec[] = [
  /* --- cards & wallets: worldwide --- */
  p({
    key: 'stripe', name: 'Stripe Payment Link', short: 'Stripe', kind: 'card', mark: 'S',
    regions: ['*'], currencies: ['*'], features: ['link', 'qr', 'recurring', 'refunds', 'inperson'],
    accountLabel: 'Payment link URL', accountHint: 'https://buy.stripe.com/…',
    pattern: /^https:\/\/(buy\.stripe\.com|pay\.stripe\.com)\/\S+$/i,
    patternHelp: 'Paste the full https://buy.stripe.com/… link from your Stripe dashboard.',
    template: '{account}?client_reference_id={ref}', fee: '~2.9% + fixed, per transaction',
    settlement: '2–7 days', signup: 'https://dashboard.stripe.com/payment-links',
    note: 'Visa, Mastercard, Amex, Apple Pay, Google Pay, Link. No monthly fee.',
  }),
  p({
    key: 'paypal', name: 'PayPal.Me', short: 'PayPal', kind: 'card', mark: 'P',
    regions: ['*'], currencies: ['*'], features: ['link', 'qr', 'refunds'],
    accountLabel: 'PayPal.Me handle', accountHint: 'yourname',
    pattern: /^[A-Za-z0-9_-]{3,30}$/, patternHelp: 'Just the handle, e.g. novaerp — not the full URL.',
    template: 'https://paypal.me/{account}/{amount}{cur}', fee: '~3.4% + fixed',
    settlement: 'instant to balance', signup: 'https://paypal.me',
    note: 'Amount is pre-filled in the link; payer can use a card without a PayPal account.',
  }),
  p({
    key: 'square', name: 'Square checkout link', short: 'Square', kind: 'card', mark: '□',
    regions: ['US', 'CA', 'GB', 'AU', 'IE', 'FR', 'ES', 'JP'], currencies: ['*'],
    features: ['link', 'qr', 'inperson', 'refunds'],
    accountLabel: 'Checkout link', accountHint: 'https://square.link/u/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: '~2.6% + fixed',
    settlement: '1–2 days', signup: 'https://squareup.com', note: 'Pairs with Square terminals for in-person card sales.',
  }),
  p({
    key: 'sumup', name: 'SumUp payment link / tap to pay', short: 'SumUp', kind: 'card', mark: '≡',
    regions: [...EU, 'US', 'BR', 'CL', 'CO'], currencies: ['*'], features: ['link', 'inperson', 'refunds'],
    accountLabel: 'Payment link', accountHint: 'https://pay.sumup.com/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: '~1.7–2.75%',
    settlement: '1–3 days', signup: 'https://sumup.com', note: 'Turns an Android phone into a card terminal.',
  }),
  p({
    key: 'revolut', name: 'Revolut.Me request', short: 'Revolut', kind: 'card', mark: 'R',
    regions: [...EU, 'US', 'AU', 'SG'], currencies: ['*'], features: ['link', 'qr', 'instant'],
    accountLabel: 'Revolut handle', accountHint: 'yourname',
    pattern: /^[A-Za-z0-9_.-]{3,30}$/, template: 'https://revolut.me/{account}/{amount}{cur}',
    fee: 'free between Revolut users', settlement: 'instant', signup: 'https://revolut.com',
    note: 'Great for freelancers invoicing across borders.',
  }),
  p({
    key: 'wise', name: 'Wise payment request', short: 'Wise', kind: 'card', mark: 'W',
    regions: ['*'], currencies: ['*'], features: ['link', 'payout'],
    accountLabel: 'Wise handle', accountHint: 'yourname',
    pattern: /^[A-Za-z0-9_.-]{2,40}$/, template: 'https://wise.com/pay/me/{account}',
    fee: 'low fixed FX fee', settlement: '1–2 days', signup: 'https://wise.com',
    note: 'Best mid-market FX rate for cross-border invoices.',
  }),
  p({
    key: 'skrill', name: 'Skrill request money', short: 'Skrill', kind: 'card', mark: 'Ŝ',
    regions: ['*'], currencies: ['*'], features: ['link', 'instant'],
    accountLabel: 'Skrill email or skrill.me tag', accountHint: 'you@example.com',
    template: 'https://skrill.me/rq/{account}/{amount}/{cur}', fee: '~1.45–2.9%',
    settlement: 'instant to wallet', signup: 'https://skrill.com', note: 'Wallet and card payments with a request link.',
  }),
  p({
    key: 'payoneer', name: 'Payoneer request a payment', short: 'Payoneer', kind: 'card', mark: 'Ꝑ',
    regions: ['*'], currencies: ['*'], features: ['link', 'payout'],
    accountLabel: 'Payoneer payment request URL', accountHint: 'https://payoneer.com/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: '~1–3%', settlement: '2–5 days',
    signup: 'https://payoneer.com', note: 'Popular with contractors billing overseas clients.',
  }),
  p({
    key: 'mollie', name: 'Mollie payment link', short: 'Mollie', kind: 'card', mark: 'M',
    regions: EU, currencies: ['EUR', 'GBP'], features: ['link', 'qr', 'refunds'],
    accountLabel: 'Payment link', accountHint: 'https://payment-link.mollie.com/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: 'per-transaction only',
    settlement: '1–3 days', signup: 'https://mollie.com', note: 'iDEAL, Bancontact, SEPA and cards in one link.',
  }),

  /* --- cards & wallets: regional champions --- */
  p({
    key: 'paystack', name: 'Paystack payment page', short: 'Paystack', kind: 'card', mark: '✚',
    regions: ['NG', 'GH', 'ZA', 'KE', 'CI', 'EG'], currencies: ['NGN', 'GHS', 'ZAR', 'KES', 'USD'],
    features: ['link', 'qr', 'recurring', 'refunds'],
    accountLabel: 'Payment page URL', accountHint: 'https://paystack.com/pay/your-page',
    pattern: /^https:\/\/paystack\.(com|shop)\/\S+$/i,
    template: '{account}?amount={amountMinor}&reference={ref}', fee: '~1.5% local',
    settlement: 'next day', signup: 'https://paystack.com', note: 'Cards, bank transfer and USSD for West/East Africa.',
  }),
  p({
    key: 'flutterwave', name: 'Flutterwave store / payment link', short: 'Flutterwave', kind: 'card', mark: '✦',
    regions: AFRICA, currencies: ['*'], features: ['link', 'qr', 'recurring', 'refunds'],
    accountLabel: 'Store or payment link', accountHint: 'https://flutterwave.com/pay/your-link',
    pattern: /^https:\/\/\S+$/i, template: '{account}?amount={amount}&currency={cur}',
    fee: '~1.4–3.8%', settlement: 'next day', signup: 'https://flutterwave.com/store',
    note: 'One hosted page that accepts cards *and* African mobile money.',
  }),
  p({
    key: 'yoco', name: 'Yoco payment link', short: 'Yoco', kind: 'card', mark: 'Y',
    regions: ['ZA'], currencies: ['ZAR'], features: ['link', 'inperson', 'refunds'],
    accountLabel: 'Payment link', accountHint: 'https://pay.yoco.com/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: '~2.6–2.95%', settlement: '1–2 days',
    signup: 'https://yoco.com', note: 'South African card reader and link payments.',
  }),
  p({
    key: 'payfast', name: 'PayFast / Payfast by Network', short: 'PayFast', kind: 'card', mark: 'F',
    regions: ['ZA'], currencies: ['ZAR'], features: ['link', 'recurring'],
    accountLabel: 'Payment link', accountHint: 'https://payf.st/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: '~2.9% + fixed', settlement: '1–2 days',
    signup: 'https://payfast.io', note: 'Cards, instant EFT, SnapScan and Zapper in one page.',
  }),
  p({
    key: 'ozow', name: 'Ozow instant EFT', short: 'Ozow', kind: 'bank', mark: 'O',
    regions: ['ZA'], currencies: ['ZAR'], features: ['link', 'instant'],
    accountLabel: 'Payment link', accountHint: 'https://pay.ozow.com/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: '~1.5%', settlement: 'same day',
    signup: 'https://ozow.com', note: 'Bank-to-bank instant EFT, cheaper than cards in South Africa.',
  }),
  p({
    key: 'razorpay', name: 'Razorpay payment page', short: 'Razorpay', kind: 'card', mark: '₹',
    regions: ['IN'], currencies: ['INR'], features: ['link', 'qr', 'recurring', 'refunds'],
    accountLabel: 'Payment page URL', accountHint: 'https://rzp.io/l/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: '~2%', settlement: '2 days',
    signup: 'https://razorpay.com', note: 'Cards, UPI, netbanking and wallets for India.',
  }),
  p({
    key: 'mercadopago', name: 'Mercado Pago link', short: 'Mercado Pago', kind: 'card', mark: '⌁',
    regions: ['AR', 'BR', 'MX', 'CL', 'CO', 'PE', 'UY'], currencies: ['*'], features: ['link', 'qr', 'inperson'],
    accountLabel: 'Payment link', accountHint: 'https://mpago.la/…',
    pattern: /^https:\/\/\S+$/i, template: '{account}', fee: '~3–5%', settlement: 'instant to 14 days',
    signup: 'https://mercadopago.com', note: 'Dominant wallet and card rail across Latin America.',
  }),
  p({
    key: 'cashapp', name: 'Cash App $cashtag', short: 'Cash App', kind: 'card', mark: '$',
    regions: ['US', 'GB'], currencies: ['USD', 'GBP'], features: ['link', 'qr', 'instant'],
    accountLabel: 'Cashtag', accountHint: 'yourname',
    pattern: /^\$?[A-Za-z0-9_]{1,20}$/, template: 'https://cash.app/${account}/{amount}',
    fee: 'free personal, ~2.75% business', settlement: 'instant', signup: 'https://cash.app',
    note: 'Very fast for US small business and gig work.',
  }),
  p({
    key: 'venmo', name: 'Venmo request', short: 'Venmo', kind: 'card', mark: 'V',
    regions: ['US'], currencies: ['USD'], features: ['link', 'qr', 'instant'],
    accountLabel: 'Venmo username', accountHint: 'yourname',
    pattern: /^@?[A-Za-z0-9_-]{3,30}$/, template: 'https://venmo.com/{account}?txn=pay&amount={amount}&note={ref}',
    fee: 'free personal, ~1.9% business', settlement: '1 day', signup: 'https://venmo.com',
    note: 'US peer-to-peer rail that doubles as a small-business checkout.',
  }),
  p({
    key: 'alipay', name: 'Alipay', short: 'Alipay', kind: 'card', mark: '支',
    regions: ['CN', 'HK', 'SG'], currencies: ['CNY', 'HKD', 'SGD'], features: ['qr', 'inperson'],
    accountLabel: 'Merchant QR payload or account', accountHint: 'https://qr.alipay.com/…',
    template: '{account}', fee: '~0.6%', settlement: 'next day', signup: 'https://global.alipay.com',
    note: 'Scan-to-pay is the default in Greater China.',
  }),
  p({
    key: 'wechat', name: 'WeChat Pay', short: 'WeChat Pay', kind: 'card', mark: '微',
    regions: ['CN', 'HK'], currencies: ['CNY', 'HKD'], features: ['qr', 'inperson'],
    accountLabel: 'Merchant QR payload', accountHint: 'wxp://…',
    template: '{account}', fee: '~0.6%', settlement: 'next day', signup: 'https://pay.weixin.qq.com',
    note: 'Paste the QR payload from your merchant account.',
  }),

  /* --- account-to-account instant rails --- */
  p({
    key: 'upi', name: 'UPI (India)', short: 'UPI', kind: 'bank', mark: '🇮',
    regions: ['IN'], currencies: ['INR'], features: ['qr', 'instant'],
    accountLabel: 'UPI ID (VPA)', accountHint: 'yourname@okhdfcbank',
    pattern: /^[\w.-]{2,}@[\w.-]{2,}$/, patternHelp: 'Looks like name@bank.',
    template: 'upi://pay?pa={account}&am={amount}&cu={cur}&tn={ref}', fee: 'free',
    settlement: 'instant', note: 'Scan-and-pay with any Indian banking app, zero merchant fee.',
  }),
  p({
    key: 'pix', name: 'Pix (Brazil)', short: 'Pix', kind: 'bank', mark: '◆',
    regions: ['BR'], currencies: ['BRL'], features: ['qr', 'instant'],
    accountLabel: 'Pix key or BR Code payload', accountHint: 'email, phone, CPF/CNPJ or 000201…',
    template: '{account}', fee: 'free or near-free', settlement: 'instant (24/7)',
    note: 'Paste a static BR Code payload to get a scannable Pix QR.',
  }),
  p({
    key: 'promptpay', name: 'PromptPay (Thailand)', short: 'PromptPay', kind: 'bank', mark: '฿',
    regions: ['TH'], currencies: ['THB'], features: ['qr', 'instant'],
    accountLabel: 'PromptPay ID or QR payload', accountHint: 'phone / tax ID',
    template: '{account}', fee: 'free', settlement: 'instant', note: 'Thailand’s national QR rail.',
  }),
  p({
    key: 'interac', name: 'Interac e-Transfer (Canada)', short: 'Interac', kind: 'bank', mark: '⇆',
    regions: ['CA'], currencies: ['CAD'], features: ['instant'],
    accountLabel: 'Email registered for autodeposit', accountHint: 'you@example.com',
    pattern: /^\S+@\S+\.\S+$/, fee: 'free to ~CA$1.50', settlement: 'minutes',
    note: 'Instructions are printed on the invoice; payer sends from their bank app.',
  }),
  p({
    key: 'zelle', name: 'Zelle (US)', short: 'Zelle', kind: 'bank', mark: 'Z',
    regions: ['US'], currencies: ['USD'], features: ['instant'],
    accountLabel: 'Email or mobile registered with Zelle', accountHint: 'you@example.com',
    fee: 'free', settlement: 'minutes', note: 'Bank-to-bank, no fee, no chargebacks.',
  }),
  p({
    key: 'sepa', name: 'SEPA credit transfer', short: 'SEPA', kind: 'bank', mark: '€',
    regions: EU, currencies: ['EUR'], features: ['payout'],
    accountLabel: 'IBAN', accountHint: 'DE89 3704 0044 0532 0130 00',
    pattern: /^[A-Z]{2}[0-9A-Z \-]{10,40}$/i, patternHelp: 'IBAN starts with a two-letter country code.',
    fee: 'free to a few cents', settlement: '0–1 day', note: 'IBAN and reference printed on the document.',
  }),
  p({
    key: 'eft', name: 'Bank transfer / EFT', short: 'EFT', kind: 'bank', mark: '🏦',
    regions: ['*'], currencies: ['*'], features: ['payout'],
    accountLabel: 'Account number', accountHint: '0123456789',
    pattern: /^[\w \-/]{4,40}$/, fee: 'bank charges only', settlement: '0–3 days',
    note: 'Always available fallback — details are printed and shared as text.',
  }),

  /* --- mobile money --- */
  p({
    key: 'mpesa', name: 'M-Pesa (Safaricom / Vodacom)', short: 'M-Pesa', kind: 'mobile', mark: 'M',
    regions: ['KE', 'TZ', 'MZ', 'CD', 'LS', 'GH', 'EG'], currencies: ['KES', 'TZS', 'MZN'],
    features: ['ussd', 'instant', 'inperson'],
    accountLabel: 'Paybill or till number', accountHint: '123456',
    pattern: /^\d{5,7}$/, patternHelp: 'Paybill and till numbers are 5–7 digits.',
    template: 'tel:*150*00%23', fee: 'tiered, paid by sender or merchant', settlement: 'instant',
    signup: 'https://m-pesa.com', note: 'Africa’s largest mobile wallet — dial code opens the pay menu.',
  }),
  p({
    key: 'orange', name: 'Orange Money', short: 'Orange Money', kind: 'mobile', mark: 'O',
    regions: ['BW', 'CI', 'SN', 'ML', 'CM', 'MG'], currencies: ['BWP', 'XOF', 'XAF'],
    features: ['ussd', 'instant', 'inperson'],
    accountLabel: 'Merchant or wallet number', accountHint: '+267 7x xxx xxx',
    pattern: /^[+\d][\d \-]{6,18}$/, template: 'tel:%23145%23', fee: 'low flat fee',
    settlement: 'instant', signup: 'https://orange.com', note: 'Dial code varies by market — edit if your operator differs.',
  }),
  p({
    key: 'myzaka', name: 'MyZaka (Mascom, Botswana)', short: 'MyZaka', kind: 'mobile', mark: 'Z',
    regions: ['BW'], currencies: ['BWP'], features: ['ussd', 'instant', 'inperson'],
    accountLabel: 'Merchant or wallet number', accountHint: '+267 7x xxx xxx',
    pattern: /^[+\d][\d \-]{6,18}$/, template: 'tel:*167%23', fee: 'low flat fee', settlement: 'instant',
    signup: 'https://mascom.bw', note: 'Widely used by Botswana retail and informal traders.',
  }),
  p({
    key: 'smega', name: 'Smega (BTC Botswana)', short: 'Smega', kind: 'mobile', mark: 'S',
    regions: ['BW'], currencies: ['BWP'], features: ['ussd', 'instant'],
    accountLabel: 'Merchant or wallet number', accountHint: '+267 7x xxx xxx',
    pattern: /^[+\d][\d \-]{6,18}$/, template: 'tel:*177%23', fee: 'low flat fee', settlement: 'instant',
    signup: 'https://btc.bw', note: 'Botswana Telecommunications mobile wallet.',
  }),
  p({
    key: 'momo', name: 'MTN MoMo', short: 'MoMo', kind: 'mobile', mark: 'Ⓜ',
    regions: ['GH', 'UG', 'RW', 'ZM', 'CM', 'CI', 'BJ', 'NG', 'SZ'], currencies: ['*'],
    features: ['ussd', 'instant', 'inperson'],
    accountLabel: 'MoMo merchant code', accountHint: '123456',
    pattern: /^\d{4,10}$/, template: 'tel:*165%23', fee: 'tiered', settlement: 'instant',
    signup: 'https://mtn.com', note: 'Pan-African MTN wallet with merchant codes.',
  }),
  p({
    key: 'airtel', name: 'Airtel Money', short: 'Airtel', kind: 'mobile', mark: 'A',
    regions: ['KE', 'TZ', 'UG', 'ZM', 'MW', 'RW', 'NG', 'CD', 'MG'], currencies: ['*'],
    features: ['ussd', 'instant'],
    accountLabel: 'Merchant or wallet number', accountHint: '+2xx xxx xxx',
    pattern: /^[+\d][\d \-]{6,18}$/, template: 'tel:*185%23', fee: 'tiered', settlement: 'instant',
    signup: 'https://airtel.africa', note: 'Strong coverage in East and Central Africa.',
  }),
  p({
    key: 'ecocash', name: 'EcoCash', short: 'EcoCash', kind: 'mobile', mark: 'E',
    regions: ['ZW'], currencies: ['USD', 'ZWL'], features: ['ussd', 'instant'],
    accountLabel: 'Merchant code', accountHint: '12345',
    pattern: /^\d{4,10}$/, template: 'tel:*151%23', fee: 'tiered', settlement: 'instant',
    signup: 'https://ecocash.co.zw', note: 'Zimbabwe’s default payment method.',
  }),
  p({
    key: 'wave', name: 'Wave Money', short: 'Wave', kind: 'mobile', mark: '〜',
    regions: ['SN', 'CI', 'ML', 'BF', 'UG'], currencies: ['XOF', 'UGX'], features: ['qr', 'instant'],
    accountLabel: 'Wave merchant number', accountHint: '+221 xx xxx xx xx',
    pattern: /^[+\d][\d \-]{6,18}$/, template: 'https://pay.wave.com/m/{account}/c/{cur}/?amount={amount}',
    fee: '1% — cheapest in West Africa', settlement: 'instant', signup: 'https://wave.com',
    note: 'Flat 1% fee disrupted mobile money pricing in francophone Africa.',
  }),
  p({
    key: 'telebirr', name: 'telebirr (Ethiopia)', short: 'telebirr', kind: 'mobile', mark: 'T',
    regions: ['ET'], currencies: ['ETB'], features: ['ussd', 'instant'],
    accountLabel: 'Merchant short code', accountHint: '123456',
    pattern: /^\d{4,10}$/, template: 'tel:*127%23', fee: 'tiered', settlement: 'instant',
    note: 'Ethio Telecom wallet, now near-universal in Ethiopia.',
  }),
  p({
    key: 'bkash', name: 'bKash (Bangladesh)', short: 'bKash', kind: 'mobile', mark: 'b',
    regions: ['BD'], currencies: ['BDT'], features: ['ussd', 'qr', 'instant'],
    accountLabel: 'Merchant number', accountHint: '01xxxxxxxxx',
    pattern: /^\d{9,14}$/, template: 'tel:*247%23', fee: '~1.85% merchant', settlement: 'instant',
    signup: 'https://bkash.com', note: 'The default wallet for Bangladeshi retail.',
  }),
  p({
    key: 'gcash', name: 'GCash (Philippines)', short: 'GCash', kind: 'mobile', mark: 'G',
    regions: ['PH'], currencies: ['PHP'], features: ['qr', 'instant'],
    accountLabel: 'GCash number or QR payload', accountHint: '09xxxxxxxxx',
    pattern: /^(09\d{9}|\S{10,})$/, template: '{account}', fee: 'low merchant fee', settlement: 'instant',
    signup: 'https://gcash.com', note: 'Scan-to-pay dominates Philippine retail.',
  }),
  p({
    key: 'ovo', name: 'OVO / DANA (Indonesia)', short: 'OVO', kind: 'mobile', mark: '◉',
    regions: ['ID'], currencies: ['IDR'], features: ['qr', 'instant'],
    accountLabel: 'QRIS payload or merchant number', accountHint: '00020101…',
    template: '{account}', fee: '0.7% QRIS', settlement: 'next day', note: 'Works with the national QRIS standard.',
  }),
  p({
    key: 'truemoney', name: 'TrueMoney (SE Asia)', short: 'TrueMoney', kind: 'mobile', mark: 'ⓣ',
    regions: ['TH', 'KH', 'MM', 'VN', 'PH', 'ID'], currencies: ['*'], features: ['qr', 'instant'],
    accountLabel: 'Wallet number or QR payload', accountHint: '08xxxxxxxx',
    template: '{account}', fee: 'low', settlement: 'instant', note: 'Regional wallet across South-East Asia.',
  }),
  p({
    key: 'posomoney', name: 'Poso Money', short: 'Poso', kind: 'mobile', mark: '⬡',
    regions: ['*'], currencies: ['*'], features: ['ussd', 'instant'],
    accountLabel: 'Merchant or wallet number', accountHint: 'merchant id',
    template: 'tel:{account}', fee: 'per operator', settlement: 'instant',
    note: 'Generic wallet entry — set the dial string your operator publishes.',
  }),

  /* --- crypto, self-custody --- */
  p({
    key: 'btc', name: 'Bitcoin (on-chain)', short: 'Bitcoin', kind: 'crypto', mark: '₿',
    regions: ['*'], currencies: ['*'], features: ['qr', 'payout'],
    accountLabel: 'BTC address', accountHint: 'bc1…',
    pattern: /^(bc1[a-z0-9]{20,70}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    patternHelp: 'Bitcoin addresses start with bc1, 1 or 3.',
    template: 'bitcoin:{account}?amount={coin}&label={ref}', fee: 'network fee only',
    settlement: '10–60 minutes', note: 'No intermediary. Set your posted rate to convert the invoice amount.',
  }),
  p({
    key: 'lightning', name: 'Bitcoin Lightning address', short: 'Lightning', kind: 'crypto', mark: '⚡',
    regions: ['*'], currencies: ['*'], features: ['qr', 'instant'],
    accountLabel: 'Lightning address', accountHint: 'you@walletofsatoshi.com',
    pattern: /^\S+@\S+\.\S+$/, template: 'lightning:{account}', fee: 'near zero',
    settlement: 'seconds', note: 'Best crypto option for small, instant payments.',
  }),
  p({
    key: 'eth', name: 'Ethereum / EVM wallet', short: 'Ethereum', kind: 'crypto', mark: 'Ξ',
    regions: ['*'], currencies: ['*'], features: ['qr'],
    accountLabel: 'EVM address', accountHint: '0x…',
    pattern: /^0x[a-fA-F0-9]{40}$/, patternHelp: 'An EVM address is 0x plus 40 hex characters.',
    template: 'ethereum:{account}?value={coin}', fee: 'gas only', settlement: 'minutes',
    note: 'Also scans correctly for Polygon, Base and other EVM chains.',
  }),
  p({
    key: 'usdt', name: 'USDT (Tether, TRC20/ERC20)', short: 'USDT', kind: 'crypto', mark: '₮',
    regions: ['*'], currencies: ['*'], features: ['qr'],
    accountLabel: 'USDT address', accountHint: 'T… or 0x…',
    pattern: /^(T[A-Za-z0-9]{33}|0x[a-fA-F0-9]{40})$/, template: '{account}',
    fee: 'network fee only', settlement: 'minutes',
    note: 'Dollar-stable: set the rate to your currency per 1 USDT.',
  }),
  p({
    key: 'usdc', name: 'USDC', short: 'USDC', kind: 'crypto', mark: 'Ⓤ',
    regions: ['*'], currencies: ['*'], features: ['qr'],
    accountLabel: 'USDC address', accountHint: '0x… or Solana address',
    template: '{account}', fee: 'network fee only', settlement: 'minutes',
    note: 'Regulated stablecoin, popular for cross-border B2B.',
  }),
  p({
    key: 'sol', name: 'Solana', short: 'Solana', kind: 'crypto', mark: '◎',
    regions: ['*'], currencies: ['*'], features: ['qr', 'instant'],
    accountLabel: 'Solana address', accountHint: 'base58 address',
    template: 'solana:{account}?amount={coin}&label={ref}', fee: 'fractions of a cent',
    settlement: 'seconds', note: 'Cheap and fast for frequent small settlements.',
  }),

  /* --- cash & vouchers --- */
  p({
    key: 'cash', name: 'Cash', short: 'Cash', kind: 'cash', mark: '◉',
    regions: ['*'], currencies: ['*'], features: ['inperson'],
    accountLabel: 'Till or location', accountHint: 'Front desk',
    fee: 'none', settlement: 'immediate', note: 'Recorded against the Cash on hand ledger account.',
  }),
  p({
    key: 'cod', name: 'Cash on delivery', short: 'COD', kind: 'cash', mark: '⛟',
    regions: ['*'], currencies: ['*'], features: ['inperson'],
    accountLabel: 'Driver / route', accountHint: 'Delivery team',
    fee: 'none', settlement: 'on delivery', note: 'Printed on the delivery note with a signature line.',
  }),
  p({
    key: 'voucher', name: 'Voucher / coupon code', short: 'Voucher', kind: 'voucher', mark: '◧',
    regions: ['*'], currencies: ['*'], features: [],
    accountLabel: 'Programme name', accountHint: 'Loyalty vouchers',
    fee: 'none', settlement: 'at redemption', note: 'Redeem a code as a discount line on any quote or invoice.',
  }),
  p({
    key: 'giftcard', name: 'Gift card / store credit', short: 'Gift card', kind: 'voucher', mark: '▤',
    regions: ['*'], currencies: ['*'], features: [],
    accountLabel: 'Programme name', accountHint: 'Gift cards',
    fee: 'none', settlement: 'at redemption', note: 'Issue codes in Coupons, redeem them at checkout.',
  }),
]

export const providerOf = (key: string) => PROVIDERS.find(x => x.key === key)

/** Human label for a country code, for the region filter. */
export const COUNTRIES: { code: string; name: string; currency: string }[] = [
  { code: 'BW', name: 'Botswana', currency: 'BWP' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'NA', name: 'Namibia', currency: 'NAD' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'USD' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'CN', name: 'China', currency: 'CNY' },
]

export const countryName = (code: string) => COUNTRIES.find(c => c.code === code)?.name ?? code

/** Does this provider serve the given country? */
export const servesCountry = (spec: ProviderSpec, country: string) =>
  spec.regions.includes('*') || spec.regions.includes(country)

export const servesCurrency = (spec: ProviderSpec, cur: string) =>
  spec.currencies.includes('*') || spec.currencies.includes(cur)

/** Catalogue search used by the channels browser. */
export function searchProviders(
  q: string,
  opts: { kind?: ChannelKind | 'all'; country?: string; localOnly?: boolean } = {},
) {
  const s = q.trim().toLowerCase()
  return PROVIDERS.filter(spec => {
    if (opts.kind && opts.kind !== 'all' && spec.kind !== opts.kind) return false
    if (opts.localOnly && opts.country && !servesCountry(spec, opts.country)) return false
    if (!s) return true
    return (`${spec.name} ${spec.short} ${spec.kind} ${spec.note} ${spec.regions.join(' ')}`)
      .toLowerCase().includes(s)
  })
}

/**
 * What to switch on first in this country: local rails beat global ones,
 * and a universal fallback (EFT, cash) is always included.
 */
export function recommendedProviders(country: string, currency: string, limit = 6) {
  const score = (spec: ProviderSpec) => {
    let n = 0
    if (spec.regions.includes(country)) n += 10          // explicitly local
    if (servesCurrency(spec, currency)) n += 3
    if (spec.regions.includes('*')) n += 1               // works anywhere
    if (spec.features.includes('instant')) n += 2
    if (spec.features.includes('qr') || spec.features.includes('link')) n += 2
    if (spec.fee.includes('free')) n += 1
    return n
  }
  return [...PROVIDERS]
    .filter(spec => servesCountry(spec, country))
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
}

/** Blocks a broken link or malformed wallet address from reaching an invoice. */
export function validateAccount(spec: ProviderSpec | undefined, value: string):
  { ok: boolean; message?: string } {
  const v = (value || '').trim()
  if (!v) return { ok: false, message: `${spec?.accountLabel ?? 'Account'} is required before this channel goes live.` }
  if (spec?.pattern && !spec.pattern.test(v)) {
    return { ok: false, message: spec.patternHelp ?? `That does not look like a valid ${spec.accountLabel.toLowerCase()}.` }
  }
  return { ok: true }
}

/** Channels that are switched on *and* actually usable. */
export function liveChannels(d: DB) {
  return d.channels.filter(c => c.enabled && validateAccount(providerOf(c.provider), c.account).ok)
}

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
  return liveChannels(d)
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
