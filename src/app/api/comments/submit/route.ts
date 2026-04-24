import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { getPayloadConfig } from '@/payload.config'

type RequestBody = {
  authorEmail?: string
  authorName?: string
  content?: string
  parentId?: number | null
  postId?: number
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const authorEmail = body.authorEmail?.trim()
    const authorName = body.authorName?.trim()
    const content = body.content?.trim()
    const parentId = body.parentId ?? null
    const postId = body.postId

    if (!postId || !authorName || !authorEmail || !content) {
      return NextResponse.json({ error: 'Bitte Name, E-Mail und Kommentar ausfüllen.' }, { status: 400 })
    }

    const payload = await getPayload({ config: await getPayloadConfig() })

    await payload.create({
      collection: 'comments',
      data: {
        approved: false,
        authorEmail,
        authorName,
        content,
        parent: parentId || undefined,
        post: postId,
      } as any,
      overrideAccess: true,
    })

    return NextResponse.json({
      message: 'Kommentar eingereicht. Er wird nach Freigabe sichtbar.',
      success: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: `Kommentar konnte nicht gespeichert werden: ${message}` }, { status: 500 })
  }
}
