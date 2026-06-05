import { getCloudflareContext } from '@opennextjs/cloudflare'

import { getRuntimeEnvValue } from './runtimeEnv'

const AMAZON_API_BASE_URL = 'https://creatorsapi.amazon'
const TOKEN_TTL_MS = 55 * 60 * 1000
const SEARCH_ITEMS_TTL_SECONDS = 12 * 60 * 60
const GET_ITEMS_WITH_OFFERS_TTL_SECONDS = 2 * 60 * 60
const GET_ITEMS_WITHOUT_OFFERS_TTL_SECONDS = 24 * 60 * 60
const MAX_SEARCH_ITEMS = 10
const MAX_GET_ITEMS = 10

const BASE_RESOURCES = ['images.primary.medium', 'itemInfo.title'] as const
const OFFER_RESOURCES = [
  'offersV2.listings.availability',
  'offersV2.listings.condition',
  'offersV2.listings.price',
] as const

type AmazonConfig = {
  credentialId: string
  credentialSecret: string
  marketplace: string
  partnerTag: string
  version: string
}

type AmazonToken = {
  accessToken: string
  expiresAt: number
}

type AmazonApiItem = {
  asin?: string
  detailPageURL?: string
  images?: {
    primary?: {
      medium?: {
        height?: number
        url?: string
        width?: number
      }
    }
  }
  itemInfo?: {
    title?: {
      displayValue?: string
    }
  }
  offersV2?: {
    listings?: Array<{
      availability?: {
        message?: string
        type?: string
      }
      condition?: {
        displayValue?: string
        value?: string
      }
      price?: {
        amount?: number
        currency?: string
        displayAmount?: string
        money?: {
          amount?: number
          currency?: string
          displayAmount?: string
        }
      }
    }>
  }
}

export type AmazonProduct = {
  asin: string
  availability?: {
    message?: string
    type?: string
  }
  condition?: string
  detailPageUrl?: string
  image?: {
    height?: number
    url: string
    width?: number
  }
  price?: {
    amount?: number
    currency?: string
    displayAmount?: string
  }
  title?: string
}

type AmazonProductsResponse = {
  cached: boolean
  cacheExpiresAt: string
  includeOffers: boolean
  items: AmazonProduct[]
  marketplace: string
  mode: 'getItems' | 'searchItems'
  totalResultCount?: number
}

let cachedToken: AmazonToken | undefined

async function getD1Database(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    return env.D1 as D1Database
  } catch {
    return null
  }
}

