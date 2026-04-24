import type { Payload } from 'payload'

export const COMMENT_NAME_MAX_LENGTH = 80
export const COMMENT_CONTENT_MIN_LENGTH = 3
export const COMMENT_CONTENT_MAX_LENGTH = 5000

export type ApprovedComment = {
  authorName: string
  content: string
  createdAt: string
  id: number
  parent: number | null
}

export type NormalizedCommentInput = {
  authorEmail: string
  authorName: string
  content: string
}

export function normalizeCommentInput(input: {
  authorEmail?: string | null
  authorName?: string | null
  content?: string | null
}): NormalizedCommentInput {
  return {
    authorEmail: input.authorEmail?.trim() || '',
    authorName: input.authorName?.trim() || '',
    content: input.content?.trim() || '',
  }
}

export function isValidCommentEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateCommentInput(input: NormalizedCommentInput) {
  if (!input.authorName || !input.authorEmail || !input.content) {
    return 'Bitte Name, E-Mail und Kommentar ausfüllen.'
  }

  if (!isValidCommentEmail(input.authorEmail)) {
    return 'Bitte eine gültige E-Mail-Adresse angeben.'
  }

  if (input.authorName.length > COMMENT_NAME_MAX_LENGTH) {
    return `Der Name darf höchstens ${COMMENT_NAME_MAX_LENGTH} Zeichen lang sein.`
  }

  if (input.content.length < COMMENT_CONTENT_MIN_LENGTH) {
    return 'Der Kommentar ist zu kurz.'
  }

  if (input.content.length > COMMENT_CONTENT_MAX_LENGTH) {
    return `Der Kommentar darf höchstens ${COMMENT_CONTENT_MAX_LENGTH} Zeichen lang sein.`
  }

  return null
}

type CommentDoc = {
  authorName: string
  content: string
  createdAt: string
  id: number
  parent?: number | { id?: number | null } | null
}

function getParentCommentId(parent: CommentDoc['parent']) {
  if (typeof parent === 'number') {
    return parent
  }

  if (typeof parent === 'object' && parent?.id) {
    return parent.id
  }

  return null
}

export async function getApprovedCommentsForPost(payload: Payload, postId: number): Promise<ApprovedComment[]> {
  const commentsResult = await payload.find({
    collection: 'comments',
    depth: 0,
    limit: 100,
    sort: 'createdAt',
    where: {
      and: [
        {
          approved: {
            equals: true,
          },
        },
        {
          post: {
            equals: postId,
          },
        },
      ],
    },
  })

  return (commentsResult.docs as CommentDoc[]).map((comment) => ({
    authorName: comment.authorName,
    content: comment.content,
    createdAt: comment.createdAt,
    id: comment.id,
    parent: getParentCommentId(comment.parent),
  }))
}
