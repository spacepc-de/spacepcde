import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    const publicContentHeaders = [
      {
        key: 'Cache-Control',
        value: 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    ]

    return [
      {
        source: '/:locale(de|en)/:path*',
        headers: publicContentHeaders,
      },
      {
        source: '/sitemap.xml',
        headers: publicContentHeaders,
      },
      {
        source: '/robots.txt',
        headers: publicContentHeaders,
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/wetter-display-mit-esp32-und-3d-druck-gehaeuse',
        destination: '/de/wetter-display-mit-esp32-und-3d-druck-gehaeuse',
        permanent: true,
      },
      {
        source: '/luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur',
        destination: '/de/luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur',
        permanent: true,
      },
      {
        source: '/anormales-verhalten-erkennen-mit-zabbix',
        destination: '/de/anormales-verhalten-erkennen-mit-zabbix',
        permanent: true,
      },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/blog-images/**',
      },
      {
        pathname: '/api/media-proxy/**',
      },
      {
        pathname: '/api/media/file/**',
      },
    ],
    remotePatterns: [
      {
        hostname: 'm.media-amazon.com',
        protocol: 'https',
      },
    ],
  },
  // Packages with Cloudflare Workers (workerd) specific code
  // Read more: https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ['jose', 'pg-cloudflare'],

  // Your Next.js config here
  webpack: (webpackConfig: any) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
