import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { FrontendFooter } from '@/components/frontend/FrontendFooter'
import { FrontendHeader } from '@/components/frontend/FrontendHeader'
import { getLocalizedAlternates, type LocaleCode, isLocaleCode } from '@/lib/frontend'
import { getNetplanToolContent, getNetplanToolHref, NETPLAN_TOOL_SLUGS } from '@/lib/netplan'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  if (!isLocaleCode(locale)) {
    return {}
  }

  const content = getNetplanToolContent(locale, 'netplan-generator')

  return {
    alternates: getLocalizedAlternates(locale, 'tools'),
    description: content.toolIndexDescription,
    title: `${content.toolIndexTitle} | spacepc.de`,
  }
}

export default async function ToolsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!isLocaleCode(locale)) {
    notFound()
  }

  const content = getNetplanToolContent(locale, 'netplan-generator')

  return (
    <div className="site-shell">
      <FrontendHeader currentPath={`/${locale}/tools`} locale={locale as LocaleCode} />

      <main className="content-page tools-page">
        <section className="section tool-hero">
          <div className="tool-hero__copy tool-card">
            <p className="eyebrow">{locale === 'de' ? 'Tools' : 'Tools'}</p>
            <h1>{content.toolIndexTitle}</h1>
            <p className="tool-hero__lead">{content.toolIndexLead}</p>
          </div>
        </section>

        <section className="section tool-grid tool-grid--catalog">
          {NETPLAN_TOOL_SLUGS.map((slug) => {
            const item = getNetplanToolContent(locale, slug)
            return (
              <Link className="tool-card tool-catalog-card" href={getNetplanToolHref(locale, slug)} key={slug}>
                <p className="eyebrow">{item.heroEyebrow}</p>
                <h2>{item.title}</h2>
                <p>{item.lead}</p>
                <span className="tool-catalog-card__cta">
                  {locale === 'de' ? 'Zum Generator' : 'Open generator'}
                </span>
              </Link>
            )
          })}
        </section>
      </main>

      <FrontendFooter locale={locale} />
    </div>
  )
}
