import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type ResolveResponse = {
  redirect?: {
    statusCode?: number
    toPath: string
  } | null
}

const SKIP_PREFIXES = ['/api', '/admin', '/_next', '/favicon', '/robots.txt', '/sitemap.xml']

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (pathname === '/') {
    const destination = new URL('/de', request.url)
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
      return NextResponse.next()
    }

    const destination = new URL(redirect.toPath, request.url)

    if (destination.pathname === pathname && destination.search === search) {
      return NextResponse.next()
    }

    return NextResponse.redirect(destination, redirect.statusCode === 302 ? 302 : 301)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\..*).*)'],
}
