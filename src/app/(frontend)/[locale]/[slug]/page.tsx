import React, { cache } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { FeaturedPostImage } from '@/components/frontend/FeaturedPostImage'
import { FrontendHeader } from '@/components/frontend/FrontendHeader'
import { PostComments } from '@/components/frontend/PostComments'
import {
  buildPostSummary,
  formatBlogDate,
  getCategoryHref,
  getFeaturedImage,
  getTagHref,
  isPopulatedCategory,
  isPopulatedTag,
} from '@/lib/blog-frontend'
import { getApprovedCommentsForPost } from '@/lib/comments'
import { getPayloadConfig } from '@/payload.config'
import {
  getExactLocalizedAlternates,
  getFallbackFooterLinks,
  getFallbackNavItems,
  isLocaleCode,
  mapLinks,
  SITE_URL,
  type LocaleCode,
} from '@/lib/frontend'
import { renderMarkdownToHtml } from '@/lib/markdown'
import { getAmazonProducts, searchAmazonProducts, type AmazonProduct } from '@/lib/amazonProducts'

export const revalidate = 21600
const RELATED_POST_LIMIT = 4
const RELATED_CATEGORY_WEIGHT = 4
const RELATED_TAG_WEIGHT = 3

function getRelationIds(
  value: FrontendBlogPost['categories'] | FrontendBlogPost['tags'],
) {
  if (!Array.isArray(value)) {
    return []
  }

  const ids = new Set<number>()

  for (const relation of value) {
    if (typeof relation === 'number') {
      ids.add(relation)
      continue
    }

    if (typeof relation === 'object' && relation !== null && typeof relation.id === 'number') {
      ids.add(relation.id)
    }
  }

  return [...ids]
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return 0
  }

  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function normalizeSeoText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  const shortened = normalized.slice(0, maxLength + 1)
  const lastSpace = shortened.lastIndexOf(' ')

  if (lastSpace >= Math.floor(maxLength * 0.7)) {
    return shortened.slice(0, lastSpace).trim()
  }

  return normalized.slice(0, maxLength).trim()
}

