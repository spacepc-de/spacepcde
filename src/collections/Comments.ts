import type { CollectionConfig } from 'payload'

export const Comments: CollectionConfig = {
  slug: 'comments',
  access: {
    create: () => true,
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
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'approvedAt',
      type: 'date',
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
