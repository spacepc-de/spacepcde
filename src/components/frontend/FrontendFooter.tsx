import { getPayload } from 'payload'

import { getFallbackFooterLinks, mapLinks, type LocaleCode } from '@/lib/frontend'
import type { FooterLink } from '@/payload-types'
import { getPayloadConfig } from '@/payload.config'

type Props = {
  locale: LocaleCode
}

export async function FrontendFooter({ locale }: Props) {
  const payload = await getPayload({ config: await getPayloadConfig() })
  const footerResult = await payload.find({
    collection: 'footer-links',
    depth: 0,
    fallbackLocale: 'de',
    limit: 20,
    locale,
    sort: 'order',
  })

  const footerLinks = mapLinks(locale, footerResult.docs as FooterLink[], getFallbackFooterLinks(locale))

  return (
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
              ? 'Werkzeuge, technische Inhalte und Infrastrukturwissen auf einer gemeinsamen Frontend-Basis.'
              : 'Tools, technical content, and infrastructure knowledge on one shared frontend base.'}
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
  )
}
