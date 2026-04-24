import type { Metadata } from 'next'

import { FrontendNotFoundPage } from '@/components/frontend/FrontendNotFoundPage'
import { isLocaleCode } from '@/lib/frontend'

type Args = {
  params: Promise<{
    locale: string
  }>
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { locale } = await params
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
  const { locale } = await params

  return <FrontendNotFoundPage locale={isLocaleCode(locale) ? locale : 'de'} />
}
