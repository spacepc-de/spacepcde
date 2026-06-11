import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type ResolveResponse = {
  redirect?: {
    statusCode?: number
    toPath: string
  } | null
}

const SKIP_PREFIXES = ['/api', '/admin', '/_next', '/favicon', '/robots.txt', '/sitemap.xml']
const CANONICAL_HOST = 'spacepc.de'
const CANONICAL_HOSTS = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`])
const DISABLED_REDIRECT_PATHS = new Set([
  '/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir',
  '/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir/',
])
const LEGACY_DE_SLUGS = new Set([
  'anormales-verhalten-erkennen-mit-zabbix',
  'ansible-apache-playbook-installiere-deinen-apache-web-server-mit-ansible',
  'ansible-linux-update-status-abfragen',
  'ansible-playbook-installiere-msi-exe-dateien-automatisiert',
  'ansible-windows-update-statusabfrage',
  'ansible-zabbix-agent-installation-unter-windows',
  'arduino-sensordaten-via-bluetooth-le-uebertragen',
  'automatisiertes-abrufen-und-speichern-von-switch-konfigurationen-per-powershell-und-plink',
  'bodenfeuchtigkeit-messen-mit-dem-esp32-home-assistant-integration',
  'der-grosse-meshtastic-guide',
  'der-wismesh-repeater-mini-solar-im-winter',
  'esp32-stromsparend-betreiben-monate-laufzeit-mit-batterie-deep-sleep-wake-trigger-und-messwerte',
  'grafiken-auf-dem-waveshare-esp32-s3-147-touch-display-in-der-arduino-ide-so-laeufts-wirklich',
  'luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur',
  'nextcloud-installation-mit-docker-compose',
  'nrf52840-vs-esp32-welcher-chip-passt-zu-welchem-projekt',
  'outlook-e-mail-signatur-unter-windows-automatisieren',
  'radar-geschwindigkeitsmesser-mit-arduino-oder-esp32',
  'sensecap-solar-node-p1-pro-im-deutschen-winter-gescheitert',
  'spiderfoot-dein-ultimativer-guide-zur-nutzung',
  'waveshare-vs-gooddisplay-warum-viele-projekte-an-boards-libraries-micro-usb-und-ch340-scheitern',
  'wetter-display-mit-esp32-und-3d-druck-gehaeuse',
  'zabbix-installation-ubuntu-2204',
])
const LOCALE_HEADER = 'x-site-locale'
const STATIC_REDIRECTS: Record<string, string> = {
  '/wetter-display-mit-esp32-und-3d-druck-gehaeuse': '/de/wetter-display-mit-esp32-und-3d-druck-gehaeuse',
  '/wetter-display-mit-esp32-und-3d-druck-gehaeuse/': '/de/wetter-display-mit-esp32-und-3d-druck-gehaeuse',
  '/luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur':
    '/de/luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur',
  '/luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur/':
    '/de/luftqualitaetssensor-mittels-esp32-co2-luftfeuchtigkeit-temperatur',
  '/anormales-verhalten-erkennen-mit-zabbix': '/de/anormales-verhalten-erkennen-mit-zabbix',
  '/anormales-verhalten-erkennen-mit-zabbix/': '/de/anormales-verhalten-erkennen-mit-zabbix',
}

function getLocaleFromPathname(pathname: string) {
  if (pathname === '/de' || pathname.startsWith('/de/')) {
    return 'de'
  }

  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return 'en'
  }

  return null
}

function createNextResponseWithLocale(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers)
  const locale = getLocaleFromPathname(pathname)

  if (locale) {
    requestHeaders.set(LOCALE_HEADER, locale)
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

function createCanonicalURL(request: NextRequest) {
  const url = request.nextUrl.clone()
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const shouldUseHttps = url.protocol === 'http:' || forwardedProto === 'http'
  const shouldUseCanonicalHost = CANONICAL_HOSTS.has(url.hostname) && url.hostname !== CANONICAL_HOST

  if (!shouldUseHttps && !shouldUseCanonicalHost) {
    return null
  }

  url.protocol = 'https:'
  url.hostname = CANONICAL_HOST
  url.port = ''

  return url.toString() === request.nextUrl.toString() ? null : url
}

function createLegacyContentURL(request: NextRequest) {
  const { pathname } = request.nextUrl
  const destination = request.nextUrl.clone()

  if (pathname === '/blogindexpage' || pathname === '/blogindexpage/') {
    destination.pathname = '/de/blog'
    return destination
  }

  if (pathname.startsWith('/blogindexpage/')) {
    const slug = pathname.replace(/^\/blogindexpage\/+/, '').replace(/\/+$/, '')

    if (!LEGACY_DE_SLUGS.has(slug)) {
      return null
    }

    destination.pathname = `/de/${slug}`
    return destination
  }

  if (pathname.startsWith('/blog/')) {
    const slug = pathname.replace(/^\/blog\/+/, '').replace(/\/+$/, '')

    if (!LEGACY_DE_SLUGS.has(slug)) {
      return null
    }

    destination.pathname = `/de/${slug}`
    return destination
  }

  const singleSegmentMatch = pathname.match(/^\/([^/.]+)\/?$/)
  const slug = singleSegmentMatch?.[1]

  if (slug && LEGACY_DE_SLUGS.has(slug)) {
    destination.pathname = `/de/${slug}`
    return destination
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  const canonicalURL = createCanonicalURL(request)

  if (canonicalURL) {
    return NextResponse.redirect(canonicalURL, 301)
  }

  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (DISABLED_REDIRECT_PATHS.has(pathname)) {
    return createNextResponseWithLocale(request, pathname)
  }

  const legacyContentURL = createLegacyContentURL(request)

  if (legacyContentURL) {
    return NextResponse.redirect(legacyContentURL, 301)
  }

  if (pathname === '/') {
    const destination = new URL('/de', request.url)
    return NextResponse.redirect(destination, 301)
  }

  const staticRedirect = STATIC_REDIRECTS[pathname]

  if (staticRedirect) {
    const destination = new URL(staticRedirect, request.url)
    return NextResponse.redirect(destination, 301)
  }

  const resolveURL = new URL('/api/redirects/resolve', request.url)
  resolveURL.searchParams.set('pathname', pathname)

  try {
    const response = await fetch(resolveURL, {
      headers: {
        'x-redirect-check': '1',
      },
    })

    if (!response.ok) {
      return NextResponse.next()
    }

    const data = (await response.json()) as ResolveResponse
    const redirect = data.redirect

    if (!redirect?.toPath) {
      return createNextResponseWithLocale(request, pathname)
    }

    const destination = new URL(redirect.toPath, request.url)

    if (destination.pathname === pathname && destination.search === search) {
      return createNextResponseWithLocale(request, pathname)
    }

    return NextResponse.redirect(destination, redirect.statusCode === 302 ? 302 : 301)
  } catch {
    return createNextResponseWithLocale(request, pathname)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
