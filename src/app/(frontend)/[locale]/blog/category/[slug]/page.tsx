import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import {
  buildPostSummary,
  estimateReadingTime,
  formatBlogDate,
  getCategoryHref,
  getTagHref,
  isPopulatedCategory,
  isPopulatedTag,
} from '@/lib/blog-frontend'
import { getLocalizedAlternates, isLocaleCode } from '@/lib/frontend'
import type { BlogPost, Category } from '@/payload-types'
import { getPayloadConfig } from '@/payload.config'

export const dynamic = 'force-dynamic'

async function getCategoryPageData(locale: 'de' | 'en', slug: string) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [categoryResult, postsResult] = await Promise.all([
    payload.find({
      collection: 'categories',
      depth: 0,
      limit: 1,
      where: {
        url: {
          equals: slug,
        },
      },
    }),
    payload.find({
      collection: 'blog-posts',
      depth: 2,
      fallbackLocale: 'de',
      limit: 100,
      locale,
      sort: '-publishedAt',
    }),
  ])

  return {
    category: (categoryResult.docs[0] as Category | undefined) ?? null,
    posts: (postsResult.docs as BlogPost[]).filter((post) => {
      if (!isPopulatedCategory(post.categories)) {
        return false
      }

      const categories = post.categories as Array<{ url: string }>
      return categories.some((category) => category.url === slug)
    }),
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

  return {
    alternates: getLocalizedAlternates(`blog/category/${slug}`),
    title: `Category: ${slug} | spacepc.de`,
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params

  if (!isLocaleCode(locale)) {
    notFound()
  }

  const { category, posts } = await getCategoryPageData(locale, slug)

  if (!category) {
    notFound()
  }

  return (
    <div className="site-shell">
      <main className="content-page blog-index">
        <section className="section content-page__hero">
          <p className="eyebrow">{locale === 'de' ? 'Kategorie' : 'Category'}</p>
          <h1>{category.title}</h1>
          {category.description ? <p className="content-page__lead">{category.description}</p> : null}
          <p className="content-page__lead">
            {locale === 'de' ? `${posts.length} Beitraege in dieser Kategorie.` : `${posts.length} posts in this category.`}
          </p>
          <Link className="button button--secondary" href={`/${locale}/blog`}>
            {locale === 'de' ? 'Zur Blog-Uebersicht' : 'Back to blog'}
          </Link>
        </section>

        <section className="section blog-list">
          {posts.map((post) => (
            <article className="blog-list-card" key={post.id}>
              <p className="story-meta">
                {formatBlogDate(post.publishedAt, locale)} / {estimateReadingTime(post.contentMarkdown || '', locale)}
              </p>
              <h2>
                <Link href={`/${locale}/${post.url}`}>{post.title}</Link>
              </h2>
              <p>{buildPostSummary(post)}</p>
              <div className="blog-card__taxonomy">
                {isPopulatedCategory(post.categories)
                  ? (post.categories as Array<{ id: number; title: string; url: string }>).map((linkedCategory) => (
                      <Link
                        className="tag-pill"
                        href={getCategoryHref(locale, linkedCategory.url)}
                        key={`cat-${linkedCategory.id}`}
                      >
                        {linkedCategory.title}
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
        </section>
      </main>
    </div>
  )
}
