import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import { canAccessOpenAIAdminRoutes } from '@/lib/adminAuth'
import { syncBlogContent } from '@/lib/blogContent'
import { getRuntimeEnvValue } from '@/lib/runtimeEnv'
import { getPayloadConfig } from '@/payload.config'

type Action = 'generateSeo' | 'rewriteMarkdown'

type RequestBody = {
  action?: Action
  collectionSlug?: string
  id?: number | string
  input?: {
    content?: unknown
    contentMarkdown?: string
    excerpt?: string
    title?: string
  }
  locale?: string
}

type ResponsesAPIResult = {
  output?: Array<{
    content?: Array<{ text?: string; type?: string }>
  }>
  output_text?: string
}

const SEO_TITLE_MAX = 60
const SEO_DESCRIPTION_MAX = 155

const actionCollectionPolicy: Record<Action, Set<string>> = {
  generateSeo: new Set(['blog-posts', 'pages']),
  rewriteMarkdown: new Set(['blog-posts', 'pages']),
}

function clampSeoText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  const shortened = normalized.slice(0, maxLength + 1)
  const lastSpace = shortened.lastIndexOf(' ')

  if (lastSpace >= Math.floor(maxLength * 0.7)) {
    return shortened.slice(0, lastSpace).trim()
  }

  return normalized.slice(0, maxLength).trim()
}

async function runOpenAI({
  input,
  instructions,
}: {
  input: string
  instructions: string
}) {
  const apiKey = await getRuntimeEnvValue('OPENAI_API_KEY')
  const model = (await getRuntimeEnvValue('OPENAI_TRANSLATION_MODEL')) || 'gpt-5.2'

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY ist nicht gesetzt.')
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('ai-field-action OpenAI API error', {
      errorText,
      status: response.status,
    })
    throw new Error('OpenAI API Anfrage fehlgeschlagen.')
  }

  const result = (await response.json()) as ResponsesAPIResult

  return (
    result.output_text?.trim() ||
    result.output
      ?.flatMap((item) => item.content ?? [])
      .find((contentItem) => contentItem.type === 'output_text')
      ?.text?.trim() ||
    ''
  )
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const { action, collectionSlug, id, input, locale = 'de' } = body

    if (!action || !collectionSlug || !id || !input) {
      return NextResponse.json({ error: 'Unvollständige Anfrage.' }, { status: 400 })
    }

    if (!actionCollectionPolicy[action].has(collectionSlug)) {
      return NextResponse.json({ error: 'Collection ist für diese KI-Aktion nicht freigeschaltet.' }, { status: 400 })
    }

    const payloadConfig = await getPayloadConfig()
    const payload = await getPayload({ config: payloadConfig })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
    }

    if (!(await canAccessOpenAIAdminRoutes(user))) {
      return NextResponse.json({ error: 'Nicht autorisiert für KI-Aktionen.' }, { status: 403 })
    }

    const openAIKey = await getRuntimeEnvValue('OPENAI_API_KEY')

    if (!openAIKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ist nicht gesetzt.' }, { status: 500 })
    }

    if (action === 'generateSeo') {
      const source = [
        input.title ? `Titel: ${input.title}` : '',
        input.excerpt ? `Teaser: ${input.excerpt}` : '',
        input.contentMarkdown ? `Inhalt:\n${input.contentMarkdown}` : '',
      ]
        .filter(Boolean)
        .join('\n\n')

      if (!source.trim()) {
        return NextResponse.json({ error: 'Keine Inhalte für SEO vorhanden.' }, { status: 400 })
      }

      const seoRaw = await runOpenAI({
        instructions: [
          `You generate SEO fields for a ${locale === 'en' ? 'English' : 'German'} website.`,
          'Return valid JSON only.',
          'Use the keys "seoTitle" and "seoDescription".',
          `Write the result in ${locale === 'en' ? 'natural English' : 'natural German'}.`,
          `seoTitle must be concise, strong, and no longer than ${SEO_TITLE_MAX} characters.`,
          `seoDescription must be informative, natural, and no longer than ${SEO_DESCRIPTION_MAX} characters.`,
          'Avoid filler, keyword stuffing, and quotation marks unless they are essential.',
          'Do not include markdown, commentary, or extra keys.',
        ].join(' '),
        input: source,
      })

      const parsed = JSON.parse(seoRaw) as {
        seoDescription?: string
        seoTitle?: string
      }

      if (!parsed.seoTitle?.trim() || !parsed.seoDescription?.trim()) {
        return NextResponse.json({ error: 'Keine gültigen SEO-Daten erhalten.' }, { status: 502 })
      }

      const seoTitle = clampSeoText(parsed.seoTitle, SEO_TITLE_MAX)
      const seoDescription = clampSeoText(parsed.seoDescription, SEO_DESCRIPTION_MAX)

      return NextResponse.json({
        message: 'SEO-Felder wurden erzeugt.',
        result: {
          seoDescription,
          seoTitle,
        },
      })
    }

    if (action === 'rewriteMarkdown') {
      const source =
        input.contentMarkdown?.trim() ||
        (typeof input.content === 'string' ? input.content.trim() : JSON.stringify(input.content))

      if (!source?.trim()) {
        return NextResponse.json({ error: 'Kein Inhalt zum Umschreiben vorhanden.' }, { status: 400 })
      }

      const markdown = await runOpenAI({
        instructions: [
          'Rewrite the provided content into clean, well-structured Markdown in the same language.',
          'Preserve technical meaning and factual content.',
          'Improve headings, lists, spacing, and readability.',
          'Return Markdown only with no commentary.',
        ].join(' '),
        input: input.contentMarkdown?.trim()
          ? input.contentMarkdown
          : `Konvertiere diesen Inhalt in sauberes Markdown:\n\n${source}`,
      })

      const syncedContent = await syncBlogContent({
        config: payloadConfig,
        content: input.content,
        contentMarkdown: markdown,
      })

      return NextResponse.json({
        message: 'Inhalt wurde in Markdown umgeschrieben.',
        result: {
          content: syncedContent.content,
          contentMarkdown: syncedContent.contentMarkdown,
        },
      })
    }

    return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('ai-field-action failed', error)

    return NextResponse.json({ error: `KI-Aktion fehlgeschlagen: ${message}` }, { status: 500 })
  }
}
