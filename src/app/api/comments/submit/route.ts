import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { normalizeCommentInput, validateCommentInput } from '@/lib/comments'
import { isCommentRateLimited } from '@/lib/commentRateLimit'
import { getPayloadConfig } from '@/payload.config'

type RequestBody = {
  authorEmail?: string
  authorName?: string
  content?: string
  parentId?: number | null
  postId?: number
  website?: string
}

const COMMENT_SUCCESS_MESSAGE = 'Kommentar eingereicht. Er wird nach Freigabe sichtbar.'
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5

function getClientIp(request: Request) {
  const cloudflareIp = request.headers.get('cf-connecting-ip')

  if (cloudflareIp) {
    return cloudflareIp.trim()
  }

  const forwardedFor = request.headers.get('x-forwarded-for')

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  return 'unknown'
}

async function getRateLimitKey(request: Request) {
  const clientIp = getClientIp(request)
  const userAgent = request.headers.get('user-agent')?.trim() || 'unknown'

  try {
    await getCloudflareContext({ async: true })

    return `${clientIp}:${userAgent}`
  } catch {
    return `${clientIp}:${userAgent}`
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const normalizedInput = normalizeCommentInput(body)
    const parentId = body.parentId ?? null
    const postId = body.postId
    const website = body.website?.trim()

    if (website) {
      return NextResponse.json({
        message: COMMENT_SUCCESS_MESSAGE,
        success: true,
      })
    }

    if (!postId) {
      return NextResponse.json({ error: 'Der Beitrag fehlt.' }, { status: 400 })
    }

    const validationError = validateCommentInput(normalizedInput)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const rateLimitKey = await getRateLimitKey(request)

    if (await isCommentRateLimited(rateLimitKey, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Zu viele Kommentare in kurzer Zeit. Bitte später erneut versuchen.' },
        { status: 429 },
      )
    }

    const payload = await getPayload({ config: await getPayloadConfig() })
    const post = await payload
      .findByID({
        collection: 'blog-posts',
        depth: 0,
        id: postId,
      })
      .catch((): null => null)

    if (!post) {
      return NextResponse.json(
        { error: 'Kommentare sind nur für veröffentlichte Beiträge möglich.' },
        { status: 400 },
      )
    }

    if (parentId) {
      const parentComment = await payload
        .findByID({
          collection: 'comments',
          depth: 0,
          id: parentId,
        })
        .catch((): null => null)

      if (!parentComment) {
        return NextResponse.json({ error: 'Antwortziel nicht gefunden.' }, { status: 400 })
      }

      const parentPostId =
        typeof parentComment.post === 'object' && parentComment.post
          ? parentComment.post.id
          : parentComment.post

      if (parentPostId !== postId) {
        return NextResponse.json(
          { error: 'Antwort und Beitrag passen nicht zusammen.' },
          { status: 400 },
        )
      }
    }

    const commentData = {
      approved: false,
      authorEmail: normalizedInput.authorEmail,
      authorName: normalizedInput.authorName,
      content: normalizedInput.content,
      parent: parentId || undefined,
      post: postId,
    } as Record<string, unknown>

    await payload.create({
      collection: 'comments',
      data: commentData as never,
      overrideAccess: true,
    })

    return NextResponse.json({
      message: COMMENT_SUCCESS_MESSAGE,
      success: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: `Kommentar konnte nicht gespeichert werden: ${message}` }, { status: 500 })
  }
}
