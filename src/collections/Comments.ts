import type { CollectionConfig } from 'payload'

import { normalizeCommentInput, validateCommentInput } from '../lib/comments'

function getRelationshipId(value: number | { id?: number | null } | null | undefined) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'object' && value?.id) {
    return value.id
  }

  return null
}

export const Comments: CollectionConfig = {
  slug: 'comments',
  access: {
    create: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
    read: ({ req }) => {
      if (req.user) {
        return true
      }

      return {
        approved: {
          equals: true,
        },
      }
    },
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    group: 'Blog',
    useAsTitle: 'authorName',
    defaultColumns: ['authorName', 'post', 'approved', 'createdAt'],
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) {
          return data
        }

        const postId = getRelationshipId(data.post as number | { id?: number | null } | null | undefined)
        const parentId = getRelationshipId(data.parent as number | { id?: number | null } | null | undefined)

        if (!postId) {
          throw new Error('Der Kommentar verweist auf keinen gültigen Beitrag.')
        }

        const normalizedInput = normalizeCommentInput({
          authorEmail: typeof data.authorEmail === 'string' ? data.authorEmail : null,
          authorName: typeof data.authorName === 'string' ? data.authorName : null,
          content: typeof data.content === 'string' ? data.content : null,
        })
        const validationError = validateCommentInput(normalizedInput)

        if (validationError) {
          throw new Error(validationError)
        }

        const post = await req.payload
          .findByID({
            collection: 'blog-posts',
            depth: 0,
            id: postId,
          })
          .catch((): null => null)

        if (!post) {
          throw new Error('Kommentare sind nur für veröffentlichte Beiträge möglich.')
        }

        if (parentId) {
          const parent = await req.payload
            .findByID({
              collection: 'comments',
              depth: 0,
              id: parentId,
            })
            .catch((): null => null)

          if (!parent) {
            throw new Error('Antwortziel nicht gefunden.')
          }

          const parentPostId = getRelationshipId(
            parent.post as number | { id?: number | null } | null | undefined,
          )

          if (parentPostId !== postId) {
            throw new Error('Antwort und Beitrag passen nicht zusammen.')
          }
        }

        if (req.user) {
          return {
            ...data,
            authorEmail: normalizedInput.authorEmail,
            authorName: normalizedInput.authorName,
            content: normalizedInput.content,
            parent: parentId ?? undefined,
            post: postId,
          }
        }

        return {
          ...data,
          approved: false,
          approvedAt: null,
          authorEmail: normalizedInput.authorEmail,
          authorName: normalizedInput.authorName,
          content: normalizedInput.content,
          parent: parentId ?? undefined,
          post: postId,
        }
      },
    ],
  },
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'blog-posts' as any,
      required: true,
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'comments' as any,
      admin: {
        description: 'Optional: Antwort auf einen bestehenden Kommentar.',
        position: 'sidebar',
      },
    },
    {
      name: 'authorName',
      type: 'text',
      required: true,
    },
    {
      name: 'authorEmail',
      type: 'email',
      required: true,
      access: {
        read: ({ req }) => Boolean(req.user),
      },
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
      admin: {
        rows: 8,
      },
    },
    {
      name: 'approved',
      type: 'checkbox',
      defaultValue: false,
      access: {
        create: ({ req }) => Boolean(req.user),
        read: ({ req }) => Boolean(req.user),
        update: ({ req }) => Boolean(req.user),
      },
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'approvedAt',
      type: 'date',
      access: {
        create: ({ req }) => Boolean(req.user),
        read: ({ req }) => Boolean(req.user),
        update: ({ req }) => Boolean(req.user),
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ data, originalDoc, value }) => {
            const nextApproved = Boolean(data?.approved)
            const wasApproved = Boolean(originalDoc?.approved)

            if (nextApproved && !wasApproved) {
              return new Date().toISOString()
            }

            if (!nextApproved) {
              return null
            }

            return value ?? originalDoc?.approvedAt ?? null
          },
        ],
      },
    },
  ],
}
