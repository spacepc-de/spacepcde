import React from 'react'
import { getPayload } from 'payload'

import type { BlogPost, FooterLink, NavigationLink, ProductGroup } from '@/payload-types'
import config from '@/payload.config'
import './styles.css'

type LinkItem = {
  href: string
  label: string
  openInNewTab: boolean
}

const fallbackNavItems: LinkItem[] = [
  { href: '#leistungen', label: 'Leistungen', openInNewTab: false },
  { href: '#wissen', label: 'Wissen', openInNewTab: false },
  { href: '#produkte', label: 'Produkte', openInNewTab: false },
  { href: '#kontakt', label: 'Kontakt', openInNewTab: false },
]

const fallbackFooterLinks: LinkItem[] = [
  { href: '#leistungen', label: 'Leistungen', openInNewTab: false },
  { href: '#wissen', label: 'Wissen', openInNewTab: false },
  { href: '#kontakt', label: 'Kontakt', openInNewTab: false },
]

const defaultHighlights = [
  'IT Service, Blog und Produktbezug in einer klaren technischen Oberflaeche.',
  'Schnell, wartungsarm und ohne unnoetigen Tool- oder Plugin-Ballast.',
  'Inhalte pflegbar im CMS, Technik sauber im Hintergrund.',
]

function mapLinks(items: NavigationLink[] | FooterLink[], fallback: LinkItem[]): LinkItem[] {
  if (items.length === 0) {
    return fallback
  }

  return items.map((item) => ({
    href: item.href,
    label: item.label,
    openInNewTab: Boolean(item.openInNewTab),
  }))
}

