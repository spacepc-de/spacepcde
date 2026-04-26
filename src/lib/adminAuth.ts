import { getRuntimeEnvValue } from './runtimeEnv'

type AdminUserLike = {
  email?: string | null
  isAdmin?: boolean | null
  role?: string | null
  roles?: string[] | null
}

function normalizeEmail(value: string | null | undefined) {
  if (!value?.trim()) {
    return null
  }

  return value.trim().toLowerCase()
}

function hasAdminRole(user: AdminUserLike) {
  if (user.isAdmin) {
    return true
  }

  if (typeof user.role === 'string' && user.role.trim().toLowerCase() === 'admin') {
    return true
  }

  if (Array.isArray(user.roles)) {
    return user.roles.some((role) => typeof role === 'string' && role.trim().toLowerCase() === 'admin')
  }

  return false
}

function parseAllowlist(value: string | undefined) {
  if (!value?.trim()) {
    return new Set<string>()
  }

  return new Set(
    value
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )
}

export async function canAccessOpenAIAdminRoutes(user: unknown): Promise<boolean> {
  if (!user || typeof user !== 'object') {
    return false
  }

  const typedUser = user as AdminUserLike

  if (hasAdminRole(typedUser)) {
    return true
  }

  const email = normalizeEmail(typedUser.email)

  if (!email) {
    return false
  }

  const allowlist = parseAllowlist(await getRuntimeEnvValue('OPENAI_ADMIN_EMAIL_ALLOWLIST'))

  if (allowlist.size === 0) {
    return process.env.NODE_ENV !== 'production'
  }

  return allowlist.has(email)
}
