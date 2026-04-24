import Link from 'next/link'
import { getPayload } from 'payload'

import { FrontendHeader } from '@/components/frontend/FrontendHeader'
import { getFallbackFooterLinks, mapLinks, type LocaleCode } from '@/lib/frontend'
import type { FooterLink } from '@/payload-types'
import { getPayloadConfig } from '@/payload.config'

const copy = {
  de: {
    blogHref: '/de/blog',
    blogLabel: 'Zum Blog',
    body:
      'Die angeforderte Seite existiert nicht mehr, wurde verschoben oder die URL ist falsch. Über die Startseite oder das Archiv kommst du schnell zurück zu den Inhalten.',
    eyebrow: '404',
    footerText: 'Technik verstehen. Systeme verbessern. Probleme lösen.',
    heading: 'Diese Seite wurde nicht gefunden.',
    homeHref: '/de',
    homeLabel: 'Zur Startseite',
    supportHref: 'https://spacepc.dev',
    supportLabel: 'Projekt anfragen',
    title: 'Seite nicht gefunden',
  },
  en: {
    blogHref: '/en/blog',
    blogLabel: 'Go to blog',
    body:
      'The page you requested no longer exists, was moved, or the URL is incorrect. The homepage and archive will get you back to the content quickly.',
    eyebrow: '404',
    footerText: 'Understand technology. Improve systems. Solve problems.',
    heading: 'This page could not be found.',
    homeHref: '/en',
    homeLabel: 'Back to homepage',
    supportHref: 'https://spacepc.dev',
    supportLabel: 'Start a project',
    title: 'Page not found',
  },
} as const

type Props = {
  locale: LocaleCode
}

async function getFooterLinks(locale: LocaleCode) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const footerResult = await payload.find({
    collection: 'footer-links',
    depth: 0,
    fallbackLocale: 'de',
    limit: 20,
    locale,
    sort: 'order',
  })

  return mapLinks(locale, footerResult.docs as FooterLink[], getFallbackFooterLinks(locale))
}

export async function FrontendNotFoundPage({ locale }: Props) {
  const localizedCopy = copy[locale]
  const footerLinks = await getFooterLinks(locale)

  return (
    <div className="site-shell">
      <FrontendHeader
        currentPath={localizedCopy.homeHref}
        locale={locale}
        localeSwitchHref={locale === 'de' ? '/en' : '/de'}
      />

      <main>
        <section className="section not-found-page">
          <div className="not-found-page__content">
            <p className="eyebrow">{localizedCopy.eyebrow}</p>
            <h1>{localizedCopy.heading}</h1>
            <p className="not-found-page__lead">{localizedCopy.body}</p>

            <div className="not-found-page__actions">
              <Link className="button button--primary" href={localizedCopy.homeHref}>
                {localizedCopy.homeLabel}
              </Link>
              <Link className="button button--secondary" href={localizedCopy.blogHref}>
                {localizedCopy.blogLabel}
              </Link>
            </div>

            <div className="not-found-page__panel">
              <h2>{localizedCopy.title}</h2>
              <p>
                {locale === 'de'
                  ? 'Wenn du eigentlich einen Artikel, eine Kategorie oder eine Seite erwartet hast, findest du die wichtigsten Wege hier.'
                  : 'If you expected an article, category, or page, the main routes are linked here.'}
              </p>
              <nav aria-label={locale === 'de' ? 'Wichtige Links' : 'Key links'} className="not-found-page__links">
                <Link href={localizedCopy.homeHref}>{localizedCopy.homeLabel}</Link>
                <Link href={localizedCopy.blogHref}>{localizedCopy.blogLabel}</Link>
                <a href={localizedCopy.supportHref} rel="noreferrer" target="_blank">
                  {localizedCopy.supportLabel}
                </a>
              </nav>
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
