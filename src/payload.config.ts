import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig, type SanitizedConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'

import { Authors } from './collections/Authors'
import { BlogPosts } from './collections/BlogPosts'
import { Categories } from './collections/Categories'
import { Comments } from './collections/Comments'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { FooterLinks } from './collections/FooterLinks'
import { NavigationLinks } from './collections/NavigationLinks'
import { Pages } from './collections/Pages'
import { ProductGroups } from './collections/ProductGroups'
import { Redirects } from './collections/Redirects'
import { Tags } from './collections/Tags'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)

const isCLI = process.argv.some((value) => realpath(value).endsWith(path.join('payload', 'bin.js')))
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any // Use PayloadLogger type when it's exported

let cachedConfigPromise: Promise<SanitizedConfig> | undefined

export function getPayloadConfig(): Promise<SanitizedConfig> {
  cachedConfigPromise ??= (async () => {
    const cloudflare =
      isCLI || !isProduction
        ? await getCloudflareContextFromWrangler()
        : await getCloudflareContext({ async: true })

    return buildConfig({
      admin: {
        user: Users.slug,
        importMap: {
          baseDir: path.resolve(dirname),
        },
      },
      collections: [
        Users,
        Media,
        Authors,
        Categories,
        Tags,
        ProductGroups,
        BlogPosts,
        Pages,
        Redirects,
        Comments,
        NavigationLinks,
        FooterLinks,
      ],
      editor: lexicalEditor(),
      localization: {
        defaultLocale: 'de',
        fallback: true,
        locales: [
          {
            code: 'de',
            label: {
              en: 'German',
              de: 'Deutsch',
            },
          },
          {
            code: 'en',
            label: {
              en: 'English',
              de: 'Englisch',
            },
          },
        ],
      },
      secret: process.env.PAYLOAD_SECRET || '',
      typescript: {
        outputFile: path.resolve(dirname, 'payload-types.ts'),
      },
      db: sqliteD1Adapter({
        binding: cloudflare.env.D1,
        prodMigrations: migrations,
        push: false,
      }),
      logger: isProduction ? cloudflareLogger : undefined,
      plugins: [
        r2Storage({
          bucket: cloudflare.env.R2,
          collections: { media: true },
        }),
      ],
    })
  })()

  return cachedConfigPromise
}

const payloadConfig = {
  then<TResult1 = SanitizedConfig, TResult2 = never>(
    onfulfilled?:
      | ((value: SanitizedConfig) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
  ) {
    return getPayloadConfig().then(onfulfilled, onrejected)
  },
} as Promise<SanitizedConfig>

export default payloadConfig

// Adapted from https://github.com/opennextjs/opennextjs-cloudflare/blob/d00b3a13e42e65aad76fba41774815726422cc39/packages/cloudflare/src/api/cloudflare-context.ts#L328C36-L328C46
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
