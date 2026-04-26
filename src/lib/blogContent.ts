import {
  convertLexicalToMarkdown,
  convertMarkdownToLexical,
  editorConfigFactory,
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { normalizeMarkdownFormatting } from './markdownFormatting'

export const blogContentEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    FixedToolbarFeature(),
    ...defaultFeatures.filter((feature) => feature.key !== 'inlineToolbar'),
    InlineToolbarFeature(),
  ],
})

export const isLexicalContent = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) &&
  typeof value === 'object' &&
  'root' in (value as Record<string, unknown>) &&
  typeof (value as Record<string, unknown>).root === 'object'

export const getBlogContentEditorConfig = async (
  config: Parameters<typeof editorConfigFactory.fromEditor>[0]['config'],
) =>
  editorConfigFactory.fromEditor({
    config,
    editor: blogContentEditor,
    parentIsLocalized: true,
  })

export const syncBlogContent = async ({
  content,
  contentMarkdown,
  config,
  originalContent,
  originalContentMarkdown,
}: {
  config: Parameters<typeof editorConfigFactory.fromEditor>[0]['config']
  content: unknown
  contentMarkdown: unknown
  originalContent?: unknown
  originalContentMarkdown?: unknown
}) => {
  const editorConfig = await getBlogContentEditorConfig(config)
  const stringify = (value: unknown) => {
    if (value === undefined) {
      return undefined
    }

    return JSON.stringify(value)
  }

  const contentChanged =
    originalContent !== undefined && stringify(content) !== stringify(originalContent)
  const markdownChanged =
    originalContentMarkdown !== undefined &&
    String(contentMarkdown ?? '') !== String(originalContentMarkdown ?? '')

  if (contentChanged && !markdownChanged && isLexicalContent(content)) {
    const normalizedMarkdown = normalizeMarkdownFormatting(
      convertLexicalToMarkdown({
        data: content as never,
        editorConfig,
      }),
    )

    return {
      content,
      contentMarkdown: normalizedMarkdown,
    }
  }

  if (typeof contentMarkdown === 'string') {
    const normalizedMarkdown = normalizeMarkdownFormatting(contentMarkdown.trim())

    if (normalizedMarkdown && (markdownChanged || !isLexicalContent(content))) {
      return {
        content: convertMarkdownToLexical({
          editorConfig,
          markdown: normalizedMarkdown,
        }),
        contentMarkdown: normalizedMarkdown,
      }
    }
  }

  if (isLexicalContent(content)) {
    const normalizedMarkdown = normalizeMarkdownFormatting(
      convertLexicalToMarkdown({
        data: content as never,
        editorConfig,
      }),
    )

    return {
      content,
      contentMarkdown: normalizedMarkdown,
    }
  }

  if (typeof content === 'string' && content.trim()) {
    const normalizedMarkdown = normalizeMarkdownFormatting(content)

    return {
      content: convertMarkdownToLexical({
        editorConfig,
        markdown: normalizedMarkdown,
      }),
      contentMarkdown: normalizedMarkdown,
    }
  }

  return {
    content,
    contentMarkdown,
  }
}
