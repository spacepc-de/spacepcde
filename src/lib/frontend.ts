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
      href: `/${locale}`,
      label: locale === 'de' ? 'Start' : 'Home',
      openInNewTab: false,
    },
    {
      children: [
        {
          href: '/blog/tag/esp32',
          label: 'ESP32',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/arduino',
          label: 'Arduino',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/display',
          label: locale === 'de' ? 'Displays' : 'Displays',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/sensor',
          label: locale === 'de' ? 'Sensoren' : 'Sensors',
          openInNewTab: false,
        },
      ],
      href: '/blog/category/microcontroller',
      label: locale === 'de' ? 'Projekte' : 'Projects',
      openInNewTab: false,
    },
    {
      children: [
        {
          href: '/blog/tag/meshtastic',
          label: 'Meshtastic',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/meshcore',
          label: 'Meshcore',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/nordic-nrf',
          label: 'Nordic nRF',
          openInNewTab: false,
        },
      ],
      href: '/blog/category/mesh',
      label: locale === 'de' ? 'Funk & Mesh' : 'Radio & Mesh',
      openInNewTab: false,
    },
    {
      children: [
        {
          href: '/blog/tag/docker',
          label: 'Docker',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/linux',
          label: 'Linux',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/ansible',
          label: 'Ansible',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/monitoring',
          label: locale === 'de' ? 'Monitoring' : 'Monitoring',
          openInNewTab: false,
        },
      ],
      href: '/blog/category/software',
      label: locale === 'de' ? 'Server & Automation' : 'Servers & Automation',
      openInNewTab: false,
    },
    {
      children: [
        {
          href: '/blog/tag/wasserqualitat',
          label: locale === 'de' ? 'Wasserqualität' : 'Water quality',
          openInNewTab: false,
        },
        {
          href: '/blog/tag/ekg',
          label: 'EKG',
          openInNewTab: false,
        },
        {
          href: '/blog/category/gerate',
          label: locale === 'de' ? 'Geräte' : 'Devices',
          openInNewTab: false,
        },
      ],
      href: '/blog',
      label: locale === 'de' ? 'Ratgeber' : 'Guides',
      openInNewTab: false,
    },
    {
      children: [
        {
          href: '/tools/netplan-generator',
          label: 'Netplan Generator',
          openInNewTab: false,
        },
        {
          href: '/tools/netplan-static-ip-generator',
          label: locale === 'de' ? 'Static-IP Generator' : 'Static IP Generator',
          openInNewTab: false,
        },
        {
          href: '/tools/netplan-bridge-generator',
          label: 'Bridge Generator',
          openInNewTab: false,
        },
        {
          href: '/tools/netplan-vlan-generator',
          label: 'VLAN Generator',
          openInNewTab: false,
        },
      ],
      href: '/tools',
      label: 'Tools',
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
  const defaultPath = `/de${normalizedPath}`

  return {
    canonical: currentPath,
    languages: {
      de: `/de${normalizedPath}`,
      en: `/en${normalizedPath}`,
      'x-default': defaultPath,
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
  const canonical = paths[locale] || paths.de || paths.en || `/${locale}`
  const languages: Record<string, string> = {}

  if (paths.de) {
    languages.de = paths.de
    languages['x-default'] = paths.de
  }

  if (paths.en) {
    languages.en = paths.en
    languages['x-default'] ||= paths.en
  }

  return {
    canonical,
    languages,
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
