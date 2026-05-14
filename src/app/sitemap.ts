import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import type { Payload } from 'payload'

import { SITE_URL, type LocaleCode } from '@/lib/frontend'
import { getPayloadConfig } from '@/payload.config'
import { NETPLAN_TOOL_SLUGS } from '@/lib/netplan'
import type { BlogPost, Category, Page, Tag } from '@/payload-types'

export const dynamic = 'force-dynamic'

const LOCALES: LocaleCode[] = ['de', 'en']

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString()
}

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function toSitemapEntry(
  path: string,
  locale: LocaleCode,
  lastModified?: string | Date | null,
): MetadataRoute.Sitemap[number] {
  const normalizedPath = normalizePath(path)
  const otherLocale = locale === 'de' ? 'en' : 'de'
  const otherPath = normalizedPath.replace(/^\/(de|en)(?=\/|$)/, `/${otherLocale}`)

  return {
    url: absoluteUrl(normalizedPath),
    lastModified: lastModified ? new Date(lastModified) : undefined,
    alternates: {
      languages: {
        de: absoluteUrl(locale === 'de' ? normalizedPath : otherPath),
        en: absoluteUrl(locale === 'en' ? normalizedPath : otherPath),
      },
    },
  }
}

function toExactSitemapEntries(
  paths: Partial<Record<LocaleCode, string>>,
  lastModified?: string | Date | null,
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []
  const languages = Object.fromEntries(
    LOCALES
      .filter((locale) => paths[locale])
      .map((locale) => [locale, absoluteUrl(paths[locale] as string)]),
  )

  for (const locale of LOCALES) {
    const path = paths[locale]

    if (!path) {
      continue
    }

    entries.push({
      url: absoluteUrl(path),
      lastModified: lastModified ? new Date(lastModified) : undefined,
      alternates: {
        languages,
      },
    })
  }

  return entries
}

async function getLocalizedDocs<T extends { id: number; updatedAt: string; url: string }>(
  payload: Payload,
  collection: 'pages' | 'categories' | 'tags' | 'blog-posts',
  locale: LocaleCode,
  where?: Record<string, unknown>,
) {
  const docs: T[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection,
      depth: 0,
      fallbackLocale: false,
      limit: 200,
      locale,
      page,
      sort: 'url',
      ...(where ? { where } : {}),
    })

    docs.push(...(result.docs as unknown as T[]))
    hasNextPage = result.hasNextPage
    page += 1
  }

  return docs
}

async function getLocalizedDocSitemapEntries<T extends { id: number; updatedAt: string; url: string }>(
  payload: Payload,
  collection: 'pages' | 'blog-posts',
  pathForDoc: (locale: LocaleCode, doc: T) => string,
  where?: Record<string, unknown>,
) {
  const docsById = new Map<
    number,
    {
      lastModified?: string | Date | null
      paths: Partial<Record<LocaleCode, string>>
    }
  >()

  for (const locale of LOCALES) {
    const docs = await getLocalizedDocs<T>(payload, collection, locale, where)

    for (const doc of docs) {
      if (!doc.url) {
        continue
      }

      const localizedDoc = docsById.get(doc.id) || { paths: {} }
      localizedDoc.paths[locale] = pathForDoc(locale, doc)
      localizedDoc.lastModified = localizedDoc.lastModified
        ? new Date(localizedDoc.lastModified) > new Date(doc.updatedAt)
          ? localizedDoc.lastModified
          : doc.updatedAt
        : doc.updatedAt
      docsById.set(doc.id, localizedDoc)
    }
  }

  return [...docsById.values()].flatMap((doc) =>
    toExactSitemapEntries(doc.paths, doc.lastModified),
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const entries: MetadataRoute.Sitemap = []

  entries.push(
    ...toExactSitemapEntries({
      de: '/de',
      en: '/en',
    }),
    ...toExactSitemapEntries({
      de: '/de/blog',
      en: '/en/blog',
    }),
    ...toExactSitemapEntries({
      de: '/de/tools',
      en: '/en/tools',
    }),
  )

  for (const tool of NETPLAN_TOOL_SLUGS) {
    entries.push(
      ...toExactSitemapEntries({
        de: `/de/tools/${tool}`,
        en: `/en/tools/${tool}`,
      }),
    )
  }

  entries.push(
    ...(await getLocalizedDocSitemapEntries<Page>(
      payload,
      'pages',
      (locale, page) => `/${locale}/${page.url}`,
    )),
    ...(await getLocalizedDocSitemapEntries<BlogPost>(
      payload,
      'blog-posts',
      (locale, post) => `/${locale}/${post.url}`,
      {
        status: {
          equals: 'published',
        },
      },
    )),
  )

  for (const locale of LOCALES) {
    const [categories, tags] = await Promise.all([
      getLocalizedDocs<Category>(payload, 'categories', locale),
      getLocalizedDocs<Tag>(payload, 'tags', locale),
    ])

    for (const category of categories) {
      entries.push(toSitemapEntry(`/${locale}/blog/category/${category.url}`, locale, category.updatedAt))
    }

    for (const tag of tags) {
      entries.push(toSitemapEntry(`/${locale}/blog/tag/${tag.url}`, locale, tag.updatedAt))
    }
  }

  return entries
}
