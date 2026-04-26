import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import type { BlogPost, FooterLink } from '@/payload-types'
import { FeaturedPostImage } from '@/components/frontend/FeaturedPostImage'
import { FrontendHeader } from '@/components/frontend/FrontendHeader'
import {
  buildPostSummary,
  estimateReadingTime,
  formatBlogDate,
  getFeaturedImage,
  getPostTextContent,
  isPopulatedCategory,
  isPopulatedTag,
} from '@/lib/blog-frontend'
import type { PopulatedCategory, PopulatedTag } from '@/lib/blog-frontend'
import {
  getFallbackFooterLinks,
  getLocalizedAlternates,
  isLocaleCode,
  mapLinks,
  type LocaleCode,
} from '@/lib/frontend'
import { getPayloadConfig } from '@/payload.config'
import '../styles.css'

export const revalidate = 3600

type FrontendHomePost = BlogPost & {
  featured?: boolean | null
}

const copy = {
  de: {
    contactBody:
      'Wenn ein System hakt, eine Migration ansteht oder Infrastruktur aufgeräumt werden muss, reicht eine kurze Mail mit dem Kontext.',
    contactTitle: 'Kontakt',
    current: 'Aktuell',
    footerText: 'Technik verstehen. Systeme verbessern. Probleme lösen.',
    featuredColumnLabel: 'Featured',
    featuredHeading: 'Ausgewählte Beiträge',
    headline: 'Technik verstehen. Systeme verbessern. Probleme lösen.',
    heroCtaPrimary: 'Zum Blog',
    heroCtaSecondary: 'Projekt anfragen',
    heroEyebrow: 'spacepc.de',
    heroLead:
      'Anleitungen, Projekte und Lösungen rund um Linux, HomeLab, DevOps, Monitoring, Hardware und smarte Infrastruktur.',
    latestFallbackBody:
      'Weitere technische Artikel, Projekte und Praxisnotizen erscheinen gesammelt im Blog-Archiv.',
    latestFallbackTitle: 'Im Blog-Archiv entstehen nach und nach weitere technische Beiträge.',
    latestHeading: 'Neu im Blog',
    latestLabel: 'Neu',
    notYet: 'Inhalt folgt',
    pageTitle: 'spacepc.de | IT-Support, Infrastruktur und technische Inhalte',
    positionBody:
      'Die Startseite priorisiert Inhalte. Das Angebot bleibt sichtbar, aber nachgeordnet und ohne typische Landingpage-Rhetorik.',
    positionLabel: 'Einordnung',
    publishedFallback:
      'Im Blog stehen technische Anleitungen, Einordnungen und Projektnotizen zu Linux, Infrastruktur, Monitoring und Hardware im Mittelpunkt.',
    publishedFallbackTitle:
      'Technische Inhalte mit klarem Fokus auf Infrastruktur, Betrieb und praktische Lösungen.',
    request: 'Projekt anfragen',
    storyFallback: [
      {
        body: 'Die Startseite priorisiert Inhalte und hält die Wege kurz.',
        meta: 'Überblick / 3 Min.',
        title: 'Technische Inhalte statt leerer Landingpage-Rhetorik.',
      },
      {
        body: 'Archiv, Kategorien und einzelne Beiträge bleiben direkt erreichbar.',
        meta: 'Überblick / 2 Min.',
        title: 'Klare Wege zu Archiv, Kategorien und einzelnen Beiträgen.',
      },
    ],
    storyHeading: 'Im Fokus',
    storyLabel: 'Leitartikel',
  },
  en: {
    contactBody:
      'If a system is unstable, a migration is pending, or infrastructure needs cleanup, a short email with context is enough.',
    contactTitle: 'Contact',
    current: 'Current',
    footerText:
      'Technical writing, infrastructure topics, and practical guides on one shared Payload base.',
    featuredColumnLabel: 'Featured',
    featuredHeading: 'Selected posts',
    headline: 'Understand technology. Improve systems. Solve problems.',
    heroCtaPrimary: 'Go to blog',
    heroCtaSecondary: 'Start a project',
    heroEyebrow: 'spacepc.de',
    heroLead:
      'Guides, projects, and solutions around Linux, homelab, DevOps, monitoring, hardware, and smart infrastructure.',
    latestFallbackBody:
      'More technical articles, project notes, and practical guides will continue to appear in the blog archive.',
    latestFallbackTitle: 'The blog archive will keep expanding with additional technical posts.',
    latestHeading: 'New in the blog',
    latestLabel: 'New',
    notYet: 'Content coming soon',
    pageTitle: 'spacepc.de | IT support, infrastructure, and technical content',
    positionBody:
      'The homepage prioritises content. Services remain visible, but secondary and without typical landing-page rhetoric.',
    positionLabel: 'Editorial note',
    publishedFallback:
      'The blog focuses on technical guides, infrastructure work, monitoring, hardware, and practical operational knowledge.',
    publishedFallbackTitle:
      'Technical content with a clear focus on infrastructure, operations, and practical solutions.',
    request: 'Start a project',
    storyFallback: [
      {
        body: 'The homepage prioritises content and keeps the paths short.',
        meta: 'Overview / 3 min.',
        title: 'Technical content instead of empty landing-page language.',
      },
      {
        body: 'Archive, categories, and posts stay directly accessible.',
        meta: 'Overview / 2 min.',
        title: 'Clear paths to the archive, categories, and individual posts.',
      },
    ],
    storyHeading: 'In focus',
    storyLabel: 'Lead story',
  },
} as const

