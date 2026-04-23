import React from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import config from '@/payload.config'
import {
  getFallbackFooterLinks,
  getFallbackNavItems,
  getLocalizedAlternates,
  isLocaleCode,
  mapLinks,
  type LocaleCode,
} from '@/lib/frontend'

export const dynamic = 'force-dynamic'

type FrontendPage = {
  contentMarkdown?: string | null
  isLegalPage?: boolean | null
  seoDescription?: string | null
  seoTitle?: string | null
  title: string
  url: string
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n')
  const elements: React.ReactNode[] = []
  let paragraphBuffer: string[] = []
  let listBuffer: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    elements.push(<p key={`p-${elements.length}`}>{paragraphBuffer.join(' ').trim()}</p>)
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

async function getPageBySlug(locale: LocaleCode, slug: string) {
  const payload = await getPayload({ config: await config })
  const [pageResult, navigationResult, footerResult] = await Promise.all([
    payload.find({
      collection: 'pages' as never,
      depth: 0,
      fallbackLocale: 'de',
      limit: 1,
      locale,
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
      locale,
      sort: 'order',
    }),
    payload.find({
      collection: 'footer-links' as never,
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale,
      sort: 'order',
    }),
  ])

  return {
    footerLinks: mapLinks(
      footerResult.docs as Array<{ href: string; label: string; openInNewTab?: boolean | null }>,
      getFallbackFooterLinks(locale),
    ),
    navItems: mapLinks(
      navigationResult.docs as Array<{ href: string; label: string; openInNewTab?: boolean | null }>,
      getFallbackNavItems(locale),
    ),
    page: (pageResult.docs[0] as FrontendPage | undefined) ?? null,
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

  const { page } = await getPageBySlug(locale, slug)

  if (!page) {
    return {
      title: 'Page not found | spacepc.de',
    }
  }

  return {
    alternates: getLocalizedAlternates(slug),
    description:
      page.seoDescription ||
      (locale === 'de' ? `${page.title} auf spacepc.de` : `${page.title} on spacepc.de`),
    title: page.seoTitle || `${page.title} | spacepc.de`,
  }
}

export default async function LocalizedStaticPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params

  if (!isLocaleCode(locale)) {
    notFound()
  }

  const { footerLinks, navItems, page } = await getPageBySlug(locale, slug)

  if (!page) {
    notFound()
  }

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
            {locale === 'de' ? 'Anfrage senden' : 'Send request'}
          </Link>
        </nav>
      </header>

      <main className="content-page">
        <section className="section content-page__hero">
          <p className="eyebrow">
            {page.isLegalPage ? (locale === 'de' ? 'Rechtliches' : 'Legal') : locale === 'de' ? 'Seite' : 'Page'}
          </p>
          <h1>{page.title}</h1>
        </section>

        <section className="section">
          <article className="content-page__card">
            <div className="content-page__body">
              {page.contentMarkdown?.trim() ? (
                renderMarkdown(page.contentMarkdown)
              ) : (
                <p>{locale === 'de' ? 'Diese Seite enthaelt noch keinen Inhalt.' : 'This page has no content yet.'}</p>
              )}
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
              {locale === 'de'
                ? 'IT Service, Blog und technische Inhalte auf einer gemeinsamen Payload-Basis. Klar, direkt und ohne unnoetigen Ueberbau.'
                : 'IT service, blog, and technical content on one shared Payload base. Clear, direct, and without unnecessary overhead.'}
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
