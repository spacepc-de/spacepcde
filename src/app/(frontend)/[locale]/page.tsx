import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import type { BlogPost, FooterLink, NavigationLink, ProductGroup } from '@/payload-types'
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
      'Kurz sagen, was gebraucht wird. Die Seite verbindet Leistungen, technische Themen und konkrete Kontaktmoeglichkeit in einer gemeinsamen Sprache.',
    contactCta: 'Anfrage senden',
    contactTitle: 'Bereit fuer IT Service mit klarer Kommunikation statt Agentur-Blabla.',
    current: 'Aktuell',
    footerText:
      'IT Service, Blog und technische Inhalte auf einer gemeinsamen Payload-Basis. Klar, direkt und ohne unnoetigen Ueberbau.',
    headline:
      'Technische Inhalte und direkter IT Service. Klar aufgebaut, schnell geladen und ohne Chaos im Hintergrund.',
    heroCtaPrimary: 'Leistungen ansehen',
    heroCtaSecondary: 'Neueste Beitraege',
    heroEyebrow: 'IT Service und Blog aus einem System',
    heroLead:
      'Die Startseite verbindet Blog, Service und konkrete Leistungen in einer gemeinsamen Struktur. Keine laute Agenturansprache, sondern klare Information, technische Substanz und Inhalte, die sich sauber aus dem CMS pflegen lassen.',
    latestFallbackBody:
      'Damit wird aus der Startseite Schritt fuer Schritt eine Kombination aus IT-Service-Flaeche und technischer Publikation.',
    latestFallbackTitle: 'Nach dem ersten publizierten Beitrag fuellt sich diese Liste automatisch.',
    latestHeading:
      'Neue Beitraege bleiben schnell erfassbar und zeigen laufend, womit sich Service und Blog aktuell beschaeftigen.',
    latestLabel: 'Aktuell',
    notYet: 'Inhalt folgt',
    offerHeading:
      'Produktgruppen und Leistungsbausteine geben dem Service einen klaren Rahmen und schaffen Anschluss an die Inhalte.',
    offerLabel: 'Angebot',
    pageTitle: 'spacepc.de | Systeme, Support und technische Inhalte',
    positionBody:
      'Orientierung an spacepc.dev: direkt, sachlich, technisch. Service und Blog stehen nicht nebeneinander, sondern zahlen sichtbar auf dasselbe Angebot ein.',
    positionLabel: 'Positionierung',
    productsEmpty:
      'Leistungsbausteine erscheinen automatisch, sobald sie im Backend gepflegt sind.',
    productsEmptyBody:
      'Die Struktur ist bereits angebunden. Es fehlen nur noch echte Eintraege in der Collection product-groups.',
    productsMetric: 'Produktgruppen',
    publishedFallback:
      'Sobald Blogbeitraege im Backend vorliegen, erscheint hier automatisch der aktuellste Artikel als Leitbeitrag.',
    publishedFallbackTitle:
      'Technische Inhalte, die Vertrauen schaffen und direkt an reale IT-Themen anschliessen.',
    request: 'Anfrage senden',
    serviceCards: [
      {
        body: 'Hilfe bei Linux, Hosting, Automatisierung, Self-Hosting und laufenden Systemen. Direkt, nachvollziehbar und ohne unnoetige Vertriebssprache.',
        title: 'IT Service',
      },
      {
        body: 'Artikel, Anleitungen und technische Einordnungen, die wie brauchbare Arbeitsnotizen wirken und gleichzeitig Vertrauen in die Leistung schaffen.',
        title: 'Blog mit Praxisbezug',
      },
      {
        body: 'Blog, Produktgruppen und Service-Bausteine sind nicht getrennt gedacht. Das Frontend verbindet Wissen mit konkreten naechsten Schritten.',
        title: 'Inhalte und Angebot verbunden',
      },
    ],
    servicesHeading:
      'IT Service fuer Unternehmen und Selbststaendige, plus ein Blog mit praktischen technischen Inhalten.',
    servicesLabel: 'Leistungen',
    storyFallback: [
      {
        body: 'Die Seite zeigt Wissen nicht als Deko, sondern als Teil eines klaren technischen Angebots.',
        meta: 'Beispiel / 3 Min.',
        title: 'Blog und Service sollten dieselbe Sprache sprechen.',
      },
      {
        body: 'Wer die Artikel liest, versteht schneller, wie Support, Infrastruktur und Betrieb konkret aussehen.',
        meta: 'Beispiel / 2 Min.',
        title: 'Praxisnahe Inhalte machen IT Service leichter verstaendlich.',
      },
    ],
    storyHeading:
      'Der Blog zeigt Fachwissen, das den Service glaubwuerdig macht: praxisnah, lesbar und ohne Marketing-Theater.',
    storyLabel: 'Blog',
    systemLabels: {
      blogposts: 'Blogposts',
      language: 'Sprache',
      nav: 'Navigationspunkte',
    },
  },
  en: {
    contactBody:
      'Say briefly what is needed. The site combines services, technical topics, and a direct contact path in one consistent voice.',
    contactCta: 'Send request',
    contactTitle: 'Ready for IT service with clear communication instead of agency language.',
    current: 'Current',
    footerText:
      'IT service, blog, and technical content on one shared Payload base. Clear, direct, and without unnecessary overhead.',
    headline:
      'Technical content and direct IT service. Clearly structured, fast, and without chaos behind the scenes.',
    heroCtaPrimary: 'View services',
    heroCtaSecondary: 'Latest posts',
    heroEyebrow: 'IT service and blog from one system',
    heroLead:
      'The homepage combines blog, service, and concrete offerings in one shared structure. No loud agency tone, just clear information, technical substance, and content that can be maintained cleanly in the CMS.',
    latestFallbackBody:
      'This gradually turns the homepage into a combination of service surface and technical publication.',
    latestFallbackTitle: 'After the first published post, this list fills automatically.',
    latestHeading:
      'New posts stay easy to scan and show what the service and blog are currently working on.',
    latestLabel: 'Current',
    notYet: 'Content coming soon',
    offerHeading:
      'Product groups and service building blocks give the service a clear frame and connect it to the content.',
    offerLabel: 'Offer',
    pageTitle: 'spacepc.de | Systems, support, and technical content',
    positionBody:
      'Inspired by spacepc.dev: direct, factual, technical. Service and blog do not sit next to each other; they clearly support the same offer.',
    positionLabel: 'Positioning',
    productsEmpty: 'Service building blocks appear automatically once they are maintained in the backend.',
    productsEmptyBody:
      'The structure is already connected. Only real entries in the product-groups collection are still missing.',
    productsMetric: 'Product groups',
    publishedFallback:
      'As soon as blog posts exist in the backend, the latest article appears here automatically as the lead story.',
    publishedFallbackTitle:
      'Technical content that builds trust and connects directly to real IT topics.',
    request: 'Send request',
    serviceCards: [
      {
        body: 'Support for Linux, hosting, automation, self-hosting, and running systems. Direct, understandable, and without unnecessary sales language.',
        title: 'IT service',
      },
      {
        body: 'Articles, guides, and technical assessments that read like useful working notes and still strengthen trust in the service.',
        title: 'Blog with practical value',
      },
      {
        body: 'Blog, product groups, and service building blocks are not treated separately. The frontend connects knowledge with concrete next steps.',
        title: 'Content and offer connected',
      },
    ],
    servicesHeading:
      'IT service for companies and independent professionals, plus a blog with practical technical content.',
    servicesLabel: 'Services',
    storyFallback: [
      {
        body: 'The site presents knowledge not as decoration, but as part of a clear technical offer.',
        meta: 'Example / 3 min.',
        title: 'Blog and service should speak the same language.',
      },
      {
        body: 'People who read the articles understand more quickly what support, infrastructure, and day-to-day operations actually look like.',
        meta: 'Example / 2 min.',
        title: 'Practical content makes IT service easier to understand.',
      },
    ],
    storyHeading:
      'The blog shows expertise that makes the service credible: practical, readable, and without marketing theatre.',
    storyLabel: 'Blog',
    systemLabels: {
      blogposts: 'Blog posts',
      language: 'Language',
      nav: 'Navigation items',
    },
  },
} as const

