import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import type { BlogPost, FooterLink, NavigationLink } from '@/payload-types'
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
  getFallbackNavItems,
  getLocalizedAlternates,
  isLocaleCode,
  mapLinks,
  type LocaleCode,
} from '@/lib/frontend'
import { getPayloadConfig } from '@/payload.config'
import '../styles.css'

export const dynamic = 'force-dynamic'

const copy = {
  de: {
    contactBody:
      'Wenn ein System hakt, eine Migration ansteht oder Infrastruktur aufgeraeumt werden muss, reicht eine kurze Mail mit dem Kontext.',
    contactTitle: 'Kontakt',
    current: 'Aktuell',
    footerText:
      'Technische Inhalte, Infrastruktur-Themen und praktische Anleitungen auf einer gemeinsamen Payload-Basis.',
    featuredColumnLabel: 'Featured',
    featuredHeading: 'Ausgewaehlte Beitraege',
    headline: 'Technische Inhalte zu Infrastruktur, Hosting, Open Source und digitalen Systemen.',
    heroCtaPrimary: 'Zum Blog',
    heroCtaSecondary: 'IT Service',
    heroEyebrow: 'spacepc.de',
    heroLead:
      'Praxisnahe Artikel, Einordnungen und Anleitungen aus dem echten Betrieb von Systemen, Self-Hosting-Setups und technischer Infrastruktur.',
    latestFallbackBody:
      'Sobald weitere Blogbeitraege vorliegen, fuellt sich dieser Bereich automatisch.',
    latestFallbackTitle: 'Nach dem ersten publizierten Beitrag fuellt sich diese Liste automatisch.',
    latestHeading: 'Neu im Blog',
    latestLabel: 'Neu',
    notYet: 'Inhalt folgt',
    pageTitle: 'spacepc.de | Systeme, Support und technische Inhalte',
    positionBody:
      'Die Startseite priorisiert Inhalte. Das Angebot bleibt sichtbar, aber nachgeordnet und ohne typische Landingpage-Rhetorik.',
    positionLabel: 'Einordnung',
    publishedFallback:
      'Sobald Blogbeitraege im Backend vorliegen, erscheint hier automatisch der Leitartikel.',
    publishedFallbackTitle:
      'Ein Leitartikel fuer die Startseite erscheint automatisch mit dem ersten Beitrag.',
    request: 'Anfrage senden',
    storyFallback: [
      {
        body: 'Die Startseite priorisiert Inhalte und haelt die Wege kurz.',
        meta: 'Beispiel / 3 Min.',
        title: 'Ein ruhiger Einstieg statt Agenturtext.',
      },
      {
        body: 'Archiv, Kategorien und einzelne Beitraege bleiben direkt erreichbar.',
        meta: 'Beispiel / 2 Min.',
        title: 'Das Frontend ordnet Inhalte statt sie zu uebertoenen.',
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
    headline: 'Technical writing on infrastructure, hosting, open source, and digital systems.',
    heroCtaPrimary: 'Go to blog',
    heroCtaSecondary: 'IT services',
    heroEyebrow: 'spacepc.de',
    heroLead:
      'Practical articles, guides, and technical analysis drawn from real-world systems, self-hosting setups, and infrastructure work.',
    latestFallbackBody:
      'As soon as more posts are published, this area fills automatically.',
    latestFallbackTitle: 'After the first published post, this list fills automatically.',
    latestHeading: 'New in the blog',
    latestLabel: 'New',
    notYet: 'Content coming soon',
    pageTitle: 'spacepc.de | Systems, support, and technical content',
    positionBody:
      'The homepage prioritises content. Services remain visible, but secondary and without typical landing-page rhetoric.',
    positionLabel: 'Editorial note',
    publishedFallback:
      'As soon as blog posts exist in the backend, the lead story appears here automatically.',
    publishedFallbackTitle:
      'A lead article for the homepage appears automatically with the first post.',
    request: 'Send request',
    storyFallback: [
      {
        body: 'The homepage prioritises content and keeps the paths short.',
        meta: 'Example / 3 min.',
        title: 'A calmer entry point instead of agency copy.',
      },
      {
        body: 'Archive, categories, and posts stay directly accessible.',
        meta: 'Example / 2 min.',
        title: 'The frontend organises content instead of talking over it.',
      },
    ],
    storyHeading: 'In focus',
    storyLabel: 'Lead story',
  },
} as const

function isFeaturedPost(post: BlogPost) {
  return isPopulatedCategory(post.categories)
    ? (post.categories as PopulatedCategory[]).some(
        (category) => category.url === 'featured' || category.title.toLowerCase() === 'featured',
      )
    : false
}

async function getHomeData(locale: LocaleCode) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [navigationResult, footerResult, postsResult] = await Promise.all([
    payload.find({
      collection: 'navigation-links',
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale,
      sort: 'order',
    }),
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
    navItems: mapLinks(locale, navigationResult.docs as NavigationLink[], getFallbackNavItems(locale)),
    posts: postsResult.docs as BlogPost[],
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
    alternates: getLocalizedAlternates(),
    description:
      locale === 'de'
        ? 'IT Service, technische Inhalte und Produktbezug auf einer schnellen, klar strukturierten SpacePC-Website.'
        : 'IT service, technical content, and product context on a fast, clearly structured SpacePC website.',
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
  const { footerLinks, navItems, posts } = await getHomeData(locale)
  const featuredPosts = posts.filter(isFeaturedPost).slice(0, 3)
  const leadPost = featuredPosts[0] ?? posts[0]
  const supportingPosts = posts.filter((post) => post.id !== leadPost?.id).slice(0, 3)
  const latestPostsBase = posts.filter((post) => !featuredPosts.some((featured) => featured.id === post.id))
  const latestPosts = (latestPostsBase.length > 0 ? latestPostsBase : posts).slice(0, 5)

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
            {localizedCopy.request}
          </Link>
        </nav>
      </header>

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
                  <img
                    alt={getFeaturedImage(leadPost)?.alt || leadPost.title}
                    className="card-preview card-preview--lead"
                    src={getFeaturedImage(leadPost)?.url || ''}
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
                        <img
                          alt={getFeaturedImage(post)?.alt || post.title}
                          className="card-preview card-preview--compact"
                          src={getFeaturedImage(post)?.url || ''}
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
          <div className="section-heading">
            <p className="eyebrow">{localizedCopy.latestLabel}</p>
            <h2>{localizedCopy.latestHeading}</h2>
          </div>

          <div className="latest-posts__layout">
            <aside className="featured-column">
              <div className="featured-column__header">
                <p className="eyebrow">{localizedCopy.featuredColumnLabel}</p>
                <h3>{localizedCopy.featuredHeading}</h3>
              </div>

              <div className="featured-column__list">
                {featuredPosts.length > 0 ? (
                  featuredPosts.map((post) => (
                    <Link className="featured-post" href={`/${locale}/${post.url}`} key={post.id}>
                      {getFeaturedImage(post) ? (
                        <img
                          alt={getFeaturedImage(post)?.alt || post.title}
                          className="card-preview card-preview--compact"
                          src={getFeaturedImage(post)?.url || ''}
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

            <div className="latest-posts__list">
              {latestPosts.length > 0 ? (
                latestPosts.map((post) => (
                  <Link className="latest-post latest-post--link" href={`/${locale}/${post.url}`} key={post.id}>
                    {getFeaturedImage(post) ? (
                      <img
                        alt={getFeaturedImage(post)?.alt || post.title}
                        className="card-preview card-preview--compact"
                        src={getFeaturedImage(post)?.url || ''}
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
                <a className="button button--primary" href="mailto:hallo@spacepc.de">
                  hallo@spacepc.de
                </a>
              </aside>
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
