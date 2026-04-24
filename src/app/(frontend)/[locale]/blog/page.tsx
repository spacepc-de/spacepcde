import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { FeaturedPostImage } from '@/components/frontend/FeaturedPostImage'
import { FrontendHeader } from '@/components/frontend/FrontendHeader'
import {
  buildPostSummary,
  estimateReadingTime,
  formatBlogDate,
  getCategoryHref,
  getFeaturedImage,
  getTagHref,
  isPopulatedCategory,
  isPopulatedTag,
} from '@/lib/blog-frontend'
import { getFallbackFooterLinks, getLocalizedAlternates, isLocaleCode, mapLinks } from '@/lib/frontend'
import type { BlogPost, Category, FooterLink, Tag } from '@/payload-types'
import { getPayloadConfig } from '@/payload.config'

export const revalidate = 3600

async function getBlogIndexData(locale: 'de' | 'en') {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [footerResult, postsResult, categoriesResult, tagsResult] = await Promise.all([
    payload.find({
      collection: 'footer-links',
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale,
      sort: 'order',
    }),
    payload.find({
      collection: 'blog-posts',
      depth: 2,
      fallbackLocale: 'de',
      limit: 24,
      locale,
      sort: '-publishedAt',
      where: {
        status: {
          equals: 'published',
        },
      },
    }),
    payload.find({
      collection: 'categories',
      depth: 0,
      limit: 20,
      sort: 'title',
    }),
    payload.find({
      collection: 'tags',
      depth: 0,
      limit: 30,
      sort: 'title',
    }),
  ])

  return {
    categories: categoriesResult.docs as Category[],
    footerLinks: (footerResult.docs as FooterLink[]).length
      ? mapLinks(locale, footerResult.docs as FooterLink[], getFallbackFooterLinks(locale))
      : getFallbackFooterLinks(locale),
    posts: postsResult.docs as BlogPost[],
    tags: tagsResult.docs as Tag[],
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  if (!isLocaleCode(locale)) {
    return {}
  }

  return {
    alternates: getLocalizedAlternates(locale, 'blog'),
    description:
      locale === 'de'
        ? 'Blog-Archiv mit technischen Artikeln, Kategorien und Tags auf spacepc.de.'
        : 'Blog archive with technical posts, categories, and tags on spacepc.de.',
    title: locale === 'de' ? 'Blog | spacepc.de' : 'Blog | spacepc.de',
  }
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!isLocaleCode(locale)) {
    notFound()
  }

  const { categories, footerLinks, posts, tags } = await getBlogIndexData(locale)

  return (
    <div className="site-shell">
      <FrontendHeader
        currentPath={`/${locale}/blog`}
        locale={locale}
      />

      <main className="content-page blog-index">
        <section className="section content-page__hero">
          <p className="eyebrow">Blog</p>
          <h1>{locale === 'de' ? 'Technische Artikel, sauber sortiert.' : 'Technical writing, neatly organised.'}</h1>
          <p className="content-page__lead">
            {locale === 'de'
              ? 'Alle Beiträge mit direktem Zugriff auf Kategorien und Tags.'
              : 'All posts with direct access to categories and tags.'}
          </p>
        </section>

        <section className="section blog-layout">
          <div className="blog-list">
            {posts.map((post) => (
              <article className="blog-list-card" key={post.id}>
                {getFeaturedImage(post) ? (
                  <FeaturedPostImage
                    className="card-preview card-preview--list"
                    post={post}
                    sizes="(max-width: 900px) 100vw, 66vw"
                  />
                ) : null}
                <p className="story-meta">
                  {formatBlogDate(post.publishedAt, locale)} / {estimateReadingTime(post.contentMarkdown || '', locale)}
                </p>
                <h2>
                  <Link href={`/${locale}/${post.url}`}>{post.title}</Link>
                </h2>
                <p>{buildPostSummary(post)}</p>

                <div className="blog-card__taxonomy">
                  {isPopulatedCategory(post.categories)
                    ? (post.categories as Array<{ id: number; title: string; url: string }>).map((category) => (
                        <Link className="tag-pill" href={getCategoryHref(locale, category.url)} key={`cat-${category.id}`}>
                          {category.title}
                        </Link>
                      ))
                    : null}
                  {isPopulatedTag(post.tags)
                    ? (post.tags as Array<{ id: number; title: string; url: string }>).map((tag) => (
                        <Link className="tag-pill tag-pill--neutral" href={getTagHref(locale, tag.url)} key={`tag-${tag.id}`}>
                          #{tag.title}
                        </Link>
                      ))
                    : null}
                </div>
              </article>
            ))}
          </div>

          <aside className="blog-sidebar">
            <section className="blog-sidebar__section">
              <p className="eyebrow">{locale === 'de' ? 'Kategorien' : 'Categories'}</p>
              <div className="blog-sidebar__tags">
                {categories.map((category) => (
                  <Link className="tag-pill" href={getCategoryHref(locale, category.url)} key={category.id}>
                    {category.title}
                  </Link>
                ))}
              </div>
            </section>

            <section className="blog-sidebar__section">
              <p className="eyebrow">Tags</p>
              <div className="blog-sidebar__tags">
                {tags.map((tag) => (
                  <Link className="tag-pill tag-pill--neutral" href={getTagHref(locale, tag.url)} key={tag.id}>
                    #{tag.title}
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>
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
