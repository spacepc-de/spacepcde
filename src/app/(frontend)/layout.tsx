import React from 'react'
import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'

import { SITE_URL, isLocaleCode } from '@/lib/frontend'

import './styles.css'

const ibmPlexSans = IBM_Plex_Sans({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

const ibmPlexMono = IBM_Plex_Mono({
  display: 'swap',
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['500', '600'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  description:
    'Serioese, moderne Frontend-Oberflaeche fuer SpacePC mit Payload-gestuetzter Navigation, Blog- und Produktdarstellung.',
  title: 'spacepc.de | Systeme, Support und technische Inhalte',
}

export default async function RootLayout(props: {
  children: React.ReactNode
  params: Promise<{ locale?: string }>
}) {
  const { children, params } = props
  const { locale } = await params
  const lang = isLocaleCode(locale ?? '') ? locale : 'de'

  return (
    <html lang={lang}>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
        <main>{children}</main>
      </body>
    </html>
  )
}