function buildEntryDescription(entry: FrontendEntry, locale: LocaleCode) {
  if (entry.seoDescription?.trim()) {
    return entry.seoDescription.trim()
  }

  if (entry.kind === 'post') {
    if (entry.excerpt?.trim()) {
      return normalizeSeoText(entry.excerpt, 155)
    }

    if (entry.contentMarkdown?.trim()) {
      return normalizeSeoText(entry.contentMarkdown.replace(/[#>*_`[\]\-]+/g, ' '), 155)
    }

    return locale === 'de' ? `${entry.title} auf spacepc.de lesen.` : `Read ${entry.title} on spacepc.de.`
  }

  if (entry.contentMarkdown?.trim()) {
    return normalizeSeoText(entry.contentMarkdown.replace(/[#>*_`[\]\-]+/g, ' '), 155)
  }

  return locale === 'de' ? `${entry.title} auf spacepc.de.` : `${entry.title} on spacepc.de.`
}

function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString()
}

function getTargetLocale(locale: LocaleCode): LocaleCode {
  return locale === 'de' ? 'en' : 'de'
}

type FrontendPage = {
  contentMarkdown?: string | null
  id: number
  isLegalPage?: boolean | null
  seoDescription?: string | null
  seoTitle?: string | null
  title: string
  url: string
}

type FrontendBlogPost = {
  author?:
    | {
        name: string
        url: string
      }
    | number
    | null
  categories?: Array<{ id: number; title: string; url: string } | number> | null
  contentMarkdown?: string | null
  excerpt?: string | null
  featuredImage?:
    | {
        alt?: string | null
        height?: number | null
        url?: string | null
        width?: number | null
      }
    | number
    | null
  publishedAt?: string | null
  productGroups?: Array<{
    amazonAsins?: string | null
    amazonKeyword?: string | null
    amazonProductLimit?: number | null
    id: number
    products?: Array<{
      id?: string | null
      link: string
      productName: string
    }> | null
    title: string
  } | number> | null
  seoDescription?: string | null
  seoTitle?: string | null
  tags?: Array<{ id: number; title: string; url: string } | number> | null
  title: string
  url: string
  id: number
}

type FrontendEntry =
  | ({ kind: 'page' } & FrontendPage)
  | ({ kind: 'post' } & FrontendBlogPost)

type SidebarProduct = {
  image?: AmazonProduct['image']
  key: string
  link: string
  meta?: string
  productName: string
}

async function getRelatedPosts(
  payload: Awaited<ReturnType<typeof getPayload>>,
  locale: LocaleCode,
  post: FrontendBlogPost,
) {
  const sourceCategoryIds = new Set(getRelationIds(post.categories))
  const sourceTagIds = new Set(getRelationIds(post.tags))

  const taxonomyMatches = [
    ...Array.from(sourceCategoryIds).map((id) => ({
      categories: {
        equals: id,
      },
    })),
    ...Array.from(sourceTagIds).map((id) => ({
      tags: {
        equals: id,
      },
    })),
  ]

  if (taxonomyMatches.length === 0) {
    return []
  }

  const relatedResult = await payload.find({
    collection: 'blog-posts' as never,
    depth: 2,
    fallbackLocale: 'de',
    limit: 36,
    locale,
    sort: '-publishedAt',
    where: {
      and: [
        {
          status: {
            equals: 'published',
          },
        },
        {
          or: taxonomyMatches,
        },
      ],
    } as never,
  })

  return (relatedResult.docs as FrontendBlogPost[])
    .filter((candidate) => candidate.id !== post.id && candidate.url && candidate.title)
    .map((candidate) => {
      const sharedCategories = getRelationIds(candidate.categories).filter((id) =>
        sourceCategoryIds.has(id),
      ).length
      const sharedTags = getRelationIds(candidate.tags).filter((id) => sourceTagIds.has(id)).length
      const score = sharedCategories * RELATED_CATEGORY_WEIGHT + sharedTags * RELATED_TAG_WEIGHT

      return {
        ...candidate,
        score,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || toTimestamp(b.publishedAt) - toTimestamp(a.publishedAt))
    .slice(0, RELATED_POST_LIMIT)
}

function parseAmazonAsins(value: string | null | undefined) {
  if (!value) {
    return []
  }

  return value
    .split(/[\s,;]+/)
    .map((asin) => asin.trim().toUpperCase())
    .filter(Boolean)
}

async function getAmazonSidebarProducts(
  productGroups: Array<NonNullable<FrontendBlogPost['productGroups']>[number] & {
    amazonAsins?: string | null
    amazonKeyword?: string | null
    amazonProductLimit?: number | null
    id: number
  }>,
) {
  const productResponses = await Promise.all(
    productGroups.map(async (group) => {
      const itemCount = Math.min(Math.max(group.amazonProductLimit ?? 4, 1), 8)
      const asins = parseAmazonAsins(group.amazonAsins)

      try {
        if (asins.length > 0) {
          return await getAmazonProducts({
            asins: asins.slice(0, itemCount),
            includeOffers: false,
          })
        }

        if (group.amazonKeyword?.trim()) {
          return await searchAmazonProducts({
            includeOffers: false,
            itemCount,
            keyword: group.amazonKeyword,
          })
        }
      } catch (error) {
        console.error('Amazon-Produkte konnten nicht geladen werden.', error)
      }

      return null
    }),
  )

  const products: SidebarProduct[] = []
  const seenAsins = new Set<string>()

  for (const response of productResponses) {
    for (const product of response?.items ?? []) {
      if (seenAsins.has(product.asin) || !product.detailPageUrl || !product.title) {
        continue
      }

      seenAsins.add(product.asin)
      products.push({
        image: product.image,
        key: `amazon-${product.asin}`,
        link: product.detailPageUrl,
        meta: 'Amazon',
        productName: product.title,
      })
    }
  }

  return products
}

const getEntryBySlug = cache(async (locale: LocaleCode, slug: string) => {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [pageResult, blogPostResult, footerResult, navigationResult] = await Promise.all([
    payload.find({
      collection: 'pages' as never,
      depth: 0,
      fallbackLocale: false,
      limit: 1,
      locale,
      sort: '-createdAt',
      where: {
        url: {
          equals: slug,
        },
      },
    }),
    payload.find({
      collection: 'blog-posts' as never,
      depth: 2,
      fallbackLocale: false,
      limit: 1,
      locale,
      sort: '-publishedAt',
      where: {
        and: [
          {
            url: {
              equals: slug,
            },
          },
          {
            status: {
              equals: 'published',
            },
          },
        ],
      },
    }),
    payload.find({
      collection: 'footer-links' as never,
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale,
      sort: 'order',
    }),
    payload.find({
      collection: 'navigation-links' as never,
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale,
      sort: 'order',
    }),
  ])

  const post = blogPostResult.docs[0] as FrontendBlogPost | undefined
  const page = pageResult.docs[0] as FrontendPage | undefined
  const entry = page
    ? ({
        kind: 'page',
        ...page,
      } satisfies FrontendEntry)
    : post
      ? ({
          kind: 'post',
          ...post,
        } satisfies FrontendEntry)
      : null

  const targetLocale = getTargetLocale(locale)
  let localizedEntryPath: string | undefined
  let localeSwitchHref = `/${targetLocale}`

  if (entry) {
    const localizedEntry =
      entry.kind === 'page'
        ? ((await payload.findByID({
            collection: 'pages' as never,
            depth: 0,
            fallbackLocale: false,
            id: entry.id as never,
            locale: targetLocale,
          }).catch((): null => null)) as (FrontendPage & { id: number }) | null)
        : ((await payload.findByID({
            collection: 'blog-posts' as never,
            depth: 0,
            fallbackLocale: false,
            id: entry.id as never,
            locale: targetLocale,
          }).catch((): null => null)) as (FrontendBlogPost & { id: number }) | null)

    if (localizedEntry?.url) {
      localizedEntryPath = `/${targetLocale}/${localizedEntry.url}`
      localeSwitchHref = localizedEntryPath
    } else {
      localeSwitchHref = entry.kind === 'post' ? `/${targetLocale}/blog` : `/${targetLocale}`
    }
  }

  return {
    footerLinks: mapLinks(
      locale,
      footerResult.docs as Array<{ href: string; label: string; openInNewTab?: boolean | null }>,
      getFallbackFooterLinks(locale),
    ),
    entry,
    localizedEntryPath,
    localeSwitchHref,
    navItems: mapLinks(
      locale,
      navigationResult.docs as Array<{
        children?: Array<{ href: string; label: string; openInNewTab?: boolean | null }> | null
        href: string
        label: string
        openInNewTab?: boolean | null
      }>,
      getFallbackNavItems(locale),
    ),
  }
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params

  if (!isLocaleCode(locale)) {
    return {}
  }

  const { entry, localizedEntryPath } = await getEntryBySlug(locale, slug)

  if (!entry) {
    return {
      title: locale === 'de' ? 'Seite nicht gefunden | spacepc.de' : 'Page not found | spacepc.de',
    }
  }

  const title = entry.seoTitle || `${entry.title} | spacepc.de`
  const description = buildEntryDescription(entry, locale)
  const path = `/${locale}/${entry.url}`
  const featuredImage = entry.kind === 'post' ? getFeaturedImage(entry) : null

  return {
    alternates: getExactLocalizedAlternates(locale, {
      de: locale === 'de' ? `/${locale}/${entry.url}` : localizedEntryPath,
      en: locale === 'en' ? `/${locale}/${entry.url}` : localizedEntryPath,
    }),
    description,
    openGraph: {
      description,
      images: featuredImage?.url ? [{ alt: featuredImage.alt || entry.title, url: featuredImage.url }] : undefined,
      locale,
      publishedTime: entry.kind === 'post' ? entry.publishedAt || undefined : undefined,
      siteName: 'spacepc.de',
      title,
      type: entry.kind === 'post' ? 'article' : 'website',
      url: path,
    },
    title,
    twitter: {
      card: featuredImage?.url ? 'summary_large_image' : 'summary',
      description,
      images: featuredImage?.url ? [featuredImage.url] : undefined,
      title,
    },
  }
}

export default async function LocalizedStaticPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params

  if (!isLocaleCode(locale)) {
    notFound()
  }

  const { entry, footerLinks, localeSwitchHref, navItems } = await getEntryBySlug(locale, slug)

  if (!entry) {
    notFound()
  }

  const payload = await getPayload({ config: await getPayloadConfig() })
  const comments = entry.kind === 'post' ? await getApprovedCommentsForPost(payload, entry.id) : []
  const relatedPosts = entry.kind === 'post' ? await getRelatedPosts(payload, locale, entry) : []

  const featuredImage = entry.kind === 'post' ? getFeaturedImage(entry) : null
  const entryPath = `/${locale}/${entry.url}`
  const articleJsonLd =
    entry.kind === 'post'
      ? {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          author:
            entry.author && typeof entry.author !== 'number'
              ? {
                  '@type': 'Person',
                  name: entry.author.name,
                  url: absoluteUrl(`/${locale}/${entry.author.url}`),
                }
              : undefined,
          dateModified: entry.publishedAt || undefined,
          datePublished: entry.publishedAt || undefined,
          description: buildEntryDescription(entry, locale),
          headline: entry.title,
          image: featuredImage?.url ? absoluteUrl(featuredImage.url) : undefined,
          inLanguage: locale,
          mainEntityOfPage: absoluteUrl(entryPath),
          publisher: {
            '@type': 'Organization',
            name: 'spacepc.de',
            url: SITE_URL,
          },
          url: absoluteUrl(entryPath),
        }
      : null
  const productGroups =
    entry.kind === 'post' && Array.isArray(entry.productGroups)
      ? entry.productGroups.filter((group): group is NonNullable<FrontendBlogPost['productGroups']>[number] & { id: number; title: string; products: { id?: string | null; link: string; productName: string }[] } => typeof group === 'object' && group !== null)
      : []
  const manualProducts: SidebarProduct[] = productGroups.flatMap((group) =>
    (group.products ?? []).map((product) => ({
      ...product,
      key: `${group.id}-${product.id ?? product.productName}`,
    })),
  )
  const amazonProducts = await getAmazonSidebarProducts(productGroups)
  const products = [...manualProducts, ...amazonProducts]
  const relatedPostsSection =
    entry.kind === 'post' && relatedPosts.length > 0 ? (
      <section className="related-posts section">
        <div className="section-heading related-posts__heading">
          <p className="eyebrow">{locale === 'de' ? 'Empfohlen' : 'Recommended'}</p>
          <h2>{locale === 'de' ? 'Ähnliche Beiträge' : 'Related posts'}</h2>
        </div>

        <div className="blog-list related-posts__list">
          {relatedPosts.map((relatedPost) => (
            <article className="blog-list-card related-posts__card" key={relatedPost.id}>
              {getFeaturedImage(relatedPost) ? (
                <FeaturedPostImage
                  className="card-preview card-preview--list"
                  post={relatedPost}
                  sizes="(max-width: 900px) 100vw, 66vw"
                />
              ) : null}
              <p className="story-meta">{formatBlogDate(relatedPost.publishedAt, locale)}</p>
              <h2>
                <Link href={`/${locale}/${relatedPost.url}`}>{relatedPost.title}</Link>
              </h2>
              <p>{buildPostSummary(relatedPost)}</p>
              <div className="blog-card__taxonomy">
                {isPopulatedCategory(relatedPost.categories)
                  ? relatedPost.categories.slice(0, 2).map((category) => (
                      <Link className="tag-pill" href={getCategoryHref(locale, category.url)} key={`cat-${relatedPost.id}-${category.id}`}>
                        {category.title}
                      </Link>
                    ))
                  : null}
                {isPopulatedTag(relatedPost.tags)
                  ? relatedPost.tags.slice(0, 2).map((tag) => (
                      <Link className="tag-pill tag-pill--neutral" href={getTagHref(locale, tag.url)} key={`tag-${relatedPost.id}-${tag.id}`}>
                        #{tag.title}
                      </Link>
                    ))
                  : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    ) : null

  return (
    <div className="site-shell">
      <FrontendHeader
        currentPath={`/${locale}/${entry.url}`}
        locale={locale}
        localeSwitchHref={localeSwitchHref}
        navItems={navItems}
      />

      {articleJsonLd ? (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
          type="application/ld+json"
        />
      ) : null}

      <main className="content-page">
        <section className="section content-page__layout">
          <div className="content-page__hero">
            <p className="eyebrow">
              {entry.kind === 'post'
                ? locale === 'de'
                  ? 'Blog'
                  : 'Blog'
                : entry.isLegalPage
                  ? locale === 'de'
                    ? 'Rechtliches'
                    : 'Legal'
                  : locale === 'de'
                    ? 'Seite'
                    : 'Page'}
            </p>
            <h1>{entry.title}</h1>
            {entry.kind === 'post' ? (
              <div className="content-page__post-meta">
                <p className="story-meta content-page__meta">{formatBlogDate(entry.publishedAt, locale)}</p>
                {entry.author && typeof entry.author !== 'number' ? (
                  <p className="content-page__author">
                    {locale === 'de' ? 'Von' : 'By'} {entry.author.name}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="content-page__main">
            <article className="content-page__card">
              {featuredImage ? (
                <div className="content-page__image-wrap">
                  <FeaturedPostImage
                    className="content-page__image"
                    post={entry}
                    priority
                    sizes="(max-width: 900px) 100vw, 70vw"
                  />
                </div>
              ) : null}
              <div className="content-page__body content-page__body--prose">
                {entry.kind === 'post' && (isPopulatedCategory(entry.categories) || isPopulatedTag(entry.tags)) ? (
                  <div className="blog-card__taxonomy blog-card__taxonomy--spacious">
                    {isPopulatedCategory(entry.categories)
                      ? entry.categories.map((category) => (
                          <Link className="tag-pill" href={getCategoryHref(locale, category.url)} key={`cat-${category.id}`}>
                            {category.title}
                          </Link>
                        ))
                      : null}
                    {isPopulatedTag(entry.tags)
                      ? entry.tags.map((tag) => (
                          <Link className="tag-pill tag-pill--neutral" href={getTagHref(locale, tag.url)} key={`tag-${tag.id}`}>
                            #{tag.title}
                          </Link>
                        ))
                      : null}
                  </div>
                ) : null}
                {entry.contentMarkdown?.trim() ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(entry.contentMarkdown) }}
                  />
                ) : (
                  <p>{locale === 'de' ? 'Diese Seite enthält noch keinen Inhalt.' : 'This page has no content yet.'}</p>
                )}
                {entry.kind === 'post' ? (
                  <div className="content-page__actions">
                    <Link className="button button--secondary" href={`/${locale}/blog`}>
                      {locale === 'de' ? 'Zur Blog-Übersicht' : 'Back to blog'}
                    </Link>
                  </div>
                ) : null}
              </div>
            </article>
          </div>

          {entry.kind === 'post' ? (
            <aside className="content-page__sidebar">
              {products.length > 0 ? (
                <div className="content-page__sidebar-card content-page__sidebar-card--products">
                  <p className="eyebrow">{locale === 'de' ? 'Produkte' : 'Products'}</p>
                  <h3>{locale === 'de' ? 'Passende Produkte zum Beitrag' : 'Relevant products for this post'}</h3>
                  <p className="content-page__sidebar-note">
                    {locale === 'de'
                      ? 'Als Amazon-Partner verdiene ich an qualifizierten Verkäufen.'
                      : 'As an Amazon Associate I earn from qualifying purchases.'}
                  </p>
                  <ul className="content-page__product-list">
                    {products.slice(0, 8).map((product) => (
                      <li key={product.key}>
                        <a href={product.link} rel="noreferrer" target="_blank">
                          {product.image ? (
                            <span className="content-page__product-image">
                              <Image
                                alt=""
                                height={product.image.height ?? 64}
                                src={product.image.url}
                                unoptimized
                                width={product.image.width ?? 64}
                              />
                            </span>
                          ) : null}
                          <span className="content-page__product-content">
                            <span>{product.productName}</span>
                            {product.meta ? (
                              <small>{product.meta}</small>
                            ) : null}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="content-page__sidebar-card">
                <p className="eyebrow">{locale === 'de' ? 'IT Service' : 'IT Services'}</p>
                <h3>{locale === 'de' ? 'Unterstützung für Linux, Docker & Infrastruktur' : 'Support for Linux, Docker, and infrastructure'}</h3>
                <p>
                  {locale === 'de'
                    ? 'Problem beim Setup oder Betrieb? Schreib mir.'
                    : 'If a post turns into a concrete issue, migration, or operations task, spacepc.dev is the direct path to the related service.'}
                </p>
                <div className="content-page__sidebar-actions">
                  <a className="button button--primary button--service" href="https://spacepc.dev" rel="noreferrer" target="_blank">
                    {locale === 'de' ? 'Support anfragen' : 'Request support'}
                  </a>
                  <a className="button button--secondary" href="mailto:hello@spacepc.dev">
                    hello@spacepc.dev
                  </a>
                </div>
              </div>
            </aside>
          ) : null}
        </section>

        {entry.kind === 'post' && comments.length === 0 ? relatedPostsSection : null}

        {entry.kind === 'post' ? (
          <PostComments initialComments={comments} locale={locale} postId={entry.id} />
        ) : null}

        {entry.kind === 'post' && comments.length > 0 ? relatedPostsSection : null}
      </main>

      <footer className="site-footer">
        <div className="site-footer__content">
          <div className="site-footer__brand">
            <h3 className="site-footer__logo">
              <span>spacepc</span>
              <span className="brand__dot">.</span>
              <span>de</span>
            </h3>
            <p>
              {locale === 'de'
                ? 'IT Service, Blog und technische Inhalte auf einer gemeinsamen Payload-Basis. Klar, direkt und ohne unnötigen Überbau.'
                : 'IT service, blog, and technical content on one shared Payload base. Clear, direct, and without unnecessary overhead.'}
            </p>
          </div>

          <div className="site-footer__links">
            {footerLinks.map((item) => (
              <a
                href={item.href}
                key={`${item.label}-${item.href}`}
                rel={item.openInNewTab ? 'noreferrer' : undefined}
                target={item.openInNewTab ? '_blank' : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
