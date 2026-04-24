import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { PostComments } from '@/components/frontend/PostComments'
import {
  formatBlogDate,
  getCategoryHref,
  getFeaturedImage,
  getTagHref,
  isPopulatedCategory,
  isPopulatedTag,
} from '@/lib/blog-frontend'
import { getPayloadConfig } from '@/payload.config'
import {
  getFallbackFooterLinks,
  getFallbackNavItems,
  getLocalizedAlternates,
  isLocaleCode,
  mapLinks,
  type LocaleCode,
} from '@/lib/frontend'

export const dynamic = 'force-dynamic'

type FrontendPage = {
  contentMarkdown?: string | null
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
    url: string
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

function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n')
  const elements: React.ReactNode[] = []
  let paragraphBuffer: string[] = []
  let listBuffer: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let codeBuffer: string[] = []
  let inCodeBlock = false
  let blockquoteBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    elements.push(<p key={`p-${elements.length}`}>{paragraphBuffer.join(' ').trim()}</p>)
    paragraphBuffer = []
  }

  const flushList = () => {
    if (listBuffer.length === 0) return
    const Tag = listType === 'ol' ? 'ol' : 'ul'
    elements.push(
      <Tag key={`${listType ?? 'ul'}-${elements.length}`}>
        {listBuffer.map((item, index) => (
          <li key={`li-${elements.length}-${index}`}>{item}</li>
        ))}
      </Tag>,
    )
    listBuffer = []
    listType = null
  }

  const flushCodeBlock = () => {
    if (codeBuffer.length === 0) return
    elements.push(
      <pre className="content-page__code" key={`code-${elements.length}`}>
        <code>{codeBuffer.join('\n')}</code>
      </pre>,
    )
    codeBuffer = []
  }

  const flushBlockquote = () => {
    if (blockquoteBuffer.length === 0) return
    elements.push(
      <blockquote className="content-page__quote" key={`quote-${elements.length}`}>
        {blockquoteBuffer.map((line, index) => (
          <p key={`quote-line-${index}`}>{line}</p>
        ))}
      </blockquote>,
    )
    blockquoteBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      flushParagraph()
      flushList()
      flushBlockquote()
      if (inCodeBlock) {
        flushCodeBlock()
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine)
      continue
    }

    if (!line) {
      flushParagraph()
      flushList()
      flushBlockquote()
      continue
    }
    if (line.startsWith('# ')) {
      flushParagraph()
      flushList()
      flushBlockquote()
      elements.push(<h2 key={`h2-${elements.length}`}>{line.slice(2).trim()}</h2>)
      continue
    }
    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      flushBlockquote()
      elements.push(<h3 key={`h3-${elements.length}`}>{line.slice(3).trim()}</h3>)
      continue
    }
    if (line.startsWith('### ')) {
      flushParagraph()
      flushList()
      flushBlockquote()
      elements.push(<h4 key={`h4-${elements.length}`}>{line.slice(4).trim()}</h4>)
      continue
    }
    if (line.startsWith('> ')) {
      flushParagraph()
      flushList()
      blockquoteBuffer.push(line.slice(2).trim())
      continue
    }
    if (line.startsWith('- ')) {
      flushParagraph()
      flushBlockquote()
      if (listType && listType !== 'ul') {
        flushList()
      }
      listType = 'ul'
      listBuffer.push(line.slice(2).trim())
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      flushParagraph()
      flushBlockquote()
      if (listType && listType !== 'ol') {
        flushList()
      }
      listType = 'ol'
      listBuffer.push(line.replace(/^\d+\.\s/, '').trim())
      continue
    }
    flushBlockquote()
    paragraphBuffer.push(line)
  }

  flushParagraph()
  flushList()
  flushBlockquote()
  flushCodeBlock()

  return elements
}

