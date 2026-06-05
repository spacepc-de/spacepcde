import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import { canAccessOpenAIAdminRoutes } from '@/lib/adminAuth'
import { isAdminAIRateLimited } from '@/lib/adminAiRateLimit'
import { getRuntimeEnvValue } from '@/lib/runtimeEnv'
import { getPayloadConfig } from '@/payload.config'

type TranslationMode = 'slug' | 'text'

type RequestBody = {
  collectionSlug?: string
  fieldName?: string
  id?: number | string
  sourceLocale?: string
  targetLocale?: string
  translationMode?: TranslationMode
  value?: string
}

const OPENAI_REQUEST_TIMEOUT_MS = 20_000
const FALLBACK_TRANSLATION_MODEL = 'gpt-4o-mini'

const translatableFieldPolicy: Record<string, Record<string, TranslationMode>> = {
  'blog-posts': {
    contentMarkdown: 'text',
    excerpt: 'text',
    seoDescription: 'text',
    seoTitle: 'text',
    title: 'text',
    url: 'slug',
  },
  'footer-links': {
    href: 'text',
    label: 'text',
  },
  'navigation-links': {
    href: 'text',
    label: 'text',
  },
  pages: {
    contentMarkdown: 'text',
    seoDescription: 'text',
    seoTitle: 'text',
    title: 'text',
    url: 'slug',
  },
}

function canTranslateField(collectionSlug: string, fieldName: string, mode: TranslationMode) {
  const collectionPolicy = translatableFieldPolicy[collectionSlug]

  if (!collectionPolicy) {
    return false
  }

  return collectionPolicy[fieldName] === mode
}

const getRequiredLocalizedFieldNames = (fields: unknown[]): string[] => {
  const names: string[] = []

  for (const field of fields) {
    if (!field || typeof field !== 'object') continue

    const typedField = field as {
      fields?: unknown[]
      localized?: boolean
      name?: string
      required?: boolean
      tabs?: Array<{ fields?: unknown[] }>
      type?: string
    }

    if (typedField.localized && typedField.required && typedField.name) {
      names.push(typedField.name)
    }

    if (Array.isArray(typedField.fields)) {
      names.push(...getRequiredLocalizedFieldNames(typedField.fields))
    }

    if (typedField.type === 'tabs' && Array.isArray(typedField.tabs)) {
      for (const tab of typedField.tabs) {
        if (Array.isArray(tab.fields)) {
          names.push(...getRequiredLocalizedFieldNames(tab.fields))
        }
      }
    }
  }

  return [...new Set(names)]
}

const translationInstructionsByMode: Record<TranslationMode, string> = {
  slug: [
    'Translate the provided German slug into natural English.',
    'Return lowercase ASCII kebab-case only.',
    'Do not include quotes, punctuation outside kebab-case, explanations, or extra text.',
  ].join(' '),
  text: [
    'Translate the provided German text into natural English.',
    'Preserve formatting, paragraphs, Markdown, code spans, URLs, and line breaks.',
    'Return only the translated text without commentary.',
  ].join(' '),
}

type OpenAIErrorPayload = {
  error?: {
    code?: string
    message?: string
    type?: string
  }
}

async function readOpenAIError(response: Response) {
  const raw = await response.text()

  try {
    const parsed = JSON.parse(raw) as OpenAIErrorPayload
    return {
      code: parsed.error?.code,
      message: parsed.error?.message || raw,
      raw,
      type: parsed.error?.type,
    }
  } catch {
    return {
      message: raw,
      raw,
    }
  }
}

function getOpenAIUserError(status: number, error: Awaited<ReturnType<typeof readOpenAIError>>) {
  const message = error.message.toLowerCase()
  const code = error.code?.toLowerCase()
  const type = error.type?.toLowerCase()

  if (status === 401) {
    return 'OpenAI API-Key ist ungültig oder abgelaufen.'
  }

  if (status === 403) {
    return 'Der OpenAI API-Key hat keinen Zugriff auf das gewählte Modell.'
  }

  if (status === 429 || code === 'insufficient_quota' || type === 'insufficient_quota') {
    return 'OpenAI Limit oder Guthaben ist erschöpft.'
  }

  if (message.includes('model') || code === 'model_not_found') {
    return 'Das konfigurierte OpenAI-Modell ist nicht verfügbar.'
  }

  return 'OpenAI API Fehler bei der Übersetzung.'
}

