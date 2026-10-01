/**
 * Sharing from a phone, with no backend.
 *
 * Uses the Web Share API where the OS provides it (Android/iOS/Windows share
 * sheets: WhatsApp, email, Drive, Bluetooth…), and degrades to clipboard,
 * mailto: and wa.me links everywhere else.
 */
export interface SharePayload { title: string; text: string; url?: string }

export async function shareText(p: SharePayload): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: p.title, text: p.text, url: p.url })
      return 'shared'
    }
  } catch {
    return 'failed' // user dismissed the sheet
  }
  try {
    await navigator.clipboard.writeText(p.text + (p.url ? `\n${p.url}` : ''))
    return 'copied'
  } catch {
    return 'failed'
  }
}

/** Share a generated file (e.g. a PDF or JSON backup) when the OS allows it. */
export async function shareFile(filename: string, mime: string, data: string, text: string) {
  const file = new File([data], filename, { type: mime })
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], text, title: filename }); return 'shared' } catch { return 'failed' }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(file)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
  return 'downloaded'
}

export const whatsappLink = (text: string, phone = '') =>
  `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`

export const mailtoLink = (to: string, subject: string, body: string) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

export const smsLink = (phone: string, text: string) =>
  `sms:${phone.replace(/\s/g, '')}?body=${encodeURIComponent(text)}`
