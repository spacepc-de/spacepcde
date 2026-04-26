import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import { syncBlogContent } from '@/lib/blogContent'
import { getPayloadConfig } from '@/payload.config'

type RequestBody = {
  collectionSlug?: string
  input?: {
    content?: unknown
    contentMarkdown?: string
  }
}

const formatMarkdownCollectionPolicy = new Set(['blog-posts'])

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const { collectionSlug, input } = body

    if (!collectionSlug || !input) {
      return NextResponse.json({ error: 'Unvollständige Anfrage.' }, { status: 400 })
    }

    if (!formatMarkdownCollectionPolicy.has(collectionSlug)) {
      return NextResponse.json({ error: 'Collection ist für diese Aktion nicht freigeschaltet.' }, { status: 400 })
    }

    const payloadConfig = await getPayloadConfig()
    const payload = await getPayload({ config: payloadConfig })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
    }

    const syncedContent = await syncBlogContent({
      config: payloadConfig,
      content: input.content,
      contentMarkdown: input.contentMarkdown,
      // The button lives in the Markdown tab, so Markdown is treated as source of truth.
      originalContentMarkdown: typeof input.contentMarkdown === 'string' ? '' : undefined,
    })

    const hasMarkdown =
      typeof syncedContent.contentMarkdown === 'string' && syncedContent.contentMarkdown.trim().length > 0

    if (!syncedContent.content && !hasMarkdown) {
      return NextResponse.json({ error: 'Kein Inhalt zum Formatieren vorhanden.' }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Markdown wurde formatiert und synchronisiert.',
      result: {
        content: syncedContent.content,
        contentMarkdown: syncedContent.contentMarkdown,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('format-markdown failed', error)

    return NextResponse.json({ error: `Markdown-Formatierung fehlgeschlagen: ${message}` }, { status: 500 })
  }
}