const defaultHighlights: Record<LocaleCode, string[]> = {
  de: [
    'IT Service, Blog und Produktbezug in einer klaren technischen Oberflaeche.',
    'Schnell, wartungsarm und ohne unnoetigen Tool- oder Plugin-Ballast.',
    'Inhalte pflegbar im CMS, Technik sauber im Hintergrund.',
  ],
  en: [
    'IT service, blog, and product context in one clear technical interface.',
    'Fast, low-maintenance, and without unnecessary tool or plugin overhead.',
    'Content maintained in the CMS, technology kept clean in the background.',
  ],
}

function formatDate(value: string | null | undefined, locale: LocaleCode) {
  if (!value) {
    return copy[locale].current
  }

  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function estimateReadingTime(text: string, locale: LocaleCode) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(2, Math.round(words / 180))
  return locale === 'de' ? `${minutes} Min.` : `${minutes} min.`
}

function getPostTextContent(post: BlogPost) {
  return post.contentMarkdown?.trim() || ''
}

function buildSummary(post: BlogPost) {
  const content = getPostTextContent(post)

  return (
    post.excerpt?.trim() ||
    `${content.replace(/\s+/g, ' ').slice(0, 180).trim()}${content.length > 180 ? '...' : ''}`
  )
}

function isPopulatedProductGroup(value: BlogPost['productGroups']): value is ProductGroup[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null)
}

