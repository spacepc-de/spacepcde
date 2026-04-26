import type { Metadata } from 'next'

import { FrontendNotFoundPage } from '@/components/frontend/FrontendNotFoundPage'
import type { LocaleCode } from '@/lib/frontend'

type Args = {
  params?: Promise<{
    locale?: string
  }>
}

async function resolveLocale(params: Args['params']): Promise<LocaleCode> {
  const locale = (await params)?.locale
  if (locale === 'de' || locale === 'en') {
    return locale
  }

  return 'de'
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const locale = await resolveLocale(params)
  const isEnglish = locale === 'en'

  return {
    description: isEnglish
      ? 'The requested page could not be found.'
      : 'Die angeforderte Seite konnte nicht gefunden werden.',
    robots: {
      follow: true,
      index: false,
    },
    title: isEnglish ? 'Page not found | spacepc.de' : 'Seite nicht gefunden | spacepc.de',
  }
}

export default async function LocaleNotFound({ params }: Args) {
  const locale = await resolveLocale(params)
  return <FrontendNotFoundPage locale={locale} />
}
