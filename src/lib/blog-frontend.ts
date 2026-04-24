import type { BlogPost, Media } from '@/payload-types'

import type { LocaleCode } from './frontend'

export type PopulatedCategory = { id: number; title: string; url: string }
export type PopulatedTag = { id: number; title: string; url: string }
export type PopulatedMedia = Media
type CategoryLike = number | { id: number; title: string; url: string } | null
type TagLike = number | { id: number; title: string; url: string } | null

export function formatBlogDate(value: string | null | undefined, locale: LocaleCode) {
  if (!value) {
    return locale === 'de' ? 'Aktuell' : 'Current'
  }

  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export function estimateReadingTime(text: string, locale: LocaleCode) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(2, Math.round(words / 180))
  return locale === 'de' ? `${minutes} Min.` : `${minutes} min.`
}

export function getPostTextContent(post: Pick<BlogPost, 'contentMarkdown'>) {
  return post.contentMarkdown?.trim() || ''
}

export function buildPostSummary(post: Pick<BlogPost, 'contentMarkdown' | 'excerpt'>) {
  const content = getPostTextContent(post)

  return (
    post.excerpt?.trim() ||
    `${content.replace(/\s+/g, ' ').slice(0, 180).trim()}${content.length > 180 ? '...' : ''}`
  )
}

export function isPopulatedCategory(value: CategoryLike[] | BlogPost['categories']): value is PopulatedCategory[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null)
}

export function isPopulatedTag(value: TagLike[] | BlogPost['tags']): value is PopulatedTag[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null)
}

export function getFeaturedImage(post: {
  featuredImage?: { alt?: string | null; url?: string | null } | number | null
  title: string
}): { alt: string; url: string } | null {
  if (!post.featuredImage || typeof post.featuredImage === 'number') {
    return null
  }

  if (!post.featuredImage.url) {
    return null
  }

  return {
    alt: post.featuredImage.alt || post.title,
    url: post.featuredImage.url,
  }
}

export function getCategoryHref(locale: LocaleCode, slug: string) {
  return `/${locale}/blog/category/${slug}`
}

export function getTagHref(locale: LocaleCode, slug: string) {
  return `/${locale}/blog/tag/${slug}`
}
