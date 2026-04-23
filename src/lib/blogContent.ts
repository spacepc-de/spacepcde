import {
  convertLexicalToMarkdown,
  convertMarkdownToLexical,
  editorConfigFactory,
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

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
}: {
  config: Parameters<typeof editorConfigFactory.fromEditor>[0]['config']
  content: unknown
  contentMarkdown: unknown
}) => {
  const editorConfig = await getBlogContentEditorConfig(config)

  if (typeof contentMarkdown === 'string') {
    const normalizedMarkdown = contentMarkdown.trim()

    if (normalizedMarkdown) {
      return {
        content: convertMarkdownToLexical({
          editorConfig,
          markdown: normalizedMarkdown,
        }),
        contentMarkdown,
      }
    }
  }

  if (typeof content === 'string' && content.trim()) {
    return {
      content: convertMarkdownToLexical({
        editorConfig,
        markdown: content,
      }),
      contentMarkdown: content,
    }
  }

  if (isLexicalContent(content)) {
    return {
      content,
      contentMarkdown: convertLexicalToMarkdown({
        data: content as never,
        editorConfig,
      }),
    }
  }

  return {
    content,
    contentMarkdown,
  }
}
