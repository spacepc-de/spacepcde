import type { Metadata } from 'next'

import { FrontendNotFoundPage } from '@/components/frontend/FrontendNotFoundPage'

import '../(frontend)/styles.css'

export const metadata: Metadata = {
  description: 'Die angeforderte Seite konnte nicht gefunden werden.',
  robots: {
    follow: true,
    index: false,
  },
  title: 'Seite nicht gefunden | spacepc.de',
}

export default function RootNotFound() {
  return <FrontendNotFoundPage locale="de" />
}
