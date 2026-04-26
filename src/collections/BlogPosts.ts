import type { CollectionConfig } from 'payload'

import { withAIButton } from '../fields/aiButton'
import { slugField } from '../fields/slug'
import { withTranslationButton } from '../fields/translationButton'
import { blogContentEditor } from '../lib/blogContent'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  access: {
    read: ({ req }) => {
      if (req.user) {
        return true
      }

      return {
        status: {
          equals: 'published',
        },
      }
    },
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (!data) {
          return data
        }

        const nextStatus = data.status
        const previousStatus = originalDoc?.status

        if (nextStatus === 'published' && !data.publishedAt) {
          return {
            ...data,
            publishedAt: originalDoc?.publishedAt || new Date().toISOString(),
          }
        }

        if (nextStatus === 'draft' && previousStatus !== 'published') {
          return {
            ...data,
            publishedAt: data.publishedAt || originalDoc?.publishedAt || null,
          }
        }

        return data
      },
    ],
  },
  admin: {
    group: 'Blog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'featured', 'author', 'publishedAt', 'updatedAt'],
  },
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'translationActions',
      type: 'ui',
      admin: {
        components: {
          Field: './components/admin/TranslateAllButton#TranslateAllButton',
        },
      },
    },
    withTranslationButton({
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    }),
    slugField(),
    withTranslationButton({
      name: 'excerpt',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Kurzer Teaser für Übersichten und SEO',
      },
    }),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Editor',
          fields: [
            withAIButton({
              name: 'content',
              type: 'richText',
              required: true,
              localized: true,
              editor: blogContentEditor,
              admin: {
                description:
                  'WYSIWYG-Editor für den Beitrag. Markdown-Shortcuts wie #, ## oder - funktionieren direkt beim Tippen.',
              },
            }, 'rewriteMarkdown'),
          ],
        },
        {
          label: 'Markdown',
          fields: [
            {
              name: 'markdownActions',
              type: 'ui',
              admin: {
                components: {
                  Field: './components/admin/MarkdownFormatAction#MarkdownFormatAction',
                },
              },
            },
            withTranslationButton({
              name: 'contentMarkdown',
              type: 'code',
              localized: true,
              admin: {
                language: 'markdown',
                description:
                  'Alternativ den Inhalt direkt als Markdown bearbeiten. Über den Button oben kannst du Markdown formatieren und den Editor manuell synchronisieren.',
              },
            }),
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'seoActions',
              type: 'ui',
              admin: {
                components: {
                  Field: './components/admin/SeoAIActions#SeoAIActions',
                },
              },
            },
            withTranslationButton({
              name: 'seoTitle',
              type: 'text',
              localized: true,
              admin: {
                description: 'SEO-Titel für Suchmaschinen und Social Previews.',
              },
            }),
            withTranslationButton({
              name: 'seoDescription',
              type: 'textarea',
              localized: true,
              admin: {
                description: 'SEO-Beschreibung für Suchmaschinen und Social Previews.',
              },
            }),
          ],
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      index: true,
      options: [
        {
          label: 'Draft',
          value: 'draft',
        },
        {
          label: 'Published',
          value: 'published',
        },
      ],
      admin: {
        position: 'sidebar',
      },
      required: true,
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
      label: 'Featured',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors' as any,
      required: true,
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories' as any,
      hasMany: true,
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags' as any,
      hasMany: true,
    },
    {
      name: 'productGroups',
      type: 'relationship',
      relationTo: 'product-groups' as any,
      hasMany: true,
      label: 'Produktgruppen',
    },
    {
      name: 'featuredImage',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