function isPopulatedProductGroup(value: BlogPost['productGroups']): value is ProductGroup[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null)
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Aktuell'
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function estimateReadingTime(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const minutes = Math.max(2, Math.round(words / 180))
  return `${minutes} Min.`
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

export default async function HomePage() {
  const payload = await getPayload({ config: await config })

  const [navigationResult, footerResult, postsResult, productGroupsResult] = await Promise.all([
    payload.find({
      collection: 'navigation-links',
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale: 'de',
      sort: 'order',
    }),
    payload.find({
      collection: 'footer-links',
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale: 'de',
      sort: 'order',
    }),
    payload.find({
      collection: 'blog-posts',
      depth: 2,
      fallbackLocale: 'de',
      limit: 6,
      locale: 'de',
      sort: '-publishedAt',
    }),
    payload.find({
      collection: 'product-groups',
      depth: 1,
      fallbackLocale: 'de',
      limit: 4,
      locale: 'de',
      sort: 'title',
    }),
  ])

  const navItems = mapLinks(navigationResult.docs, fallbackNavItems)
  const footerLinks = mapLinks(footerResult.docs, fallbackFooterLinks)
  const posts = postsResult.docs as BlogPost[]
  const leadPost = posts[0]
  const supportingPosts = posts.slice(1, 4)
  const latestPosts = posts.slice(0, 4)
  const productGroups = productGroupsResult.docs as ProductGroup[]
  const leadProductGroups = leadPost && isPopulatedProductGroup(leadPost.productGroups) ? leadPost.productGroups.slice(0, 2) : productGroups.slice(0, 2)
  const heroHighlights =
    leadProductGroups.length > 0
      ? leadProductGroups.map((group) => `${group.title} mit ${group.products.length} Eintraegen`)
      : defaultHighlights

  return (
    <div className="site-shell">
      <header className="site-header">
        <nav aria-label="Hauptnavigation" className="site-nav">
          <a className="brand" href="#start">
            <span>spacepc</span>
            <span className="brand__dot">.</span>
            <span>de</span>
          </a>

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

          <a className="site-nav__cta" href="#kontakt">
            Anfrage senden
          </a>
        </nav>
      </header>

      <main id="start">
        <section className="hero section">
          <div className="hero__content">
            <p className="eyebrow">IT Service und Blog aus einem System</p>
            <h1>Technische Inhalte und direkter IT Service. Klar aufgebaut, schnell geladen und ohne Chaos im Hintergrund.</h1>
            <p className="hero__lead">
              Die Startseite verbindet Blog, Service und konkrete Leistungen in einer gemeinsamen
              Struktur. Keine laute Agenturansprache, sondern klare Information, technische
              Substanz und Inhalte, die sich sauber aus dem CMS pflegen lassen.
            </p>

            <div className="hero__actions">
              <a className="button button--primary" href="#leistungen">
                Leistungen ansehen
              </a>
              <a className="button button--secondary" href="#wissen">
                Neueste Beitraege
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
                <span>Blogposts</span>
                <strong>{posts.length || 0}</strong>
              </div>
              <div className="metric-card">
                <span>Produktgruppen</span>
                <strong>{productGroups.length || 0}</strong>
              </div>
              <div className="metric-card">
                <span>Navigationspunkte</span>
                <strong>{navItems.length}</strong>
              </div>
              <div className="metric-card">
                <span>Sprache</span>
                <strong>DE / EN</strong>
              </div>
            </div>

            <div className="hero__note">
              <p className="eyebrow">Positionierung</p>
              <p>
                Orientierung an spacepc.dev: direkt, sachlich, technisch. Service und Blog stehen
                nicht nebeneinander, sondern zahlen sichtbar auf dasselbe Angebot ein.
              </p>
            </div>
          </aside>
        </section>

        <section className="section services" id="leistungen">
          <div className="section-heading">
            <p className="eyebrow">Leistungen</p>
            <h2>IT Service fuer Unternehmen und Selbststaendige, plus ein Blog mit praktischen technischen Inhalten.</h2>
          </div>

          <div className="services__grid">
            <article className="service-card">
              <h3>IT Service</h3>
              <p>
                Hilfe bei Linux, Hosting, Automatisierung, Self-Hosting und laufenden Systemen.
                Direkt, nachvollziehbar und ohne unnoetige Vertriebssprache.
              </p>
            </article>
            <article className="service-card">
              <h3>Blog mit Praxisbezug</h3>
              <p>
                Artikel, Anleitungen und technische Einordnungen, die wie brauchbare
                Arbeitsnotizen wirken und gleichzeitig Vertrauen in die Leistung schaffen.
              </p>
            </article>
            <article className="service-card">
              <h3>Inhalte und Angebot verbunden</h3>
              <p>
                Blog, Produktgruppen und Service-Bausteine sind nicht getrennt gedacht. Das
                Frontend verbindet Wissen mit konkreten naechsten Schritten.
              </p>
            </article>
          </div>
        </section>

        <section className="section feature-story" id="wissen">
          <div className="section-heading">
            <p className="eyebrow">Blog</p>
            <h2>Der Blog zeigt Fachwissen, das den Service glaubwuerdig macht: praxisnah, lesbar und ohne Marketing-Theater.</h2>
          </div>

          <div className="feature-story__layout">
            <article className="lead-story">
              <div className="lead-story__visual">
                <div className="lead-story__glow lead-story__glow--one" />
                <div className="lead-story__glow lead-story__glow--two" />
              </div>
              <div className="lead-story__body">
                <p className="story-meta">
                  {leadPost ? formatDate(leadPost.publishedAt) : 'Heute'} /{' '}
                  {leadPost ? estimateReadingTime(getPostTextContent(leadPost)) : '4 Min.'}
                </p>
                <h3>{leadPost?.title || 'Technische Inhalte, die Vertrauen schaffen und direkt an reale IT-Themen anschliessen.'}</h3>
                <p>
                  {leadPost
                    ? buildSummary(leadPost)
                    : 'Sobald Blogbeitraege im Backend vorliegen, erscheint hier automatisch der aktuellste Artikel als Leitbeitrag.'}
                </p>

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
              {supportingPosts.length > 0 ? (
                supportingPosts.map((post) => (
                  <article className="story-card" key={post.id}>
                    <p className="story-meta">
                      {formatDate(post.publishedAt)} / {estimateReadingTime(getPostTextContent(post))}
                    </p>
                    <h3>{post.title}</h3>
                    <p>{buildSummary(post)}</p>
                  </article>
                ))
              ) : (
                <>
                  <article className="story-card">
                    <p className="story-meta">Beispiel / 3 Min.</p>
                    <h3>Blog und Service sollten dieselbe Sprache sprechen.</h3>
                    <p>Die Seite zeigt Wissen nicht als Deko, sondern als Teil eines klaren technischen Angebots.</p>
                  </article>
                  <article className="story-card">
                    <p className="story-meta">Beispiel / 2 Min.</p>
                    <h3>Praxisnahe Inhalte machen IT Service leichter verstaendlich.</h3>
                    <p>Wer die Artikel liest, versteht schneller, wie Support, Infrastruktur und Betrieb konkret aussehen.</p>
                  </article>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="section product-groups" id="produkte">
          <div className="section-heading">
            <p className="eyebrow">Angebot</p>
            <h2>Produktgruppen und Leistungsbausteine geben dem Service einen klaren Rahmen und schaffen Anschluss an die Inhalte.</h2>
          </div>

          <div className="product-groups__grid">
            {productGroups.length > 0 ? (
              productGroups.map((group) => (
                <article className="product-card" key={group.id}>
                  <div>
                    <p className="story-meta">{group.products.length} Produkte</p>
                    <h3>{group.title}</h3>
                  </div>
                  <ul>
                    {group.products.slice(0, 4).map((product) => (
                      <li key={`${group.id}-${product.id ?? product.productName}`}>{product.productName}</li>
                    ))}
                  </ul>
                </article>
              ))
            ) : (
              <article className="product-card product-card--empty">
                <div>
                  <p className="story-meta">Noch keine Daten</p>
                  <h3>Leistungsbausteine erscheinen automatisch, sobald sie im Backend gepflegt sind.</h3>
                </div>
                <p>
                  Die Struktur ist bereits angebunden. Es fehlen nur noch echte Eintraege in der
                  Collection <code>product-groups</code>.
                </p>
              </article>
            )}
          </div>
        </section>

        <section className="section latest-posts">
          <div className="section-heading">
            <p className="eyebrow">Aktuell</p>
            <h2>Neue Beitraege bleiben schnell erfassbar und zeigen laufend, womit sich Service und Blog aktuell beschaeftigen.</h2>
          </div>

          <div className="latest-posts__layout">
            <div className="latest-posts__list">
              {latestPosts.length > 0 ? (
                latestPosts.map((post) => (
                  <article className="latest-post" key={post.id}>
                    <p className="story-meta">{formatDate(post.publishedAt)}</p>
                    <h3>{post.title}</h3>
                    <p>{buildSummary(post)}</p>
                  </article>
                ))
              ) : (
                <article className="latest-post">
                  <p className="story-meta">Inhalt folgt</p>
                  <h3>Nach dem ersten publizierten Beitrag fuellt sich diese Liste automatisch.</h3>
                  <p>Damit wird aus der Startseite Schritt fuer Schritt eine Kombination aus IT-Service-Flaeche und technischer Publikation.</p>
                </article>
              )}
            </div>

            <aside className="contact-panel" id="kontakt">
              <p className="eyebrow">Kontakt</p>
              <h3>Bereit fuer IT Service mit klarer Kommunikation statt Agentur-Blabla.</h3>
              <p>
                Kurz sagen, was gebraucht wird. Die Seite verbindet Leistungen, technische Themen
                und konkrete Kontaktmoeglichkeit in einer gemeinsamen Sprache.
              </p>
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
            <p>
              IT Service, Blog und technische Inhalte auf einer gemeinsamen Payload-Basis. Klar,
              direkt und ohne unnoetigen Ueberbau.
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
