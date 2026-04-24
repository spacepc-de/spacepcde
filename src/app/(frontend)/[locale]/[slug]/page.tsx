import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { FrontendHeader } from '@/components/frontend/FrontendHeader'
import { PostComments } from '@/components/frontend/PostComments'
import {
  formatBlogDate,
  getCategoryHref,
  getFeaturedImage,
  getTagHref,
  isPopulatedCategory,
  isPopulatedTag,
} from '@/lib/blog-frontend'
import { renderMarkdownToHtml } from '@/lib/markdown'
import { getPayloadConfig } from '@/payload.config'
import {
  getExactLocalizedAlternates,
  getFallbackFooterLinks,
  isLocaleCode,
  mapLinks,
  type LocaleCode,
} from '@/lib/frontend'

export const revalidate = 21600

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
        url?: string | null
      }
    | number
    | null
  publishedAt?: string | null
  productGroups?: Array<{
    id: number
    products: Array<{
      id?: string | null
      link: string
      productName: string
    }>
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

type FrontendComment = {
  authorName: string
  content: string
  createdAt: string
  id: number
  parent?: number | { id: number } | null
}

async function getEntryBySlug(locale: LocaleCode, slug: string) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [pageResult, blogPostResult, footerResult] = await Promise.all([
    payload.find({
      collection: 'pages' as never,
      depth: 0,
      fallbackLocale: 'de',
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
      fallbackLocale: 'de',
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
      localeSwitchHref =
        entry.kind === 'post' ? `/${targetLocale}/${localizedEntry.url}` : `/${targetLocale}/${localizedEntry.url}`
    } else {
      localeSwitchHref = entry.kind === 'post' ? `/${targetLocale}/blog` : `/${targetLocale}`
    }
  }

  const commentsResult =
    post?.id
      ? await payload.find({
          collection: 'comments' as never,
          depth: 1,
          limit: 100,
          sort: 'createdAt',
          where: {
            and: [
              {
                approved: {
                  equals: true,
                },
              },
              {
                post: {
                  equals: post.id,
                },
              },
            ],
          },
        })
      : null

  return {
    comments: ((commentsResult?.docs ?? []) as FrontendComment[]).map(
      (comment): { authorName: string; content: string; createdAt: string; id: number; parent?: number | null } => ({
        authorName: comment.authorName,
        content: comment.content,
        createdAt: comment.createdAt,
        id: comment.id,
        parent:
          typeof comment.parent === 'object' && comment.parent
            ? (comment.parent as { id: number }).id
            : ((comment.parent as number | null | undefined) ?? null),
      }),
    ),
    footerLinks: mapLinks(
      locale,
      footerResult.docs as Array<{ href: string; label: string; openInNewTab?: boolean | null }>,
      getFallbackFooterLinks(locale),
    ),
    entry,
    localeSwitchHref,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params

  if (!isLocaleCode(locale)) {
    return {}
  }

  const { entry, localeSwitchHref } = await getEntryBySlug(locale, slug)

  if (!entry) {
    return {
      title: 'Page not found | spacepc.de',
    }
  }

  return {
    alternates: getExactLocalizedAlternates(locale, {
      de: locale === 'de' ? `/${locale}/${entry.url}` : localeSwitchHref,
      en: locale === 'en' ? `/${locale}/${entry.url}` : localeSwitchHref,
    }),
    description:
      entry.seoDescription ||
      (locale === 'de' ? `${entry.title} auf spacepc.de` : `${entry.title} on spacepc.de`),
    title: entry.seoTitle || `${entry.title} | spacepc.de`,
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

  const { comments, entry, footerLinks, localeSwitchHref } = await getEntryBySlug(locale, slug)

  if (!entry) {
    notFound()
  }

  const featuredImage = entry.kind === 'post' ? getFeaturedImage(entry) : null
  const productGroups =
    entry.kind === 'post' && Array.isArray(entry.productGroups)
      ? entry.productGroups.filter((group): group is NonNullable<FrontendBlogPost['productGroups']>[number] & { id: number; title: string; products: { id?: string | null; link: string; productName: string }[] } => typeof group === 'object' && group !== null)
      : []
  const products = productGroups.flatMap((group) =>
    group.products.map((product) => ({
      ...product,
      key: `${group.id}-${product.id ?? product.productName}`,
    })),
  )

  return (
    <div className="site-shell">
      <FrontendHeader
        currentPath={`/${locale}/${entry.url}`}
        locale={locale}
        localeSwitchHref={localeSwitchHref}
      />

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
                  <img
                    alt={featuredImage.alt}
                    className="content-page__image"
                    loading="eager"
                    src={featuredImage.url}
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
                      ? 'Einige Links in diesem Bereich können Affiliate-Links sein.'
                      : 'Some links in this section may be affiliate links.'}
                  </p>
                  <ul className="content-page__product-list">
                    {products.slice(0, 8).map((product) => (
                      <li key={product.key}>
                        <a href={product.link} rel="noreferrer" target="_blank">
                          {product.productName}
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

        {entry.kind === 'post' ? <PostComments comments={comments} locale={locale} postId={entry.id} /> : null}
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
