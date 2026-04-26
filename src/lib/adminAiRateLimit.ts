import { isRateLimited } from './commentRateLimit'

const ADMIN_AI_RATE_LIMIT_WINDOW_MS = 60 * 1000
const ADMIN_AI_RATE_LIMIT_MAX_REQUESTS = 12

type UserLike = {
  email?: string | null
  id?: number | string | null
}

function getClientIp(request: Request) {
  const cloudflareIp = request.headers.get('cf-connecting-ip')

  if (cloudflareIp?.trim()) {
    return cloudflareIp.trim()
  }

  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return 'unknown'
}

function getUserIdentifier(user: unknown) {
  if (!user || typeof user !== 'object') {
    return 'anonymous'
  }

  const typedUser = user as UserLike

  if (typedUser.id !== null && typedUser.id !== undefined && typedUser.id !== '') {
    return `id:${String(typedUser.id)}`
  }

  if (typedUser.email?.trim()) {
    return `email:${typedUser.email.trim().toLowerCase()}`
  }

  return 'anonymous'
}

export async function isAdminAIRateLimited(request: Request, user: unknown) {
  const userIdentifier = getUserIdentifier(user)
  const clientIp = getClientIp(request)
  const rateLimitKey = `admin-ai:${userIdentifier}:${clientIp}`

  return isRateLimited(
    rateLimitKey,
    ADMIN_AI_RATE_LIMIT_MAX_REQUESTS,
    ADMIN_AI_RATE_LIMIT_WINDOW_MS,
  )
}
