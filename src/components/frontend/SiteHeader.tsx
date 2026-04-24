import Link from 'next/link'

import { getLocaleSwitchHref, type LinkItem, type LocaleCode } from '@/lib/frontend'

type Props = {
  contactLabel: string
  contactHref: string
  currentPath: string
  locale: LocaleCode
  localeSwitchHref?: string
  navItems: LinkItem[]
}

export function SiteHeader({ contactHref, contactLabel, currentPath, locale, localeSwitchHref: localeSwitchHrefProp, navItems }: Props) {
  const targetLocale: LocaleCode = locale === 'de' ? 'en' : 'de'
  const localeSwitchHref = localeSwitchHrefProp || getLocaleSwitchHref(locale, targetLocale, currentPath)

  return (
    <header className="site-header">
      <nav aria-label="Hauptnavigation" className="site-nav">
        <Link className="brand" href={`/${locale}`}>
          <span>spacepc</span>
          <span className="brand__dot">.</span>
          <span>de</span>
        </Link>

        <div className="site-nav__links">
          {navItems.map((item) => (
            <div className="site-nav__item" key={`${item.label}-${item.href}`}>
              <a
                className="site-nav__link"
                href={item.href}
                rel={item.openInNewTab ? 'noreferrer' : undefined}
                target={item.openInNewTab ? '_blank' : undefined}
              >
                <span>{item.label}</span>
                {item.children?.length ? <span aria-hidden="true" className="site-nav__caret">+</span> : null}
              </a>

              {item.children?.length ? (
                <div className="site-nav__submenu">
                  {item.children.map((child) => (
                    <a
                      className="site-nav__submenu-link"
                      href={child.href}
                      key={`${child.label}-${child.href}`}
                      rel={child.openInNewTab ? 'noreferrer' : undefined}
                      target={child.openInNewTab ? '_blank' : undefined}
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="site-nav__actions">
          <Link
            aria-label={`Switch language to ${targetLocale.toUpperCase()}`}
            className="site-nav__locale"
            href={localeSwitchHref}
          >
            {targetLocale.toUpperCase()}
          </Link>

          <Link className="site-nav__cta" href={contactHref}>
            {contactLabel}
          </Link>
        </div>
      </nav>
    </header>
  )
}
