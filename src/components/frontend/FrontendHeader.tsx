import { getPayload } from 'payload'

import { getFallbackNavItems, mapLinks, type LinkItem, type LocaleCode } from '@/lib/frontend'
import type { NavigationLink } from '@/payload-types'
import { getPayloadConfig } from '@/payload.config'

import { SiteHeader } from './SiteHeader'

type Props = {
  currentPath: string
  locale: LocaleCode
  localeSwitchHref?: string
  navItems?: LinkItem[]
}

export async function FrontendHeader({ currentPath, locale, localeSwitchHref, navItems: navItemsProp }: Props) {
  let navItems = navItemsProp

  if (!navItems) {
    const payload = await getPayload({ config: await getPayloadConfig() })
    const navigationResult = await payload.find({
      collection: 'navigation-links',
      depth: 0,
      fallbackLocale: 'de',
      limit: 20,
      locale,
      sort: 'order',
    })

    navItems = mapLinks(
      locale,
      navigationResult.docs as NavigationLink[],
      getFallbackNavItems(locale),
    )
  }

  return (
    <SiteHeader
      contactHref="https://spacepc.dev"
      contactLabel={locale === 'de' ? 'Projekt anfragen' : 'Start a project'}
      currentPath={currentPath}
      locale={locale}
      localeSwitchHref={localeSwitchHref}
      navItems={navItems}
    />
  )
}
