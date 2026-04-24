import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { getApprovedCommentsForPost } from '@/lib/comments'
import { getPayloadConfig } from '@/payload.config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const postId = Number(searchParams.get('postId'))

  if (!Number.isInteger(postId) || postId <= 0) {
    return NextResponse.json({ error: 'Der Beitrag fehlt.' }, { status: 400 })
  }

  const payload = await getPayload({ config: await getPayloadConfig() })
  const comments = await getApprovedCommentsForPost(payload, postId)

  return NextResponse.json(
    { comments },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
