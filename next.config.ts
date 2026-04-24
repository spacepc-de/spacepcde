import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir',
        destination: '/de/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir',
        permanent: true,
      },
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
