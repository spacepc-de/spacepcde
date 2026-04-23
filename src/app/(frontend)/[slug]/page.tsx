import React from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'

type LinkItem = {
  href: string
  label: string
  openInNewTab: boolean
}

type FrontendPage = {
  contentMarkdown?: string | null
  isLegalPage?: boolean | null
  seoDescription?: string | null
  seoTitle?: string | null
  title: string
  url: string
}

const fallbackNavItems: LinkItem[] = [
  { href: '/#leistungen', label: 'Leistungen', openInNewTab: false },
  { href: '/#wissen', label: 'Blog', openInNewTab: false },
  { href: '/#produkte', label: 'Angebot', openInNewTab: false },
  { href: '/#kontakt', label: 'Kontakt', openInNewTab: false },
]

const fallbackFooterLinks: LinkItem[] = [
  { href: '/impressum', label: 'Impressum', openInNewTab: false },
  { href: '/datenschutz', label: 'Datenschutz', openInNewTab: false },
]

function mapLinks(items: Array<{ href: string; label: string; openInNewTab?: boolean | null }>, fallback: LinkItem[]): LinkItem[] {
  if (items.length === 0) {
    return fallback
  }

  return items.map((item) => ({
    href: item.href,
    label: item.label,
    openInNewTab: Boolean(item.openInNewTab),
  }))
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n')
  const elements: React.ReactNode[] = []
  let paragraphBuffer: string[] = []
  let listBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    elements.push(
      <p key={`p-${elements.length}`}>
        {paragraphBuffer.join(' ').trim()}
      </p>,
    )
    paragraphBuffer = []
  }

  const flushList = () => {
    if (listBuffer.length === 0) return
    elements.push(
      <ul key={`ul-${elements.length}`}>
        {listBuffer.map((item, index) => (
          <li key={`li-${elements.length}-${index}`}>{item}</li>
        ))}
      </ul>,
    )
    listBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    if (line.startsWith('# ')) {
      flushParagraph()
      flushList()
      elements.push(<h2 key={`h2-${elements.length}`}>{line.slice(2).trim()}</h2>)
      continue
    }

    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      elements.push(<h3 key={`h3-${elements.length}`}>{line.slice(3).trim()}</h3>)
      continue
    }

    if (line.startsWith('### ')) {
      flushParagraph()
      flushList()
      elements.push(<h4 key={`h4-${elements.length}`}>{line.slice(4).trim()}</h4>)
      continue
    }

    if (line.startsWith('- ')) {
      flushParagraph()
      listBuffer.push(line.slice(2).trim())
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      flushParagraph()
      listBuffer.push(line.replace(/^\d+\.\s/, '').trim())
      continue
    }

    paragraphBuffer.push(line)
  }

  flushParagraph()
  flushList()

  return elements
}

async function getPageBySlug(slug: string) {
  const payload = await getPayload({ config: await config })
  const [pageResult, navigationResult, footerResult] = await Promise.all([
    payload.find({
      collection: 'pages' as never,
      depth: 0,
      fallbackLocale: 'de',
      limit: 1,
      locale: 'de',
      sort: 'title',
      where: {
        url: {
          equals: slug,
        },
      },
    }),
    payload.find({
      collection: 'navigation-links' as never,
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale: 'de',
      sort: 'order',
    }),
    payload.find({
      collection: 'footer-links' as never,
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale: 'de',
      sort: 'order',
    }),
  ])

  return {
    footerLinks: mapLinks(footerResult.docs as Array<{ href: string; label: string; openInNewTab?: boolean | null }>, fallbackFooterLinks),
    navItems: mapLinks(navigationResult.docs as Array<{ href: string; label: string; openInNewTab?: boolean | null }>, fallbackNavItems),
    page: (pageResult.docs[0] as FrontendPage | undefined) ?? null,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { page } = await getPageBySlug(slug)

  if (!page) {
    return {
      title: 'Seite nicht gefunden | spacepc.de',
    }
  }

  return {
    description:
      page.seoDescription || `${page.title} auf spacepc.de`,
    title: page.seoTitle || `${page.title} | spacepc.de`,
  }
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { footerLinks, navItems, page } = await getPageBySlug(slug)

  if (!page) {
    notFound()
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <nav aria-label="Hauptnavigation" className="site-nav">
          <a className="brand" href="/">
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

          <a className="site-nav__cta" href="/#kontakt">
            Anfrage senden
          </a>
        </nav>
      </header>

      <main className="content-page">
        <section className="section content-page__hero">
          <p className="eyebrow">{page.isLegalPage ? 'Rechtliches' : 'Seite'}</p>
          <h1>{page.title}</h1>
        </section>

        <section className="section">
          <article className="content-page__card">
            <div className="content-page__body">
              {page.contentMarkdown?.trim()
                ? renderMarkdown(page.contentMarkdown)
                : <p>Diese Seite enthaelt noch keinen Inhalt.</p>}
            </div>
          </article>
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
