import React from 'react'
import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import { notFound } from 'next/navigation'

import { SITE_URL, isLocaleCode } from '@/lib/frontend'

import '../styles.css'

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
    'Seriöse, moderne Frontend-Oberfläche für SpacePC mit Payload-gestützter Navigation, Blog- und Produktdarstellung.',
  title: 'spacepc.de | Systeme, Support und technische Inhalte',
}

export default async function LocaleRootLayout(props: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { children, params } = props
  const { locale } = await params

  if (!isLocaleCode(locale)) {
    notFound()
  }

  return (
    <html lang={locale}>
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
        <main>{children}</main>
      </body>
    </html>
  )
}
