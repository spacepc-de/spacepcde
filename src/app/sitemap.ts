import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'

import { SITE_URL, type LocaleCode } from '@/lib/frontend'
import { getPayloadConfig } from '@/payload.config'
import type { BlogPost, Category, Page, Tag } from '@/payload-types'

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
  collection: 'pages' | 'categories' | 'tags' | 'blog-posts',
  locale: LocaleCode,
  limit = 200,
  where?: Record<string, unknown>,
) {
  const payload = await getPayload({ config: await getPayloadConfig() })

  const result = await payload.find({
    collection,
    depth: 0,
    fallbackLocale: false,
    limit,
    locale,
    sort: 'url',
    ...(where ? { where } : {}),
  })

  return result.docs as unknown as T[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    entries.push(toSitemapEntry(`/${locale}`, locale))
    entries.push(toSitemapEntry(`/${locale}/blog`, locale))

    const [pages, categories, tags, posts] = await Promise.all([
      getLocalizedDocs<Page>('pages', locale),
      getLocalizedDocs<Category>('categories', locale),
      getLocalizedDocs<Tag>('tags', locale),
      getLocalizedDocs<BlogPost>('blog-posts', locale, 1000, {
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