async function ensureAmazonCacheTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS amazon_product_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );`,
    )
    .run()

  await db
    .prepare(
      'CREATE INDEX IF NOT EXISTS amazon_product_cache_expires_at_idx ON amazon_product_cache (expires_at);',
    )
    .run()
}

async function getConfig(): Promise<AmazonConfig> {
  const [credentialId, credentialSecret, version, partnerTag, marketplace] = await Promise.all([
    getRuntimeEnvValue('AMAZON_CREATOR_CREDENTIAL_ID'),
    getRuntimeEnvValue('AMAZON_CREATOR_CREDENTIAL_SECRET'),
    getRuntimeEnvValue('AMAZON_CREATOR_VERSION'),
    getRuntimeEnvValue('AMAZON_PARTNER_TAG'),
    getRuntimeEnvValue('AMAZON_MARKETPLACE'),
  ])

  if (!credentialId || !credentialSecret || !version || !partnerTag || !marketplace) {
    throw new Error('Amazon Creators API ist nicht vollständig konfiguriert.')
  }

  return {
    credentialId,
    credentialSecret,
    marketplace,
    partnerTag,
    version,
  }
}

function getTokenEndpoint(version: string) {
  switch (version) {
    case '3.1':
      return 'https://api.amazon.com/auth/o2/token'
    case '3.2':
      return 'https://api.amazon.co.uk/auth/o2/token'
    case '3.3':
      return 'https://api.amazon.co.jp/auth/o2/token'
    default:
      throw new Error(`Amazon Credential Version ${version} wird nicht unterstützt.`)
  }
}

async function getAccessToken(config: AmazonConfig) {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken
  }

  const response = await fetch(getTokenEndpoint(config.version), {
    body: JSON.stringify({
      client_id: config.credentialId,
      client_secret: config.credentialSecret,
      grant_type: 'client_credentials',
      scope: 'creatorsapi::default',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const body = (await response.json().catch((): null => null)) as
    | { access_token?: string; expires_in?: number }
    | null

  if (!response.ok || !body?.access_token) {
    throw new Error(`Amazon Token konnte nicht geladen werden (${response.status}).`)
  }

  const expiresInMs =
    typeof body.expires_in === 'number' && body.expires_in > 0
      ? Math.min(body.expires_in * 1000, TOKEN_TTL_MS)
      : TOKEN_TTL_MS

  cachedToken = {
    accessToken: body.access_token,
    expiresAt: Date.now() + expiresInMs - 30_000,
  }

  return cachedToken.accessToken
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function readCache(db: D1Database | null, cacheKey: string) {
  if (!db) {
    return null
  }

  await ensureAmazonCacheTable(db)

  const now = Math.floor(Date.now() / 1000)
  const row = await db
    .prepare('SELECT payload, expires_at FROM amazon_product_cache WHERE cache_key = ? LIMIT 1')
    .bind(cacheKey)
    .first<{ expires_at: number; payload: string }>()

  if (!row || row.expires_at <= now) {
    return null
  }

  return {
    expiresAt: row.expires_at,
    payload: JSON.parse(row.payload) as Omit<AmazonProductsResponse, 'cached'>,
  }
}

async function writeCache(
  db: D1Database | null,
  cacheKey: string,
  operation: string,
  ttlSeconds: number,
  payload: Omit<AmazonProductsResponse, 'cached'>,
) {
  if (!db) {
    return
  }

  await ensureAmazonCacheTable(db)

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + ttlSeconds
  const payloadWithExpiry = {
    ...payload,
    cacheExpiresAt: new Date(expiresAt * 1000).toISOString(),
  }

  await db
    .prepare(
      `INSERT INTO amazon_product_cache (cache_key, operation, payload, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         operation = excluded.operation,
         payload = excluded.payload,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at;`,
    )
    .bind(cacheKey, operation, JSON.stringify(payloadWithExpiry), expiresAt, now, now)
    .run()
}

async function callAmazon<T>(
  config: AmazonConfig,
  path: '/catalog/v1/getItems' | '/catalog/v1/searchItems',
  body: Record<string, unknown>,
) {
  const token = await getAccessToken(config)
  const response = await fetch(`${AMAZON_API_BASE_URL}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-marketplace': config.marketplace,
    },
    method: 'POST',
  })

  const responseBody = (await response.json().catch((): null => null)) as T | null

  if (!response.ok) {
    throw new Error(`Amazon API Anfrage fehlgeschlagen (${response.status}).`)
  }

  if (!responseBody) {
    throw new Error('Amazon API Antwort war leer oder kein JSON.')
  }

  return responseBody
}

function normalizeItem(item: AmazonApiItem): AmazonProduct | null {
  if (!item.asin) {
    return null
  }

  const image = item.images?.primary?.medium
  const offer = item.offersV2?.listings?.[0]
  const price = offer?.price?.money ?? offer?.price

  return {
    asin: item.asin,
    availability: offer?.availability
      ? {
          message: offer.availability.message,
          type: offer.availability.type,
        }
      : undefined,
    condition: offer?.condition?.displayValue || offer?.condition?.value,
    detailPageUrl: item.detailPageURL,
    image: image?.url
      ? {
          height: image.height,
          url: image.url,
          width: image.width,
        }
      : undefined,
    price: price
      ? {
          amount: price.amount,
          currency: price.currency,
          displayAmount: price.displayAmount,
        }
      : undefined,
    title: item.itemInfo?.title?.displayValue,
  }
}