async function getEntryBySlug(locale: LocaleCode, slug: string) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [pageResult, blogPostResult, navigationResult, footerResult] = await Promise.all([
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
      collection: 'navigation-links' as never,
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale,
      sort: 'order',
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
    navItems: mapLinks(
      locale,
      navigationResult.docs as Array<{ href: string; label: string; openInNewTab?: boolean | null }>,
      getFallbackNavItems(locale),
    ),
    entry: (() => {
      const page = pageResult.docs[0] as FrontendPage | undefined

      if (page) {
        return {
          kind: 'page',
          ...page,
        } satisfies FrontendEntry
      }

      if (post) {
        return {
          kind: 'post',
          ...post,
        } satisfies FrontendEntry
      }

      return null
    })(),
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

  const { entry } = await getEntryBySlug(locale, slug)

  if (!entry) {
    return {
      title: 'Page not found | spacepc.de',
    }
  }

  return {
    alternates: getLocalizedAlternates(slug),
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

  const { comments, entry, footerLinks, navItems } = await getEntryBySlug(locale, slug)

  if (!entry) {
    notFound()
  }

  const featuredImage = entry.kind === 'post' ? getFeaturedImage(entry) : null
  const productGroups =
    entry.kind === 'post' && Array.isArray(entry.productGroups)
      ? entry.productGroups.filter((group): group is NonNullable<FrontendBlogPost['productGroups']>[number] & { id: number; title: string; url: string; products: { id?: string | null; link: string; productName: string }[] } => typeof group === 'object' && group !== null)
      : []

  return (
    <div className="site-shell">
      <header className="site-header">
        <nav aria-label="Hauptnavigation" className="site-nav">
          <Link className="brand" href={`/${locale}`}>
            <span>spacepc</span>
            <span className="brand__dot">.</span>
            <span>de</span>
          </Link>

          <div className="site-nav__links">
            {navItems.map((item) => (
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

          <Link className="site-nav__cta" href={`/${locale}#kontakt`}>
            {locale === 'de' ? 'Anfrage senden' : 'Send request'}
          </Link>
        </nav>
      </header>

      <main className="content-page">
        <section className="section content-page__hero">
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
        </section>

        <section className="section content-page__layout">
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
                  renderMarkdown(entry.contentMarkdown)
                ) : (
                  <p>{locale === 'de' ? 'Diese Seite enthaelt noch keinen Inhalt.' : 'This page has no content yet.'}</p>
                )}
                {entry.kind === 'post' ? (
                  <div className="content-page__actions">
                    <Link className="button button--secondary" href={`/${locale}/blog`}>
                      {locale === 'de' ? 'Zur Blog-Uebersicht' : 'Back to blog'}
                    </Link>
                  </div>
                ) : null}
              </div>
            </article>
          </div>

          {entry.kind === 'post' ? (
            <aside className="content-page__sidebar">
              <div className="content-page__sidebar-card">
                <p className="eyebrow">{locale === 'de' ? 'IT Service' : 'IT Services'}</p>
                <h3>{locale === 'de' ? 'Unterstuetzung fuer Infrastruktur, Hosting und Betrieb' : 'Support for infrastructure, hosting, and operations'}</h3>
                <p>
                  {locale === 'de'
                    ? 'Wenn aus einem Artikel ein konkretes Problem, eine Migration oder ein Betriebs-Thema wird, ist spacepc.dev der direkte Weg zum passenden Service.'
                    : 'If a post turns into a concrete issue, migration, or operations task, spacepc.dev is the direct path to the related service.'}
                </p>
                <div className="content-page__sidebar-actions">
                  <a className="button button--primary" href="https://spacepc.dev" rel="noreferrer" target="_blank">
                    {locale === 'de' ? 'Zu spacepc.dev' : 'Open spacepc.dev'}
                  </a>
                  <a className="button button--secondary" href="mailto:hallo@spacepc.de">
                    hallo@spacepc.de
                  </a>
                </div>
              </div>

              {productGroups.length > 0 ? (
                <div className="content-page__sidebar-card">
                  <p className="eyebrow">{locale === 'de' ? 'Produktgruppen' : 'Product groups'}</p>
                  <div className="content-page__group-list">
                    {productGroups.map((group) => (
                      <div className="content-page__group" key={group.id}>
                        <h4>{group.title}</h4>
                        {group.products.length > 0 ? (
                          <ul>
                            {group.products.slice(0, 5).map((product) => (
                              <li key={`${group.id}-${product.id ?? product.productName}`}>
                                <a href={product.link} rel="noreferrer" target="_blank">
                                  {product.productName}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
                ? 'IT Service, Blog und technische Inhalte auf einer gemeinsamen Payload-Basis. Klar, direkt und ohne unnoetigen Ueberbau.'
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
