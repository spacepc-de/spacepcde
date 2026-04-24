import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { FeaturedPostImage } from '@/components/frontend/FeaturedPostImage'
import { FrontendHeader } from '@/components/frontend/FrontendHeader'
import { getExactLocalizedAlternates, isLocaleCode } from '@/lib/frontend'
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

export const revalidate = 3600

function getTargetLocale(locale: 'de' | 'en') {
  return locale === 'de' ? 'en' : 'de'
}

async function getPublishedPostsForTag(
  payload: Awaited<ReturnType<typeof getPayload>>,
  locale: 'de' | 'en',
  tagId: number,
) {
  const posts: BlogPost[] = []
  let page = 1
  let hasNextPage = true

  while (hasNextPage) {
    const result = await payload.find({
      collection: 'blog-posts',
      depth: 2,
      fallbackLocale: 'de',
      limit: 100,
      locale,
      page,
      sort: '-publishedAt',
      where: {
        and: [
          {
            status: {
              equals: 'published',
            },
          },
          {
            tags: {
              equals: tagId,
            },
          },
        ],
      },
    })

    posts.push(...(result.docs as BlogPost[]))
    hasNextPage = result.hasNextPage
    page += 1
  }

  return posts
}

async function getTagPageData(locale: 'de' | 'en', slug: string) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const tagResult = await payload.find({
    collection: 'tags',
    depth: 0,
    fallbackLocale: 'de',
    limit: 1,
    locale,
    where: {
      url: {
        equals: slug,
      },
    },
  })

  const tag = (tagResult.docs[0] as Tag | undefined) ?? null
  const targetLocale = getTargetLocale(locale)
  const localizedTag = tag
    ? ((await payload.findByID({
        collection: 'tags',
        depth: 0,
        fallbackLocale: false,
        id: tag.id,
        locale: targetLocale,
      }).catch((): null => null)) as Tag | null)
    : null
  const posts = tag ? await getPublishedPostsForTag(payload, locale, tag.id) : []

  return {
    localeSwitchHref: localizedTag?.url ? `/${targetLocale}/blog/tag/${localizedTag.url}` : `/${targetLocale}/blog`,
    posts,
    tag,
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

  const { localeSwitchHref, tag } = await getTagPageData(locale, slug)

  if (!tag) {
    return {}
  }

  const currentPath = `/${locale}/blog/tag/${tag.url}`

  return {
    alternates: getExactLocalizedAlternates(locale, {
      de: locale === 'de' ? currentPath : localeSwitchHref,
      en: locale === 'en' ? currentPath : localeSwitchHref,
    }),
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

  const { localeSwitchHref, posts, tag } = await getTagPageData(locale, slug)

  if (!tag) {
    notFound()
  }

  return (
    <div className="site-shell">
      <FrontendHeader
        currentPath={`/${locale}/blog/tag/${slug}`}
        locale={locale}
        localeSwitchHref={localeSwitchHref}
      />
      <main className="content-page blog-index">
        <section className="section content-page__hero">
          <p className="eyebrow">Tag</p>
          <h1>#{tag.title}</h1>
          <p className="content-page__lead">
            {locale === 'de' ? `${posts.length} Beiträge mit diesem Tag.` : `${posts.length} posts with this tag.`}
          </p>
          <Link className="button button--secondary" href={`/${locale}/blog`}>
            {locale === 'de' ? 'Zur Blog-Übersicht' : 'Back to blog'}
          </Link>
        </section>

        <section className="section blog-list">
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
