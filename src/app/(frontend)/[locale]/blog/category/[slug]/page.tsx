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
import { getExactLocalizedAlternates, isLocaleCode } from '@/lib/frontend'
import type { BlogPost, Category } from '@/payload-types'
import { getPayloadConfig } from '@/payload.config'

export const revalidate = 3600

function getTargetLocale(locale: 'de' | 'en') {
  return locale === 'de' ? 'en' : 'de'
}

async function getPublishedPostsForCategory(
  payload: Awaited<ReturnType<typeof getPayload>>,
  categoryId: number,
  locale: 'de' | 'en',
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
            categories: {
              equals: categoryId,
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

async function getCategoryPageData(locale: 'de' | 'en', slug: string) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const categoryResult = await payload.find({
    collection: 'categories',
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

  const category = (categoryResult.docs[0] as Category | undefined) ?? null
  const targetLocale = getTargetLocale(locale)
  const localizedCategory = category
    ? ((await payload.findByID({
        collection: 'categories',
        depth: 0,
        fallbackLocale: false,
        id: category.id,
        locale: targetLocale,
      }).catch((): null => null)) as Category | null)
    : null
  const posts = category ? await getPublishedPostsForCategory(payload, category.id, locale) : []

  return {
    category,
    localeSwitchHref: localizedCategory?.url
      ? `/${targetLocale}/blog/category/${localizedCategory.url}`
      : `/${targetLocale}/blog`,
    posts,
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

  const { category, localeSwitchHref } = await getCategoryPageData(locale, slug)

  if (!category) {
    return {}
  }

  const currentPath = `/${locale}/blog/category/${category.url}`
  const description =
    category.description?.trim() ||
    (locale === 'de'
      ? `Beiträge und Anleitungen aus der Kategorie ${category.title} auf spacepc.de.`
      : `Posts and guides from the ${category.title} category on spacepc.de.`)

  return {
    alternates: getExactLocalizedAlternates(locale, {
      de: locale === 'de' ? currentPath : localeSwitchHref,
      en: locale === 'en' ? currentPath : localeSwitchHref,
    }),
    description,
    title:
      locale === 'de'
        ? `${category.title} | Kategorie auf spacepc.de`
        : `${category.title} | Category on spacepc.de`,
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

  const { category, localeSwitchHref, posts } = await getCategoryPageData(locale, slug)

  if (!category) {
    notFound()
  }

  return (
    <div className="site-shell">
      <FrontendHeader
        currentPath={`/${locale}/blog/category/${slug}`}
        locale={locale}
        localeSwitchHref={localeSwitchHref}
      />
      <main className="content-page blog-index">
        <section className="section content-page__hero">
          <p className="eyebrow">{locale === 'de' ? 'Kategorie' : 'Category'}</p>
          <h1>{category.title}</h1>
          {category.description ? <p className="content-page__lead">{category.description}</p> : null}
          <p className="content-page__lead">
            {locale === 'de' ? `${posts.length} Beiträge in dieser Kategorie.` : `${posts.length} posts in this category.`}
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
