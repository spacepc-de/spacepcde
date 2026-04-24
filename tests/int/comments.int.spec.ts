import { describe, expect, it, vi } from 'vitest'

import {
  COMMENT_CONTENT_MAX_LENGTH,
  COMMENT_NAME_MAX_LENGTH,
  getApprovedCommentsForPost,
  normalizeCommentInput,
  validateCommentInput,
} from '@/lib/comments'

describe('comments helpers', () => {
  it('normalizes and validates valid input', () => {
    const input = normalizeCommentInput({
      authorEmail: '  test@example.com ',
      authorName: '  Alice ',
      content: '  Hallo Welt  ',
    })

    expect(input).toEqual({
      authorEmail: 'test@example.com',
      authorName: 'Alice',
      content: 'Hallo Welt',
    })
    expect(validateCommentInput(input)).toBeNull()
  })

  it('rejects invalid comment data', () => {
    expect(
      validateCommentInput({
        authorEmail: 'invalid',
        authorName: 'Alice',
        content: 'Hallo Welt',
      }),
    ).toBe('Bitte eine gültige E-Mail-Adresse angeben.')

    expect(
      validateCommentInput({
        authorEmail: 'test@example.com',
        authorName: 'A'.repeat(COMMENT_NAME_MAX_LENGTH + 1),
        content: 'Hallo Welt',
      }),
    ).toBe(`Der Name darf höchstens ${COMMENT_NAME_MAX_LENGTH} Zeichen lang sein.`)

    expect(
      validateCommentInput({
        authorEmail: 'test@example.com',
        authorName: 'Alice',
        content: 'A'.repeat(COMMENT_CONTENT_MAX_LENGTH + 1),
      }),
    ).toBe(`Der Kommentar darf höchstens ${COMMENT_CONTENT_MAX_LENGTH} Zeichen lang sein.`)
  })

  it('loads and maps approved comments for a post', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [
        {
          authorName: 'Alice',
          content: 'Root comment',
          createdAt: '2026-04-24T12:00:00.000Z',
          id: 1,
          parent: null,
        },
        {
          authorName: 'Bob',
          content: 'Reply',
          createdAt: '2026-04-24T12:05:00.000Z',
          id: 2,
          parent: { id: 1 },
        },
      ],
    })

    const comments = await getApprovedCommentsForPost({ find } as never, 42)

    expect(find).toHaveBeenCalledWith({
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
              equals: 42,
            },
          },
        ],
      },
    })
    expect(comments).toEqual([
      {
        authorName: 'Alice',
        content: 'Root comment',
        createdAt: '2026-04-24T12:00:00.000Z',
        id: 1,
        parent: null,
      },
      {
        authorName: 'Bob',
        content: 'Reply',
        createdAt: '2026-04-24T12:05:00.000Z',
        id: 2,
        parent: 1,
      },
    ])
  })
})
