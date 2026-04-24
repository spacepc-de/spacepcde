import { getCloudflareContext } from '@opennextjs/cloudflare'

type RuntimeEnv = {
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
    return cloudflareValue
  }

  const processValue = process.env[key]

  if (typeof processValue === 'string' && processValue.trim()) {
    return processValue
  }

  return undefined
}
