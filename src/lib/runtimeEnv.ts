import { getCloudflareContext } from '@opennextjs/cloudflare'

type RuntimeEnv = {
  AMAZON_CREATOR_CREDENTIAL_ID?: string
  AMAZON_CREATOR_CREDENTIAL_SECRET?: string
  AMAZON_CREATOR_VERSION?: string
  AMAZON_MARKETPLACE?: string
  AMAZON_PARTNER_TAG?: string
  OPENAI_API_KEY?: string
  OPENAI_TRANSLATION_MODEL?: string
}

async function getCloudflareRuntimeEnv(): Promise<RuntimeEnv | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return env as RuntimeEnv
  } catch {
    return null
  }
}

export async function getRuntimeEnvValue(key: keyof RuntimeEnv): Promise<string | undefined> {
  const cloudflareEnv = await getCloudflareRuntimeEnv()
  const cloudflareValue = cloudflareEnv?.[key]

  if (typeof cloudflareValue === 'string' && cloudflareValue.trim()) {
    return normalizeRuntimeEnvValue(cloudflareValue)
  }

  const processValue = process.env[key]

  if (typeof processValue === 'string' && processValue.trim()) {
    return normalizeRuntimeEnvValue(processValue)
  }

  return undefined
}

function normalizeRuntimeEnvValue(value: string) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}
