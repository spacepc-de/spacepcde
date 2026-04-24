import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { getLocalizedAlternates, isLocaleCode } from '@/lib/frontend'
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
import type { BlogPost, Tag } from '@/payload-types'
import { getPayloadConfig } from '@/payload.config'

export const dynamic = 'force-dynamic'

async function getTagPageData(locale: 'de' | 'en', slug: string) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [tagResult, postsResult] = await Promise.all([
    payload.find({
      collection: 'tags',
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
      where: {
        status: {
          equals: 'published',
        },
      },
    }),
  ])

  return {
    posts: (postsResult.docs as BlogPost[]).filter((post) => {
      if (!isPopulatedTag(post.tags)) {
        return false
      }

      const tags = post.tags as Array<{ url: string }>
      return tags.some((tag) => tag.url === slug)
    }),
    tag: (tagResult.docs[0] as Tag | undefined) ?? null,
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
    alternates: getLocalizedAlternates(`blog/tag/${slug}`),
    title: `Tag: ${slug} | spacepc.de`,
  }
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params

  if (!isLocaleCode(locale)) {
    notFound()
  }

  const { posts, tag } = await getTagPageData(locale, slug)

  if (!tag) {
    notFound()
  }

  return (
    <div className="site-shell">
      <main className="content-page blog-index">
        <section className="section content-page__hero">
          <p className="eyebrow">Tag</p>
          <h1>#{tag.title}</h1>
          <p className="content-page__lead">
            {locale === 'de' ? `${posts.length} Beitraege mit diesem Tag.` : `${posts.length} posts with this tag.`}
          </p>
          <Link className="button button--secondary" href={`/${locale}/blog`}>
            {locale === 'de' ? 'Zur Blog-Uebersicht' : 'Back to blog'}
          </Link>
        </section>

        <section className="section blog-list">
          {posts.map((post) => (
            <article className="blog-list-card" key={post.id}>
              {getFeaturedImage(post) ? (
                <img
                  alt={getFeaturedImage(post)?.alt || post.title}
                  className="card-preview card-preview--list"
                  src={getFeaturedImage(post)?.url || ''}
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
                  ? (post.tags as Array<{ id: number; title: string; url: string }>).map((linkedTag) => (
                      <Link className="tag-pill tag-pill--neutral" href={getTagHref(locale, linkedTag.url)} key={`tag-${linkedTag.id}`}>
                        #{linkedTag.title}
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
