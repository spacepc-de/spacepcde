import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { getPayloadConfig } from '@/payload.config'

type RedirectDoc = {
  fromPath: string
  isEnabled?: boolean | null
  statusCode: '301' | '302'
  toPath: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const pathname = searchParams.get('pathname')?.trim()

    if (!pathname) {
      return NextResponse.json({ error: 'pathname fehlt.' }, { status: 400 })
    }

    const payload = await getPayload({ config: await getPayloadConfig() })
    const result = await payload.find({
      collection: 'redirects' as never,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          {
            fromPath: {
              equals: pathname,
            },
          },
          {
            isEnabled: {
              equals: true,
            },
          },
        ],
      },
    })

    const redirect = (result.docs[0] as RedirectDoc | undefined) ?? null

    if (!redirect) {
      return NextResponse.json({ redirect: null })
    }

    return NextResponse.json({
      redirect: {
        fromPath: redirect.fromPath,
        statusCode: Number(redirect.statusCode || '301'),
        toPath: redirect.toPath,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