function normalizeItems(items: AmazonApiItem[] | undefined) {
  return (items ?? []).map(normalizeItem).filter((item): item is AmazonProduct => Boolean(item))
}

function getResources(includeOffers: boolean) {
  return includeOffers ? [...BASE_RESOURCES, ...OFFER_RESOURCES] : [...BASE_RESOURCES]
}

export async function searchAmazonProducts({
  includeOffers,
  itemCount,
  keyword,
}: {
  includeOffers: boolean
  itemCount: number
  keyword: string
}): Promise<AmazonProductsResponse> {
  const normalizedKeyword = keyword.trim().replace(/\s+/g, ' ')
  const normalizedItemCount = Math.min(Math.max(itemCount, 1), MAX_SEARCH_ITEMS)
  const operation = 'searchItems'
  const cacheKey = await sha256(
    JSON.stringify({ includeOffers, itemCount: normalizedItemCount, keyword: normalizedKeyword, operation }),
  )
  const db = await getD1Database()
  const cached = await readCache(db, cacheKey)

  if (cached) {
    return {
      ...cached.payload,
      cached: true,
    }
  }

  const config = await getConfig()
  const response = await callAmazon<{
    searchResult?: {
      items?: AmazonApiItem[]
      totalResultCount?: number
    }
  }>(config, '/catalog/v1/searchItems', {
    itemCount: normalizedItemCount,
    keywords: normalizedKeyword,
    partnerTag: config.partnerTag,
    resources: getResources(includeOffers),
  })

  const ttl = includeOffers ? GET_ITEMS_WITH_OFFERS_TTL_SECONDS : SEARCH_ITEMS_TTL_SECONDS
  const payload: Omit<AmazonProductsResponse, 'cached'> = {
    cacheExpiresAt: new Date((Math.floor(Date.now() / 1000) + ttl) * 1000).toISOString(),
    includeOffers,
    items: normalizeItems(response.searchResult?.items),
    marketplace: config.marketplace,
    mode: operation,
    totalResultCount: response.searchResult?.totalResultCount,
  }

  await writeCache(db, cacheKey, operation, ttl, payload)

  return {
    ...payload,
    cached: false,
  }
}

export async function getAmazonProducts({
  asins,
  includeOffers,
}: {
  asins: string[]
  includeOffers: boolean
}): Promise<AmazonProductsResponse> {
  const normalizedAsins = [...new Set(asins.map((asin) => asin.trim().toUpperCase()).filter(Boolean))]
    .slice(0, MAX_GET_ITEMS)
    .sort()
  const operation = 'getItems'
  const cacheKey = await sha256(JSON.stringify({ asins: normalizedAsins, includeOffers, operation }))
  const db = await getD1Database()
  const cached = await readCache(db, cacheKey)

  if (cached) {
    return {
      ...cached.payload,
      cached: true,
    }
  }

  const config = await getConfig()
  const response = await callAmazon<{
    itemsResult?: {
      items?: AmazonApiItem[]
    }
  }>(config, '/catalog/v1/getItems', {
    itemIds: normalizedAsins,
    partnerTag: config.partnerTag,
    resources: getResources(includeOffers),
  })

  const ttl = includeOffers ? GET_ITEMS_WITH_OFFERS_TTL_SECONDS : GET_ITEMS_WITHOUT_OFFERS_TTL_SECONDS
  const payload: Omit<AmazonProductsResponse, 'cached'> = {
    cacheExpiresAt: new Date((Math.floor(Date.now() / 1000) + ttl) * 1000).toISOString(),
    includeOffers,
    items: normalizeItems(response.itemsResult?.items),
    marketplace: config.marketplace,
    mode: operation,
  }

  await writeCache(db, cacheKey, operation, ttl, payload)

  return {
    ...payload,
    cached: false,
  }
}
