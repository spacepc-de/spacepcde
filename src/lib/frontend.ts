export type LocaleCode = 'de' | 'en'

export type LinkItem = {
  href: string
  label: string
  openInNewTab: boolean
}

export const SITE_URL = 'https://spacepc.de'

export function isLocaleCode(value: string): value is LocaleCode {
  return value === 'de' || value === 'en'
}

export function getFallbackNavItems(locale: LocaleCode): LinkItem[] {
  return [
    {
      href: `/${locale}#leistungen`,
      label: locale === 'de' ? 'Leistungen' : 'Services',
      openInNewTab: false,
    },
    { href: `/${locale}#wissen`, label: 'Blog', openInNewTab: false },
    {
      href: `/${locale}#produkte`,
      label: locale === 'de' ? 'Angebot' : 'Offer',
      openInNewTab: false,
    },
    {
      href: `/${locale}#kontakt`,
      label: locale === 'de' ? 'Kontakt' : 'Contact',
      openInNewTab: false,
    },
  ]
}

export function getFallbackFooterLinks(locale: LocaleCode): LinkItem[] {
  return [
    {
      href: locale === 'de' ? '/de/impressum' : '/en/imprint',
      label: locale === 'de' ? 'Impressum' : 'Imprint',
      openInNewTab: false,
    },
    {
      href: locale === 'de' ? '/de/datenschutz' : '/en/privacy-policy',
      label: locale === 'de' ? 'Datenschutz' : 'Privacy',
      openInNewTab: false,
    },
  ]
}

function localizeInternalHref(locale: LocaleCode, href: string) {
  if (!href) {
    return `/${locale}`
  }

  if (/^(https?:|mailto:|tel:)/.test(href)) {
    return href
  }

  if (href.startsWith('#')) {
    return `/${locale}${href}`
  }

  if (href === '/') {
    return `/${locale}`
  }

  if (/^\/(de|en)(\/|$)/.test(href)) {
    return href
  }

  if (href.startsWith('/')) {
    return `/${locale}${href}`
  }

  return `/${locale}/${href.replace(/^\/+/, '')}`
}

export function mapLinks(
  locale: LocaleCode,
  items: Array<{ href: string; label: string; openInNewTab?: boolean | null }>,
  fallback: LinkItem[],
): LinkItem[] {
  if (items.length === 0) {
    return fallback
  }

  return items.map((item) => ({
    href: localizeInternalHref(locale, item.href),
    label: item.label,
    openInNewTab: Boolean(item.openInNewTab),
  }))
}

export function getLocalizedAlternates(pathWithoutLocale = '') {
  const normalizedPath = pathWithoutLocale ? `/${pathWithoutLocale.replace(/^\/+/, '')}` : ''

  return {
    canonical: `/de${normalizedPath}`,
    languages: {
      de: `/de${normalizedPath}`,
      en: `/en${normalizedPath}`,
      'x-default': '/de',
    },
  }
}
