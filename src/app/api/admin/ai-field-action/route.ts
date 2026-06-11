import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import { canAccessOpenAIAdminRoutes } from '@/lib/adminAuth'
import { isAdminAIRateLimited } from '@/lib/adminAiRateLimit'
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
const OPENAI_REQUEST_TIMEOUT_MS = 20_000
const WEAK_SEO_PHRASES = [
  'alles, was du wissen musst',
  'der ultimative guide',
  'die besten tipps',
  'entdecke',
  'erfahre',
  'in diesem beitrag',
  'in diesem artikel',
  'learn more',
  'discover',
  'dive into',
  'everything you need to know',
  'ultimate guide',
]

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

function containsWeakSeoPhrase(value: string) {
  const normalized = value.toLowerCase()

  return WEAK_SEO_PHRASES.some((phrase) => normalized.includes(phrase))
}

function buildSeoInstructions(locale: string, retry = false) {
  const language = locale === 'en' ? 'English' : 'German'
  const bannedOpeners =
    locale === 'en'
      ? '"Learn", "Discover", "Dive into", "Everything you need to know", "Ultimate guide"'
      : '"Erfahre", "Entdecke", "Alles, was du wissen musst", "Der ultimative Guide", "In diesem Beitrag"'

  return [
    `You are a senior technical SEO editor for a ${language} website about IT, hardware, software, servers, electronics, and technical guides.`,
    'Return valid JSON only with exactly the keys "seoTitle" and "seoDescription".',
    `Write in natural ${language}.`,
    'First infer the primary search intent from the source: the concrete device, problem, comparison, tutorial, or decision the page answers.',
    'Use specific nouns from the article. Prefer concrete terms such as product names, protocols, tools, errors, operating systems, hardware models, and use cases.',
    `seoTitle: max ${SEO_TITLE_MAX} characters, no site name, no clickbait, no filler, no vague promise. Make it sound like a search result a technical reader would click.`,
    `seoDescription: max ${SEO_DESCRIPTION_MAX} characters, one useful sentence. State the practical value, outcome, limitation, or decision help. Do not repeat the title with fluff.`,
    `Do not start with or use generic SEO boilerplate such as ${bannedOpeners}.`,
    'Avoid empty verbs like learn, discover, explore, dive into, unlock, optimize unless they are part of a concrete technical action from the article.',
    'Do not invent benchmarks, prices, years, tests, ratings, compatibility claims, or product recommendations not supported by the source.',
    'Do not use keyword stuffing, quotation marks, markdown, commentary, or extra keys.',
    retry
      ? 'The previous result was too generic. Rewrite it with sharper search intent, more concrete terminology, and no boilerplate phrases.'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
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

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS)
  let response: Response

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
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
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenAI API Anfrage hat das Timeout überschritten.')
    }

    throw error
  } finally {
    clearTimeout(timeout)
  }

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

    if (!collectionSlug || !id || !input) {
      return NextResponse.json({ error: 'Unvollständige Anfrage.' }, { status: 400 })
    }

    if (action !== 'generateSeo' && action !== 'rewriteMarkdown') {
      return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 })
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

    if (await isAdminAIRateLimited(request, user)) {
      return NextResponse.json(
        { error: 'Zu viele KI-Anfragen in kurzer Zeit. Bitte später erneut versuchen.' },
        { status: 429 },
      )
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

      let seoRaw = await runOpenAI({
        instructions: buildSeoInstructions(locale),
        input: source,
      })

      let parsed = JSON.parse(seoRaw) as {
        seoDescription?: string
        seoTitle?: string
      }

      if (!parsed.seoTitle?.trim() || !parsed.seoDescription?.trim()) {
        return NextResponse.json({ error: 'Keine gültigen SEO-Daten erhalten.' }, { status: 502 })
      }

      let seoTitle = clampSeoText(parsed.seoTitle, SEO_TITLE_MAX)
      let seoDescription = clampSeoText(parsed.seoDescription, SEO_DESCRIPTION_MAX)

      if (containsWeakSeoPhrase(seoTitle) || containsWeakSeoPhrase(seoDescription)) {
        seoRaw = await runOpenAI({
          instructions: buildSeoInstructions(locale, true),
          input: [
            source,
            '',
            'Rejected weak SEO result:',
            JSON.stringify({ seoDescription, seoTitle }),
          ].join('\n'),
        })

        parsed = JSON.parse(seoRaw) as {
          seoDescription?: string
          seoTitle?: string
        }

        if (!parsed.seoTitle?.trim() || !parsed.seoDescription?.trim()) {
          return NextResponse.json({ error: 'Keine gültigen SEO-Daten erhalten.' }, { status: 502 })
        }

        seoTitle = clampSeoText(parsed.seoTitle, SEO_TITLE_MAX)
        seoDescription = clampSeoText(parsed.seoDescription, SEO_DESCRIPTION_MAX)
      }

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

    if (message === 'OpenAI API Anfrage hat das Timeout überschritten.') {
      return NextResponse.json({ error: message }, { status: 504 })
    }

    return NextResponse.json({ error: `KI-Aktion fehlgeschlagen: ${message}` }, { status: 500 })
  }
}
