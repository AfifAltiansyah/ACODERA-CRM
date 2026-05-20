const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

interface BrevoSendEmailOptions {
  to: string | string[]
  subject: string
  htmlContent: string
  fromName?: string
  fromEmail?: string
  attachments?: Array<{ name: string; content: string }>
}

interface BrevoRateLimitState {
  remaining: number
  resetAt: number
}

let rateLimitState: BrevoRateLimitState | null = null

function getApiKey(): string {
  const key = Deno.env.get('BREVO_API_KEY')
  if (!key) throw new Error('BREVO_API_KEY not configured')
  return key
}

function getSenderEmail(): string {
  return Deno.env.get('SENDER_EMAIL') || 'noreply@acodera.com'
}

function shouldThrottle(): number {
  if (!rateLimitState) return 0
  if (rateLimitState.remaining > 10) return 0
  const waitMs = Math.max(0, rateLimitState.resetAt - Date.now())
  return waitMs + 100
}

function updateRateLimit(headers: Headers): void {
  const remaining = headers.get('x-sib-ratelimit-remaining')
  const reset = headers.get('x-sib-ratelimit-reset')
  if (remaining !== null) {
    rateLimitState = {
      remaining: parseInt(remaining, 10),
      resetAt: Date.now() + (parseInt(reset || '60', 10) * 1000),
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function sendEmail(options: BrevoSendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = getApiKey()
  const senderEmail = options.fromEmail || getSenderEmail()
  const toList = Array.isArray(options.to) ? options.to : [options.to]

  const waitMs = shouldThrottle()
  if (waitMs > 0) {
    console.warn(`Brevo rate limit low, throttling ${waitMs}ms`)
    await sleep(waitMs)
  }

  const body: Record<string, unknown> = {
    sender: { name: options.fromName || 'Acodera CRM', email: senderEmail },
    to: toList.map(email => ({ email })),
    subject: options.subject,
    htmlContent: options.htmlContent,
  }

  if (options.attachments?.length) {
    body.attachment = options.attachments
  }

  let lastError: string | null = null

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      updateRateLimit(res.headers)

      if (res.ok) {
        const data = await res.json()
        return { success: true, messageId: data.messageId || data.id }
      }

      if (res.status === 429) {
        const resetSec = parseInt(res.headers.get('x-sib-ratelimit-reset') || '60', 10)
        const backoff = (resetSec + Math.pow(2, attempt) + Math.random()) * 1000
        console.warn(`Brevo 429 (attempt ${attempt + 1}/3), backing off ${Math.round(backoff)}ms`)
        await sleep(backoff)
        lastError = 'Rate limited'
        continue
      }

      const errData = await res.json().catch(() => ({ message: res.statusText }))
      lastError = (errData as Record<string, unknown>).message as string || JSON.stringify(errData)
      return { success: false, error: lastError }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt < 2) {
        await sleep(Math.pow(2, attempt) * 1000)
      }
    }
  }

  return { success: false, error: lastError || 'Max retries exceeded' }
}