async function createOpenAITranslation({
  apiKey,
  input,
  instructions,
  model,
  signal,
}: {
  apiKey: string
  input: string
  instructions: string
  model: string
  signal: AbortSignal
}) {
  return fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input,
      instructions,
      max_output_tokens: 16384,
      model,
    }),
    signal,
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody
    const {
      collectionSlug,
      fieldName,
      id,
      sourceLocale = 'de',
      targetLocale = 'en',
      translationMode = 'text',
      value,
    } = body

    if (!collectionSlug || !fieldName || !id || !value?.trim()) {
      return NextResponse.json({ error: 'Unvollständige Anfrage.' }, { status: 400 })
    }

    if (!canTranslateField(collectionSlug, fieldName, translationMode)) {
      return NextResponse.json({ error: 'Feld oder Collection ist für Übersetzungen nicht freigeschaltet.' }, { status: 400 })
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

    const collectionConfig = payloadConfig.collections.find(
      (collection) => collection.slug === collectionSlug,
    )

    if (!collectionConfig) {
      return NextResponse.json({ error: 'Collection nicht gefunden.' }, { status: 400 })
    }

    const openAIKey = await getRuntimeEnvValue('OPENAI_API_KEY')

    if (!openAIKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY ist nicht gesetzt.' }, { status: 500 })
    }

    const model = (await getRuntimeEnvValue('OPENAI_TRANSLATION_MODEL')) || FALLBACK_TRANSLATION_MODEL
    const instructions = translationInstructionsByMode[translationMode]
    const input = `Translate from ${sourceLocale} to ${targetLocale}:\n\n${value}`

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OPENAI_REQUEST_TIMEOUT_MS)
    let openAIResponse: Response

    try {
      openAIResponse = await createOpenAITranslation({
        apiKey: openAIKey,
        input,
        instructions,
        model,
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'OpenAI API Anfrage hat das Timeout überschritten.' },
          { status: 504 },
        )
      }

      throw error
    } finally {
      clearTimeout(timeout)
    }

    if (!openAIResponse.ok) {
      const initialError = await readOpenAIError(openAIResponse)
      console.error('translate-field OpenAI API error', {
        code: initialError.code,
        message: initialError.message,
        model,
        status: openAIResponse.status,
        type: initialError.type,
      })

      const shouldRetryWithFallback =
        model !== FALLBACK_TRANSLATION_MODEL &&
        (openAIResponse.status === 400 ||
          openAIResponse.status === 403 ||
          openAIResponse.status === 404 ||
          initialError.code === 'model_not_found' ||
          initialError.message.toLowerCase().includes('model'))

      if (shouldRetryWithFallback) {
        openAIResponse = await createOpenAITranslation({
          apiKey: openAIKey,
          input,
          instructions,
          model: FALLBACK_TRANSLATION_MODEL,
          signal: controller.signal,
        })
      }

      if (!openAIResponse.ok) {
        const fallbackError =
          shouldRetryWithFallback ? await readOpenAIError(openAIResponse) : initialError

        console.error('translate-field OpenAI API retry failed', {
          code: fallbackError.code,
          message: fallbackError.message,
          model: shouldRetryWithFallback ? FALLBACK_TRANSLATION_MODEL : model,
          status: openAIResponse.status,
          type: fallbackError.type,
        })

        return NextResponse.json(
          { error: getOpenAIUserError(openAIResponse.status, fallbackError) },
          { status: 502 },
        )
      }
    }

    const result = (await openAIResponse.json()) as {
      output?: Array<{
        content?: Array<{ text?: string; type?: string }>
      }>
      output_text?: string
    }

    const translatedValue =
      result.output_text?.trim() ||
      result.output
        ?.flatMap((item) => item.content ?? [])
        .find((contentItem) => contentItem.type === 'output_text')
        ?.text?.trim()

    if (!translatedValue) {
      return NextResponse.json({ error: 'Keine Übersetzung erhalten.' }, { status: 502 })
    }

    const requiredLocalizedFields = getRequiredLocalizedFieldNames(collectionConfig.fields)
    const sourceDoc = await payload.findByID({
      collection: collectionSlug as any,
      id,
      depth: 0,
      fallbackLocale: false,
      locale: sourceLocale as any,
      overrideAccess: true,
    })
    const targetDoc = await payload.findByID({
      collection: collectionSlug as any,
      id,
      depth: 0,
      fallbackLocale: false,
      locale: targetLocale as any,
      overrideAccess: true,
    })

    const updateData: Record<string, unknown> = {
      [fieldName]: translatedValue,
    }

    for (const requiredFieldName of requiredLocalizedFields) {
      if (requiredFieldName === fieldName) continue

      const targetValue = targetDoc?.[requiredFieldName]
      const sourceValue = sourceDoc?.[requiredFieldName]

      if (
        (targetValue === null ||
          targetValue === undefined ||
          targetValue === '' ||
          (Array.isArray(targetValue) && targetValue.length === 0)) &&
        sourceValue !== null &&
        sourceValue !== undefined &&
        sourceValue !== ''
      ) {
        updateData[requiredFieldName] = sourceValue
      }
    }

    await payload.update({
      collection: collectionSlug as any,
      id,
      data: updateData,
      depth: 0,
      fallbackLocale: false,
      locale: targetLocale as any,
      overrideAccess: true,
    })

    return NextResponse.json({
      message: `Englische Version für "${fieldName}" wurde gespeichert.`,
      translation: translatedValue,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'
    console.error('translate-field failed', error)

    return NextResponse.json({ error: `Übersetzung fehlgeschlagen: ${message}` }, { status: 500 })
  }
}