async function getHomeData(locale: LocaleCode) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const [navigationResult, footerResult, postsResult, productGroupsResult] = await Promise.all([
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
      limit: 6,
      locale,
      sort: '-publishedAt',
    }),
    payload.find({
      collection: 'product-groups',
      depth: 1,
      fallbackLocale: 'de',
      limit: 4,
      locale,
      sort: '-createdAt',
    }),
  ])

  return {
    footerLinks: mapLinks(footerResult.docs as FooterLink[], getFallbackFooterLinks(locale)),
    navItems: mapLinks(navigationResult.docs as NavigationLink[], getFallbackNavItems(locale)),
    posts: postsResult.docs as BlogPost[],
    productGroups: productGroupsResult.docs as ProductGroup[],
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
  const { footerLinks, navItems, posts, productGroups } = await getHomeData(locale)
  const leadPost = posts[0]
  const supportingPosts = posts.slice(1, 4)
  const latestPosts = posts.slice(0, 4)
  const leadProductGroups =
    leadPost && isPopulatedProductGroup(leadPost.productGroups)
      ? leadPost.productGroups.slice(0, 2)
      : productGroups.slice(0, 2)
  const heroHighlights =
    leadProductGroups.length > 0
      ? leadProductGroups.map(
          (group) =>
            `${group.title} ${locale === 'de' ? 'mit' : 'with'} ${group.products.length} ${
              locale === 'de' ? 'Eintraegen' : 'items'
            }`,
        )
      : defaultHighlights[locale]

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
              <a className="button button--primary" href={`/${locale}#leistungen`}>
                {localizedCopy.heroCtaPrimary}
              </a>
              <a className="button button--secondary" href={`/${locale}#wissen`}>
                {localizedCopy.heroCtaSecondary}
              </a>
            </div>

            <ul className="hero__highlights">
              {heroHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <aside className="hero__panel">
            <p className="eyebrow">Systemstatus</p>
            <div className="metric-grid">
              <div className="metric-card">
                <span>{localizedCopy.systemLabels.blogposts}</span>
                <strong>{posts.length || 0}</strong>
              </div>
              <div className="metric-card">
                <span>{localizedCopy.productsMetric}</span>
                <strong>{productGroups.length || 0}</strong>
              </div>
              <div className="metric-card">
                <span>{localizedCopy.systemLabels.nav}</span>
                <strong>{navItems.length}</strong>
              </div>
              <div className="metric-card">
                <span>{localizedCopy.systemLabels.language}</span>
                <strong>DE / EN</strong>
              </div>
            </div>

            <div className="hero__note">
              <p className="eyebrow">{localizedCopy.positionLabel}</p>
              <p>{localizedCopy.positionBody}</p>
            </div>
          </aside>
        </section>

        <section className="section services" id="leistungen">
          <div className="section-heading">
            <p className="eyebrow">{localizedCopy.servicesLabel}</p>
            <h2>{localizedCopy.servicesHeading}</h2>
          </div>

          <div className="services__grid">
            {localizedCopy.serviceCards.map((card) => (
              <article className="service-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
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
                <div className="lead-story__glow lead-story__glow--one" />
                <div className="lead-story__glow lead-story__glow--two" />
              </div>
              <div className="lead-story__body">
                <p className="story-meta">
                  {leadPost ? formatDate(leadPost.publishedAt, locale) : localizedCopy.current} /{' '}
                  {leadPost
                    ? estimateReadingTime(getPostTextContent(leadPost), locale)
                    : estimateReadingTime('fallback content', locale)}
                </p>
                <h3>{leadPost?.title || localizedCopy.publishedFallbackTitle}</h3>
                <p>{leadPost ? buildSummary(leadPost) : localizedCopy.publishedFallback}</p>

                {leadProductGroups.length > 0 ? (
                  <div className="tag-row">
                    {leadProductGroups.map((group) => (
                      <span className="tag-pill" key={group.id}>
                        {group.title}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>

            <div className="story-stack">
              {supportingPosts.length > 0
                ? supportingPosts.map((post) => (
                    <article className="story-card" key={post.id}>
                      <p className="story-meta">
                        {formatDate(post.publishedAt, locale)} /{' '}
                        {estimateReadingTime(getPostTextContent(post), locale)}
                      </p>
                      <h3>{post.title}</h3>
                      <p>{buildSummary(post)}</p>
                    </article>
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

        <section className="section product-groups" id="produkte">
          <div className="section-heading">
            <p className="eyebrow">{localizedCopy.offerLabel}</p>
            <h2>{localizedCopy.offerHeading}</h2>
          </div>

          <div className="product-groups__grid">
            {productGroups.length > 0 ? (
              productGroups.map((group) => (
                <article className="product-card" key={group.id}>
                  <div>
                    <p className="story-meta">
                      {group.products.length} {locale === 'de' ? 'Produkte' : 'products'}
                    </p>
                    <h3>{group.title}</h3>
                  </div>
                  <ul>
                    {group.products.slice(0, 4).map((product) => (
                      <li key={`${group.id}-${product.id ?? product.productName}`}>
                        {product.productName}
                      </li>
                    ))}
                  </ul>
                </article>
              ))
            ) : (
              <article className="product-card product-card--empty">
                <div>
                  <p className="story-meta">{locale === 'de' ? 'Noch keine Daten' : 'No data yet'}</p>
                  <h3>{localizedCopy.productsEmpty}</h3>
                </div>
                <p>{localizedCopy.productsEmptyBody}</p>
              </article>
            )}
          </div>
        </section>

        <section className="section latest-posts">
          <div className="section-heading">
            <p className="eyebrow">{localizedCopy.latestLabel}</p>
            <h2>{localizedCopy.latestHeading}</h2>
          </div>

          <div className="latest-posts__layout">
            <div className="latest-posts__list">
              {latestPosts.length > 0 ? (
                latestPosts.map((post) => (
                  <article className="latest-post" key={post.id}>
                    <p className="story-meta">{formatDate(post.publishedAt, locale)}</p>
                    <h3>{post.title}</h3>
                    <p>{buildSummary(post)}</p>
                  </article>
                ))
              ) : (
                <article className="latest-post">
                  <p className="story-meta">{localizedCopy.notYet}</p>
                  <h3>{localizedCopy.latestFallbackTitle}</h3>
                  <p>{localizedCopy.latestFallbackBody}</p>
                </article>
              )}
            </div>

            <aside className="contact-panel" id="kontakt">
              <p className="eyebrow">{locale === 'de' ? 'Kontakt' : 'Contact'}</p>
              <h3>{localizedCopy.contactTitle}</h3>
              <p>{localizedCopy.contactBody}</p>
              <a className="button button--primary" href="mailto:hallo@spacepc.de">
                hallo@spacepc.de
              </a>
            </aside>
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
