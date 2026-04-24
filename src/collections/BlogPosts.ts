import type { CollectionConfig } from 'payload'

import { withAIButton } from '../fields/aiButton'
import { slugField } from '../fields/slug'
import { withTranslationButton } from '../fields/translationButton'
import { blogContentEditor, syncBlogContent } from '../lib/blogContent'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  access: {
    read: () => true,
  },
  hooks: {
    afterRead: [
      async ({ doc, req }) => {
        if (!doc) {
          return doc
        }

        const syncedContent = await syncBlogContent({
          config: req.payload.config,
          content: doc.content,
          contentMarkdown: doc.contentMarkdown,
        })

        return {
          ...doc,
          content: syncedContent.content,
          contentMarkdown: syncedContent.contentMarkdown,
        }
      },
    ],
    beforeValidate: [
      async ({ data, req }) => {
        if (!data) {
          return data
        }

        const syncedContent = await syncBlogContent({
          config: req.payload.config,
          content: data.content,
          contentMarkdown: data.contentMarkdown,
        })

        return {
          ...data,
          content: syncedContent.content,
          contentMarkdown: syncedContent.contentMarkdown,
        }
      },
    ],
  },
  admin: {
    group: 'Blog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'publishedAt', 'updatedAt'],
  },
  defaultSort: '-publishedAt',
  fields: [
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
        description: 'Kurzer Teaser fuer Uebersichten und SEO',
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
                  'WYSIWYG-Editor fuer den Beitrag. Markdown-Shortcuts wie #, ## oder - funktionieren direkt beim Tippen.',
              },
            }, 'rewriteMarkdown'),
          ],
        },
        {
          label: 'Markdown',
          fields: [
            withTranslationButton({
              name: 'contentMarkdown',
              type: 'code',
              localized: true,
              admin: {
                language: 'markdown',
                description:
                  'Alternativ den Inhalt direkt als Markdown bearbeiten. Beim Speichern wird automatisch in den Editor synchronisiert.',
              },
            }),
          ],
        },
        {
          label: 'SEO',
          fields: [
            withAIButton(
              withTranslationButton({
                name: 'seoTitle',
                type: 'text',
                localized: true,
                admin: {
                  description: 'SEO-Titel fuer Suchmaschinen und Social Previews.',
                },
              }),
              'generateSeo',
              {
                label: 'Meta-Daten mit KI erzeugen',
              },
            ),
            withAIButton(
              withTranslationButton({
                name: 'seoDescription',
                type: 'textarea',
                localized: true,
                admin: {
                  description: 'SEO-Beschreibung fuer Suchmaschinen und Social Previews.',
                },
              }),
              'generateSeo',
              {
                label: 'Meta-Daten mit KI erzeugen',
              },
            ),
          ],
        },
      ],
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
