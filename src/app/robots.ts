import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/frontend'

export default function robots(): MetadataRoute.Robots {
  return {
    host: SITE_URL,
    rules: [
      {
        allow: '/',
        disallow: ['/de/impressum', '/en/imprint', '/de/datenschutz', '/en/privacy'],
        userAgent: '*',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
