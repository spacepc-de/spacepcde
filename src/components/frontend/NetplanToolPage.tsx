import Link from 'next/link'

import { getNetplanToolContent, getNetplanToolHref, getRelatedNetplanTools, type NetplanToolSlug } from '@/lib/netplan'
import type { LocaleCode } from '@/lib/frontend'

import { FrontendFooter } from './FrontendFooter'
import { FrontendHeader } from './FrontendHeader'
import { NetplanBuilder } from './NetplanBuilder'

type Props = {
  locale: LocaleCode
  slug: NetplanToolSlug
}

export async function NetplanToolPage({ locale, slug }: Props) {
  const content = getNetplanToolContent(locale, slug)
  const related = getRelatedNetplanTools(slug)

  return (
    <div className="site-shell">
      <FrontendHeader currentPath={getNetplanToolHref(locale, slug)} locale={locale} />

      <main className="content-page tools-page">
        <section className="section tool-hero">
          <div className="tool-hero__copy tool-card">
            <p className="eyebrow">{content.heroEyebrow}</p>
            <h1>{content.title}</h1>
            <p className="tool-hero__lead">{content.lead}</p>
            <p className="tool-hero__sublead">{content.staticIpLead}</p>

            <div className="tool-chip-row">
              {content.useCases.slice(0, 4).map((item) => (
                <span className="tag-pill tag-pill--neutral" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section tool-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{content.builderEyebrow}</p>
              <h2>{content.title}</h2>
            </div>
            <p className="tool-section__lead">{content.builderLead}</p>
          </div>

          <NetplanBuilder initialPreset={getRelatedPreset(slug)} locale={locale} />
        </section>

        <section className="section tool-grid">
          <article className="tool-card tool-copy-card">
            <p className="eyebrow">{content.featureLabel}</p>
            <h2>{locale === 'de' ? 'Direkt im Browser nutzbar' : 'Ready in the browser'}</h2>
            <ul className="tool-copy-card__list">
              {content.features.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="tool-card tool-copy-card">
            <p className="eyebrow">{content.useCaseLabel}</p>
            <h2>{locale === 'de' ? 'Typische Setups' : 'Typical setups'}</h2>
            <ul className="tool-copy-card__list">
              {content.useCases.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="section tool-grid">
          <article className="tool-card tool-copy-card">
            <p className="eyebrow">{content.answerLabel}</p>
            <h2>{locale === 'de' ? 'Häufige Fragen' : 'Frequently asked questions'}</h2>
            <div className="tool-faq">
              {content.faq.map((item) => (
                <details className="tool-faq__item" key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </article>

          <article className="tool-card tool-copy-card">
            <p className="eyebrow">{content.relatedLabel}</p>
            <h2>{locale === 'de' ? 'Weitere Generatoren' : 'More generators'}</h2>
            <p className="tool-section__lead">{content.relatedLead}</p>
            <div className="tool-related-links">
              {related.map((relatedSlug) => {
                const relatedContent = getNetplanToolContent(locale, relatedSlug)
                return (
                  <Link className="tool-related-link" href={getNetplanToolHref(locale, relatedSlug)} key={relatedSlug}>
                    <strong>{relatedContent.title}</strong>
                    <span>{relatedContent.staticIpLead}</span>
                  </Link>
                )
              })}
            </div>
          </article>
        </section>
      </main>

      <FrontendFooter locale={locale} />
    </div>
  )
}

function getRelatedPreset(slug: NetplanToolSlug) {
  if (slug === 'netplan-static-ip-generator') {
    return 'static'
  }

  if (slug === 'netplan-bridge-generator') {
    return 'bridge'
  }

  if (slug === 'netplan-vlan-generator') {
    return 'vlan'
  }

  return 'general'
}
