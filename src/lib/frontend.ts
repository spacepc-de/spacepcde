export type LocaleCode = 'de' | 'en'

export type LinkItem = {
  children?: LinkItem[]
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
      children: [
        {
          href: '/tools/netplan-generator',
          label: locale === 'de' ? 'Netplan Generator' : 'Netplan Generator',
          openInNewTab: false,
        },
        {
          href: '/tools/netplan-static-ip-generator',
          label: locale === 'de' ? 'Static IP Generator' : 'Static IP Generator',
          openInNewTab: false,
        },
        {
          href: '/tools/netplan-bridge-generator',
          label: locale === 'de' ? 'Bridge Generator' : 'Bridge Generator',
          openInNewTab: false,
        },
        {
          href: '/tools/netplan-vlan-generator',
          label: locale === 'de' ? 'VLAN Generator' : 'VLAN Generator',
          openInNewTab: false,
        },
      ],
      href: `/${locale}/tools`,
      label: locale === 'de' ? 'Tools' : 'Tools',
      openInNewTab: false,
    },
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

type LinkInput = {
  children?: LinkInput[] | null
  href: string
  label: string
  openInNewTab?: boolean | null
}

function mapLinkItem(locale: LocaleCode, item: LinkInput): LinkItem {
  return {
    children: Array.isArray(item.children)
      ? item.children
          .filter((child): child is LinkInput => Boolean(child?.label && child?.href))
          .map((child) => mapLinkItem(locale, child))
      : [],
    href: localizeInternalHref(locale, item.href),
    label: item.label,
    openInNewTab: Boolean(item.openInNewTab),
  }
}

export function mapLinks(
  locale: LocaleCode,
  items: LinkInput[],
  fallback: LinkItem[],
): LinkItem[] {
  if (items.length === 0) {
    return fallback
  }

  return items
    .filter((item): item is LinkInput => Boolean(item?.label && item?.href))
    .map((item) => mapLinkItem(locale, item))
}

export function getLocalizedAlternates(locale: LocaleCode, pathWithoutLocale = '') {
  const normalizedPath = pathWithoutLocale ? `/${pathWithoutLocale.replace(/^\/+/, '')}` : ''
  const currentPath = `/${locale}${normalizedPath}`

  return {
    canonical: currentPath,
    languages: {
      de: `/de${normalizedPath}`,
      en: `/en${normalizedPath}`,
      'x-default': '/de',
    },
  }
}

export function getExactLocalizedAlternates(
  locale: LocaleCode,
  paths: {
    de?: string
    en?: string
  },
) {
  const dePath = paths.de || '/de'
  const enPath = paths.en || '/en'

  return {
    canonical: locale === 'de' ? dePath : enPath,
    languages: {
      de: dePath,
      en: enPath,
      'x-default': '/de',
    },
  }
}

export function getLocaleSwitchHref(currentLocale: LocaleCode, targetLocale: LocaleCode, currentPath: string) {
  if (!currentPath) {
    return `/${targetLocale}`
  }

  if (currentPath === `/${currentLocale}`) {
    return `/${targetLocale}`
  }

  if (currentPath.startsWith(`/${currentLocale}/`)) {
    return `/${targetLocale}${currentPath.slice(currentLocale.length + 1)}`
  }

  if (currentPath === '/') {
    return `/${targetLocale}`
  }

  return currentPath
}
