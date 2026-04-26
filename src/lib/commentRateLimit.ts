import { getCloudflareContext } from '@opennextjs/cloudflare'

const RATE_LIMIT_FALLBACK_WINDOW_MS = 15 * 60 * 1000
const fallbackRateLimit = new Map<string, { count: number; resetAt: number }>()

function getFallbackState(key: string, windowMs: number) {
  const now = Date.now()
  const existing = fallbackRateLimit.get(key)

  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs }
    fallbackRateLimit.set(key, next)
    return next
  }

  const next = {
    count: existing.count + 1,
    resetAt: existing.resetAt,
  }

  fallbackRateLimit.set(key, next)
  return next
}

async function hashRateLimitKey(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function getD1Database(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return env.D1 as D1Database
  } catch {
    return null
  }
}

async function takePersistentRateLimitToken(key: string, maxRequests: number, windowMs: number) {
  const db = await getD1Database()

  if (!db) {
    const fallbackState = getFallbackState(key, Math.max(windowMs, RATE_LIMIT_FALLBACK_WINDOW_MS))

    return {
      limited: fallbackState.count > maxRequests,
    }
  }

  const hashedKey = await hashRateLimitKey(key)
  const now = Date.now()
  const cutoff = now - windowMs

  try {
    await db
      .prepare('DELETE FROM comment_rate_limits WHERE updated_at < ?')
      .bind(cutoff)
      .run()

    const row = await db
      .prepare(
        `
          INSERT INTO comment_rate_limits (key_hash, request_count, window_started_at, updated_at)
          VALUES (?, 1, ?, ?)
          ON CONFLICT(key_hash) DO UPDATE SET
            request_count = CASE
              WHEN comment_rate_limits.window_started_at <= ? THEN 1
              ELSE comment_rate_limits.request_count + 1
            END,
            window_started_at = CASE
              WHEN comment_rate_limits.window_started_at <= ? THEN excluded.window_started_at
              ELSE comment_rate_limits.window_started_at
            END,
            updated_at = excluded.updated_at
          RETURNING request_count
        `,
      )
      .bind(hashedKey, now, now, cutoff, cutoff)
      .first<{ request_count: number }>()

    return {
      limited: (row?.request_count ?? 0) > maxRequests,
    }
  } catch {
    const fallbackState = getFallbackState(key, Math.max(windowMs, RATE_LIMIT_FALLBACK_WINDOW_MS))

    return {
      limited: fallbackState.count > maxRequests,
    }
  }
}

export async function isRateLimited(key: string, maxRequests: number, windowMs: number) {
  const result = await takePersistentRateLimitToken(key, maxRequests, windowMs)
  return result.limited
}

export async function isCommentRateLimited(key: string, maxRequests: number, windowMs: number) {
  return isRateLimited(key, maxRequests, windowMs)
}
