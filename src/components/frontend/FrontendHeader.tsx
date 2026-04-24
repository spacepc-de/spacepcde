import { getPayload } from 'payload'

import { getFallbackNavItems, mapLinks, type LocaleCode } from '@/lib/frontend'
import type { NavigationLink } from '@/payload-types'
import { getPayloadConfig } from '@/payload.config'

import { SiteHeader } from './SiteHeader'

type Props = {
  currentPath: string
  locale: LocaleCode
  localeSwitchHref?: string
}

export async function FrontendHeader({ currentPath, locale, localeSwitchHref }: Props) {
  const payload = await getPayload({ config: await getPayloadConfig() })

  const navigationResult = await payload.find({
    collection: 'navigation-links',
    depth: 0,
    fallbackLocale: 'de',
    limit: 20,
    locale,
    sort: 'order',
  })

  const navItems = mapLinks(
    locale,
    navigationResult.docs as NavigationLink[],
    getFallbackNavItems(locale),
  )

  return (
    <SiteHeader
      contactHref="https://spacepc.dev"
      contactLabel="IT Service"
      currentPath={currentPath}
      locale={locale}
      localeSwitchHref={localeSwitchHref}
      navItems={navItems}
    />
  )
}
