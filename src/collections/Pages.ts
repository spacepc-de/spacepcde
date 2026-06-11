import type { CollectionConfig } from 'payload'

import { withAIButton } from '../fields/aiButton'
import { slugField } from '../fields/slug'
import { withTranslationButton } from '../fields/translationButton'
import { blogContentEditor, syncBlogContent } from '../lib/blogContent'

export const Pages: CollectionConfig = {
  slug: 'pages',
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
      async ({ data, originalDoc, req }) => {
        if (!data) {
          return data
        }

        const hasContentInput =
          Object.prototype.hasOwnProperty.call(data, 'content') ||
          Object.prototype.hasOwnProperty.call(data, 'contentMarkdown')

        if (!hasContentInput) {
          return data
        }

        const syncedContent = await syncBlogContent({
          config: req.payload.config,
          content: data.content,
          contentMarkdown: data.contentMarkdown,
          originalContent: originalDoc?.content,
          originalContentMarkdown: originalDoc?.contentMarkdown,
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
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'url', 'updatedAt'],
  },
  defaultSort: 'title',
  fields: [
    withTranslationButton({
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    }),
    slugField(),
    {
      name: 'isLegalPage',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Für Impressum, Datenschutz und ähnliche Seiten.',
        position: 'sidebar',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Editor',
          fields: [
            {
              name: 'editorialActions',
              type: 'ui',
              admin: {
                components: {
                  Field: './components/admin/AIFieldButton#AIFieldButton',
                },
              },
              custom: {
                aiAction: 'rewriteMarkdown',
              },
            },
            {
              name: 'content',
              type: 'richText',
              required: true,
              localized: true,
              editor: blogContentEditor,
              admin: {
                description: 'WYSIWYG-Editor für statische Seiteninhalte.',
              },
            },
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
                description:
                  'Alternativ den Seiteninhalt direkt als Markdown bearbeiten. Beim Speichern wird automatisch synchronisiert.',
                language: 'markdown',
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
                  description: 'SEO-Titel für Suchmaschinen und Social Previews.',
                },
              }),
              'generateSeo',
            ),
            withAIButton(
              withTranslationButton({
                name: 'seoDescription',
                type: 'textarea',
                localized: true,
                admin: {
                  description: 'SEO-Beschreibung für Suchmaschinen und Social Previews.',
                },
              }),
              'generateSeo',
            ),
          ],
        },
      ],
    },
  ],
}
