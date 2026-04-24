import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type ResolveResponse = {
  redirect?: {
    statusCode?: number
    toPath: string
  } | null
}

const SKIP_PREFIXES = ['/api', '/admin', '/_next', '/favicon', '/robots.txt', '/sitemap.xml']
const LOCALE_COOKIE = 'site-locale'
const LOCALE_HEADER = 'x-site-locale'
const STATIC_REDIRECTS: Record<string, string> = {
  '/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir': '/de/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir',
  '/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir/':
    '/de/meshtastic-vs-meshcore-welches-lora-mesh-passt-zu-dir',
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

function withLocaleCookie(response: NextResponse, pathname: string) {
  const locale = getLocaleFromPathname(pathname)

  if (locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    })
  }

  return response
}

function createNextResponseWithLocale(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers)
  const locale = getLocaleFromPathname(pathname)

  if (locale) {
    requestHeaders.set(LOCALE_HEADER, locale)
  }

  return withLocaleCookie(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    pathname,
  )
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (pathname === '/') {
    const destination = new URL('/de', request.url)
    return withLocaleCookie(NextResponse.redirect(destination, 301), destination.pathname)
  }

  const staticRedirect = STATIC_REDIRECTS[pathname]

  if (staticRedirect) {
    const destination = new URL(staticRedirect, request.url)
    return withLocaleCookie(NextResponse.redirect(destination, 301), destination.pathname)
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

    return withLocaleCookie(
      NextResponse.redirect(destination, redirect.statusCode === 302 ? 302 : 301),
      destination.pathname,
    )
  } catch {
    return createNextResponseWithLocale(request, pathname)
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
