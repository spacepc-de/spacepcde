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

async function getLocalizedDocs<T extends { updatedAt: string; url: string }>(
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    entries.push(toSitemapEntry(`/${locale}`, locale))
    entries.push(toSitemapEntry(`/${locale}/blog`, locale))
    entries.push(toSitemapEntry(`/${locale}/tools`, locale))

    for (const tool of NETPLAN_TOOL_SLUGS) {
      entries.push(toSitemapEntry(`/${locale}/tools/${tool}`, locale))
    }

    const [pages, categories, tags, posts] = await Promise.all([
      getLocalizedDocs<Page>(payload, 'pages', locale),
      getLocalizedDocs<Category>(payload, 'categories', locale),
      getLocalizedDocs<Tag>(payload, 'tags', locale),
      getLocalizedDocs<BlogPost>(payload, 'blog-posts', locale, {
        status: {
          equals: 'published',
        },
      }),
    ])

    for (const page of pages) {
      entries.push(toSitemapEntry(`/${locale}/${page.url}`, locale, page.updatedAt))
    }

    for (const category of categories) {
      entries.push(toSitemapEntry(`/${locale}/blog/category/${category.url}`, locale, category.updatedAt))
    }

    for (const tag of tags) {
      entries.push(toSitemapEntry(`/${locale}/blog/tag/${tag.url}`, locale, tag.updatedAt))
    }

    for (const post of posts) {
      entries.push(
        toSitemapEntry(`/${locale}/${post.url}`, locale, post.publishedAt || post.updatedAt),
      )
    }
  }

  return entries
}
