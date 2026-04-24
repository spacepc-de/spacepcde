import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import { syncBlogContent } from '@/lib/blogContent'
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

async function runOpenAI({
  input,
  instructions,
}: {
  input: string
  instructions: string
}) {
  const model = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-5.2'

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
    throw new Error(`OpenAI API Fehler: ${errorText}`)
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
      return NextResponse.json({ error: 'Unvollstaendige Anfrage.' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ist nicht gesetzt.' }, { status: 500 })
    }

    const payloadConfig = await getPayloadConfig()
    const payload = await getPayload({ config: payloadConfig })
    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 })
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
        return NextResponse.json({ error: 'Keine Inhalte fuer SEO vorhanden.' }, { status: 400 })
      }

      const seoRaw = await runOpenAI({
        instructions: [
          'You generate SEO fields for a German website.',
          'Return valid JSON only.',
          'Use the keys "seoTitle" and "seoDescription".',
          'seoTitle should be concise and strong for Google, usually under 60 characters.',
          'seoDescription should be informative, natural German, usually under 160 characters.',
          'Do not include markdown, commentary, or extra keys.',
        ].join(' '),
        input: source,
      })

      const parsed = JSON.parse(seoRaw) as {
        seoDescription?: string
        seoTitle?: string
      }

      if (!parsed.seoTitle?.trim() || !parsed.seoDescription?.trim()) {
        return NextResponse.json({ error: 'Keine gueltigen SEO-Daten erhalten.' }, { status: 502 })
      }

      return NextResponse.json({
        message: 'SEO-Felder wurden erzeugt.',
        result: {
          seoDescription: parsed.seoDescription.trim(),
          seoTitle: parsed.seoTitle.trim(),
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
