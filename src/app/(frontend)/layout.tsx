import React from 'react'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'

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

export const metadata = {
  description:
    'Serioese, moderne Frontend-Oberflaeche fuer SpacePC mit Payload-gestuetzter Navigation, Blog- und Produktdarstellung.',
  title: 'spacepc.de | Systeme, Support und technische Inhalte',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="de">
      <body className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
        <main>{children}</main>
      </body>
    </html>
  )
}