function isFeaturedPost(post: FrontendHomePost) {
  return Boolean(post.featured)
}

async function getHomeData(locale: LocaleCode) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [footerResult, postsResult] = await Promise.all([
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
      limit: 12,
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
    footerLinks: mapLinks(locale, footerResult.docs as FooterLink[], getFallbackFooterLinks(locale)),
    posts: postsResult.docs as FrontendHomePost[],
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
    alternates: getLocalizedAlternates(locale),
    description:
      locale === 'de'
        ? 'SpacePC bündelt IT-Support, Infrastrukturwissen und technische Artikel zu Linux, Monitoring, Hardware und smarten Systemen.'
        : 'SpacePC combines IT support, infrastructure knowledge, and technical articles on Linux, monitoring, hardware, and smart systems.',
    title: copy[locale].pageTitle,
  }
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!isLocaleCode(locale)) {
    notFound()
  }

  const localizedCopy = copy[locale]
  const { footerLinks, posts } = await getHomeData(locale)
  const featuredPosts = posts.filter(isFeaturedPost).slice(0, 3)
  const leadPost = posts[0]
  const supportingPosts = posts.filter((post) => post.id !== leadPost?.id).slice(0, 2)
  const latestPostsBase = posts.filter((post) => !featuredPosts.some((featured) => featured.id === post.id))
  const latestPosts = (latestPostsBase.length > 0 ? latestPostsBase : posts).slice(0, 5)

  return (
    <div className="site-shell">
      <FrontendHeader
        currentPath={`/${locale}`}
        locale={locale}
      />

      <main id="start">
        <section className="hero section">
          <div className="hero__content">
            <p className="eyebrow">{localizedCopy.heroEyebrow}</p>
            <h1>{localizedCopy.headline}</h1>
            <p className="hero__lead">{localizedCopy.heroLead}</p>

            <div className="hero__actions">
              <a className="button button--primary" href="#beitraege">
                {localizedCopy.heroCtaPrimary}
              </a>
              <a className="button button--secondary" href="https://spacepc.dev" rel="noreferrer" target="_blank">
                {localizedCopy.heroCtaSecondary}
              </a>
            </div>
          </div>
        </section>

        <section className="section feature-story" id="wissen">
          <div className="section-heading">
            <p className="eyebrow">{localizedCopy.storyLabel}</p>
            <h2>{localizedCopy.storyHeading}</h2>
          </div>

          <div className="feature-story__layout">
            <article className="lead-story">
              <div className="lead-story__visual">
                {leadPost && getFeaturedImage(leadPost) ? (
                  <FeaturedPostImage
                    className="card-preview card-preview--lead"
                    post={leadPost}
                    priority
                    sizes="(max-width: 900px) 100vw, 60vw"
                  />
                ) : (
                  <>
                    <div className="lead-story__glow lead-story__glow--one" />
                    <div className="lead-story__glow lead-story__glow--two" />
                  </>
                )}
              </div>
              <div className="lead-story__body">
                <p className="story-meta">
                  {leadPost ? formatBlogDate(leadPost.publishedAt, locale) : localizedCopy.current} /{' '}
                  {leadPost
                    ? estimateReadingTime(getPostTextContent(leadPost), locale)
                      : estimateReadingTime('fallback content', locale)}
                </p>
                <h3>{leadPost?.title || localizedCopy.publishedFallbackTitle}</h3>
                <p>{leadPost ? buildPostSummary(leadPost) : localizedCopy.publishedFallback}</p>

                {leadPost ? (
                  <Link className="button button--secondary" href={`/${locale}/${leadPost.url}`}>
                    {locale === 'de' ? 'Beitrag lesen' : 'Read article'}
                  </Link>
                ) : null}
              </div>
            </article>

            <div className="story-stack">
              {supportingPosts.length > 0
                ? supportingPosts.map((post) => (
                    <Link className="story-card story-card--link" href={`/${locale}/${post.url}`} key={post.id}>
                      {getFeaturedImage(post) ? (
                        <FeaturedPostImage
                          className="card-preview card-preview--compact"
                          post={post}
                          sizes="(max-width: 900px) 100vw, 30vw"
                        />
                      ) : null}
                      <p className="story-meta">
                        {formatBlogDate(post.publishedAt, locale)} /{' '}
                        {estimateReadingTime(getPostTextContent(post), locale)}
                      </p>
                      <h3>{post.title}</h3>
                      <p>{buildPostSummary(post)}</p>
                    </Link>
                  ))
                : localizedCopy.storyFallback.map((item) => (
                    <article className="story-card" key={item.title}>
                      <p className="story-meta">{item.meta}</p>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </article>
                  ))}
            </div>
          </div>
        </section>

        <section className="section latest-posts" id="beitraege">
          <div className="latest-posts__layout">
            <aside className="featured-column">
              <div className="featured-column__header">
                <h3>{localizedCopy.featuredHeading}</h3>
              </div>

              <div className="featured-column__list">
                {featuredPosts.length > 0 ? (
                  featuredPosts.map((post) => (
                    <Link className="featured-post" href={`/${locale}/${post.url}`} key={post.id}>
                      {getFeaturedImage(post) ? (
                        <FeaturedPostImage
                          className="card-preview card-preview--compact"
                          post={post}
                          sizes="(max-width: 900px) 100vw, 24vw"
                        />
                      ) : null}
                      <p className="story-meta">
                        {formatBlogDate(post.publishedAt, locale)} / {estimateReadingTime(getPostTextContent(post), locale)}
                      </p>
                      <h4>{post.title}</h4>
                      <p>{buildPostSummary(post)}</p>
                    </Link>
                  ))
                ) : null}
              </div>
            </aside>

            <div className="latest-posts__main">
              <div className="latest-posts__header">
                <h2>{localizedCopy.latestHeading}</h2>
              </div>

              <div className="latest-posts__list">
                {latestPosts.length > 0 ? (
                  latestPosts.map((post) => (
                    <Link className="latest-post latest-post--link" href={`/${locale}/${post.url}`} key={post.id}>
                      {getFeaturedImage(post) ? (
                        <FeaturedPostImage
                          className="card-preview card-preview--compact"
                          post={post}
                          sizes="(max-width: 900px) 100vw, 38vw"
                        />
                      ) : null}
                      <p className="story-meta">{formatBlogDate(post.publishedAt, locale)}</p>
                      <h3>{post.title}</h3>
                      <p>{buildPostSummary(post)}</p>
                      <div className="blog-card__taxonomy">
                        {isPopulatedCategory(post.categories)
                          ? (post.categories as PopulatedCategory[]).slice(0, 2).map((category) => (
                              <span className="tag-pill" key={`cat-${category.id}`}>
                                {category.title}
                              </span>
                            ))
                          : null}
                        {isPopulatedTag(post.tags)
                          ? (post.tags as PopulatedTag[]).slice(0, 2).map((tag) => (
                              <span className="tag-pill tag-pill--neutral" key={`tag-${tag.id}`}>
                                #{tag.title}
                              </span>
                            ))
                          : null}
                      </div>
                    </Link>
                  ))
                ) : (
                  <article className="latest-post">
                    <p className="story-meta">{localizedCopy.notYet}</p>
                    <h3>{localizedCopy.latestFallbackTitle}</h3>
                    <p>{localizedCopy.latestFallbackBody}</p>
                  </article>
                )}
                <aside className="contact-panel" id="kontakt">
                  <p className="eyebrow">{locale === 'de' ? 'Kontakt' : 'Contact'}</p>
                  <h3>{localizedCopy.contactTitle}</h3>
                  <p>{localizedCopy.contactBody}</p>
                  <a className="button button--primary" href="mailto:hello@spacepc.dev">
                    hello@spacepc.dev
                  </a>
                </aside>
              </div>
            </div>
          </div>
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
            <p>{localizedCopy.footerText}</p>
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
