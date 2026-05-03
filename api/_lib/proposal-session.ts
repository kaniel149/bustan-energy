const COOKIE_NAME = 'bustan_proposal_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

interface ProposalSessionPayload {
  r: string
  e: number
}

const encoder = new TextEncoder()

function sessionSecret(): string {
  return process.env.PROPOSAL_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

function base64UrlEncode(value: string | Uint8Array): string {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function sign(message: string): Promise<string> {
  const secret = sessionSecret()
  if (!secret) throw new Error('missing_session_secret')
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return base64UrlEncode(new Uint8Array(digest))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export async function createProposalSession(ref: string): Promise<string> {
  const payload: ProposalSessionPayload = {
    r: ref,
    e: Date.now() + SESSION_TTL_SECONDS * 1000,
  }
  const body = base64UrlEncode(JSON.stringify(payload))
  return `${body}.${await sign(body)}`
}

export async function verifyProposalSession(token: string | null, ref: string): Promise<boolean> {
  if (!token) return false
  const [body, signature] = token.split('.')
  if (!body || !signature) return false

  const expected = await sign(body)
  if (!timingSafeEqual(signature, expected)) return false

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as ProposalSessionPayload
    return payload.r === ref && Number.isFinite(payload.e) && payload.e > Date.now()
  } catch {
    return false
  }
}

export function getProposalSessionCookie(req: Request): string | null {
  const header = req.headers.get('cookie') || ''
  const cookies = header.split(';').map((part) => part.trim())
  const found = cookies.find((part) => part.startsWith(`${COOKIE_NAME}=`))
  return found ? decodeURIComponent(found.slice(COOKIE_NAME.length + 1)) : null
}

export function proposalSessionCookie(token: string, secure = true): string {
  const secureFlag = secure ? '; Secure' : ''
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly${secureFlag}; SameSite=Lax`
}
