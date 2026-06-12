import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

import { canAccessOpenAIAdminRoutes } from '@/lib/adminAuth'
import { isAdminAIRateLimited } from '@/lib/adminAiRateLimit'
import { syncBlogContent } from '@/lib/blogContent'
import { getRuntimeEnvValue } from '@/lib/runtimeEnv'
import { getPayloadConfig } from '@/payload.config'

type Action = 'generateSeo' | 'rewriteMarkdown'
type EditorialMode = 'auto' | 'experienceReport' | 'opinion' | 'service' | 'technicalGuide'

type RequestBody = {
  action?: Action
  collectionSlug?: string
  id?: number | string
  input?: {
    content?: unknown
    contentMarkdown?: string
    editorialMode?: EditorialMode
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

type SeoResult = {
  seoDescription?: string
  seoTitle?: string
}

type EditorialContext = {
  kanal: string
  mode: Exclude<EditorialMode, 'auto'>
  modeLabel: string
  stilvorgaben: string
  struktur: string
  ton: string
  zielgruppe: string
}

type QAProblem = {
  empfehlung?: string
  kategorie?: string
  problem?: string
  stelle?: string
}

type QAResult = {
  freigabe?: boolean
  gesamturteil?: string
  muss_nochmal_ueberarbeitet_werden?: boolean
  probleme?: QAProblem[]
  score?: number
  spacepc_stil_score?: number
}

type EditorialRunResult = {
  chunkCount?: number
  manualReviewReason?: string
  mode: Exclude<EditorialMode, 'auto'>
  modeLabel: string
  qa: QAResult
  repairs: number
  requiresManualReview?: boolean
  text: string
}

type ProtectedMarkdown = {
  protectedText: string
  replacements: Array<{
    token: string
    value: string
  }>
}

const SEO_TITLE_MAX = 60
const SEO_DESCRIPTION_MAX = 155
const OPENAI_REQUEST_TIMEOUT_MS = 120_000
const EDITORIAL_APPROVAL_SCORE = 85
const EDITORIAL_REPAIR_SCORE = 70
const EDITORIAL_MAX_REPAIRS = 2
const EDITORIAL_SECTION_REWRITE_THRESHOLD = 8_000
const EDITORIAL_MANUAL_REVIEW_THRESHOLD = 25_000
const EDITORIAL_MAX_SECTION_LENGTH = 6_500
const SPACEPC_STYLE_APPROVAL_SCORE = 85
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

const editorialPresets: Record<Exclude<EditorialMode, 'auto'>, EditorialContext> = {
  technicalGuide: {
    mode: 'technicalGuide',
    modeLabel: 'Technische Anleitung',
    zielgruppe:
      'Deutschsprachige Technikinteressierte, Homelab-Nutzer, Admins, Linux-/Docker-Nutzer, Maker und kleine Unternehmen mit praktischen Infrastrukturproblemen.',
    kanal: 'Technischer Blogbeitrag / Ratgeber auf spacepc.de',
    ton: 'direkt, technisch sauber, verständlich, praktisch, ohne unnötige Theorie',
    stilvorgaben:
      'Schreibe wie ein erfahrener Techniker, der das Problem aus der Praxis kennt. Nutze Du-Ansprache, konkrete Schritte, typische Stolperfallen und sinnvolle Empfehlungen. Keine generischen KI-Floskeln, kein Marketing-Blabla, keine sterile Lexikon-Sprache. Kurze Absätze. Gemischte Satzlängen. Kein Gendern.',
    struktur:
      'Kurzer Einstieg mit dem konkreten Problem -> wann das relevant ist -> Voraussetzungen -> Umsetzung Schritt für Schritt -> wichtige Hinweise oder typische Fehler -> klares Fazit.',
  },
  experienceReport: {
    mode: 'experienceReport',
    modeLabel: 'Erfahrungsbericht / Produkttest',
    zielgruppe:
      'Deutschsprachige Technikinteressierte, Homelab-Nutzer, Admins, Maker und Leser, die ehrliche Erfahrungsberichte zu Technikprodukten suchen.',
    kanal: 'Erfahrungsbericht / Produkttest auf spacepc.de',
    ton: 'persönlich, direkt, konkret, ehrlich, mit klarer Meinung',
    stilvorgaben:
      'Der Text soll klingen, als hätte jemand das Produkt wirklich genutzt und bewertet. Nenne Vorteile und Schwächen. Kleine humorvolle Vergleiche sind erlaubt, aber nicht übertreiben. Keine weichgespülte Werbesprache. Keine neuen Messwerte, Preise oder technischen Behauptungen erfinden. Wenn etwas fehlt, mit [konkrete Info ergänzen] markieren. Kein Gendern.',
    struktur:
      'Warum das Produkt interessant war -> erster Eindruck -> Einrichtung oder Nutzung im Alltag -> was gut funktioniert -> was nervt oder besser sein könnte -> Fazit: Für wen lohnt es sich, für wen nicht?',
  },
  opinion: {
    mode: 'opinion',
    modeLabel: 'Meinung / Rant',
    zielgruppe:
      'Deutschsprachige Technikleute, Admins, Linux-/Docker-Nutzer, Maker und Leser, die klare technische Einordnung statt neutralem PR-Ton suchen.',
    kanal: 'Meinungsstarker Technik-Kommentar auf spacepc.de',
    ton: 'direkt, kritisch, leicht sarkastisch, pointiert, begründet',
    stilvorgaben:
      'Nutze Alltagsvergleiche, kurze Punchline-Sätze und konkrete Beispiele. Der Text darf genervt klingen, soll aber begründet bleiben. Kritik muss nachvollziehbar bleiben. Keine leeren Pauschalurteile. Keine KI-Floskeln. Kein Corporate-Marketing-Ton. Kein Gendern.',
    struktur:
      'Einstieg mit starker Beobachtung -> Kernproblem klar benennen -> Beispiele und technische Einordnung -> warum das im Alltag nervt -> was besser laufen müsste -> klares Fazit.',
  },
  service: {
    mode: 'service',
    modeLabel: 'Service-Text',
    zielgruppe:
      'Kleine Unternehmen, Agenturen, Betreiber produktiver Systeme, IT-Verantwortliche und Selbständige mit Linux-, Docker-, Hosting- oder Infrastrukturproblemen.',
    kanal: 'Service- oder Angebotsseite für spacepc.dev',
    ton: 'direkt, zuverlässig, technisch kompetent, ruhig, ohne Agentur-Geschwafel',
    stilvorgaben:
      'Kurz, konkret, lösungsorientiert. Fokus auf reale Erfahrung, schnelle Fehleranalyse, stabile Systeme und direkte Umsetzung. Keine aufgeblasenen Versprechen. Keine Buzzwords. Keine übertriebenen Garantien. Keine erfundenen Referenzen. Kein Gendern.',
    struktur:
      'Klares Problem -> was konkret übernommen wird -> für wen es passt -> was das Ergebnis ist -> kurzer Call-to-Action.',
  },
}

function inferEditorialMode({
  collectionSlug,
  source,
  title,
}: {
  collectionSlug: string
  source: string
  title?: string
}): Exclude<EditorialMode, 'auto'> {
  if (collectionSlug === 'pages') {
    return 'service'
  }

  const haystack = `${title ?? ''}\n${source}`.toLowerCase()

  if (
    /\b(test|erfahrung|review|produkt|gekauft|alltag|lohnt|erster eindruck|was nervt)\b/.test(
      haystack,
    )
  ) {
    return 'experienceReport'
  }

  if (/\b(rant|meinung|kommentar|warum|nervt|problem mit|kritik|microsoft)\b/.test(haystack)) {
    return 'opinion'
  }

  return 'technicalGuide'
}

function getEditorialContext({
  collectionSlug,
  requestedMode,
  source,
  title,
}: {
  collectionSlug: string
  requestedMode?: EditorialMode
  source: string
  title?: string
}): EditorialContext {
  const mode =
    requestedMode && requestedMode !== 'auto'
      ? requestedMode
      : inferEditorialMode({ collectionSlug, source, title })

  return editorialPresets[mode]
}

function protectMarkdown(value: string): ProtectedMarkdown {
  const replacements: ProtectedMarkdown['replacements'] = []
  let protectedText = value

  const addReplacement = (match: string) => {
    const token = `[[SPC_PROTECTED_${replacements.length}]]`
    replacements.push({ token, value: match })
    return token
  }

  protectedText = protectedText.replace(/```[\s\S]*?```/g, addReplacement)
  protectedText = protectedText.replace(/`[^`\n]+`/g, addReplacement)
  protectedText = protectedText.replace(/https?:\/\/[^\s)\]}>"']+/g, addReplacement)

  return {
    protectedText,
    replacements,
  }
}
function restoreProtectedMarkdown({ protectedText, replacements }: ProtectedMarkdown) {
  return replacements.reduce((text, replacement) => {
    return text.split(replacement.token).join(replacement.value)
  }, protectedText)
}

function assertProtectedTokensPreserved({ protectedText, replacements }: ProtectedMarkdown) {
  const missingToken = replacements.find(
    (replacement) => !protectedText.includes(replacement.token),
  )

  if (missingToken) {
    throw new Error(
      `Geschützter Inhalt wurde verändert oder entfernt (${missingToken.token}). Abschnitt wird nicht automatisch übernommen.`,
    )
  }
}

function splitOversizedPlainBlock(block: string) {
  if (block.length <= EDITORIAL_MAX_SECTION_LENGTH) {
    return [block]
  }

  const chunks: string[] = []
  let remaining = block

  while (remaining.length > EDITORIAL_MAX_SECTION_LENGTH) {
    const window = remaining.slice(0, EDITORIAL_MAX_SECTION_LENGTH + 1)
    const splitAt = Math.max(
      window.lastIndexOf('\n'),
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? '),
    )
    const end =
      splitAt > Math.floor(EDITORIAL_MAX_SECTION_LENGTH * 0.55)
        ? splitAt + 1
        : EDITORIAL_MAX_SECTION_LENGTH

    chunks.push(remaining.slice(0, end).trim())
    remaining = remaining.slice(end).trim()
  }

  if (remaining) {
    chunks.push(remaining)
  }

  return chunks
}

function splitLongMarkdownSection(section: string) {
  if (section.length <= EDITORIAL_MAX_SECTION_LENGTH) {
    return [section]
  }

  const chunks: string[] = []
  const paragraphs = section.split(/\n{2,}/)
  let current = ''

  for (const paragraph of paragraphs) {
    if (paragraph.length > EDITORIAL_MAX_SECTION_LENGTH) {
      if (current) {
        chunks.push(current)
        current = ''
      }

      chunks.push(...splitOversizedPlainBlock(paragraph))
      continue
    }

    const separator = current ? '\n\n' : ''

    if (
      current &&
      current.length + separator.length + paragraph.length > EDITORIAL_MAX_SECTION_LENGTH
    ) {
      chunks.push(current)
      current = paragraph
      continue
    }

    current = `${current}${separator}${paragraph}`
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

function splitMarkdownIntoEditorialSections(markdown: string) {
  const sections: string[] = []
  const lines = markdown.split('\n')
  let current: string[] = []
  let inFence = false

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
    }

    const startsNewSection = !inFence && /^#{1,3}\s+\S/.test(line) && current.length > 0

    if (startsNewSection) {
      sections.push(current.join('\n'))
      current = [line]
      continue
    }

    current.push(line)
  }

  if (current.length > 0) {
    sections.push(current.join('\n'))
  }

  return sections.flatMap(splitLongMarkdownSection).filter((section) => section.trim())
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

function extractFirstJsonObject(value: string) {
  const start = value.indexOf('{')

  if (start === -1) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < value.length; index += 1) {
    const char = value[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (char === '{') {
      depth += 1
    }

    if (char === '}') {
      depth -= 1

      if (depth === 0) {
        return value.slice(start, index + 1)
      }
    }
  }

  return null
}

function parseJsonObject<T>(raw: string, errorMessage: string): T {
  const trimmed = raw.trim()
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutFence) as T
  } catch {
    const extracted = extractFirstJsonObject(withoutFence)

    if (!extracted) {
      throw new Error(errorMessage)
    }

    try {
      return JSON.parse(extracted) as T
    } catch (error) {
      const details = error instanceof Error ? error.message : errorMessage
      throw new Error(`${errorMessage}: ${details}`)
    }
  }
}

function parseSeoResult(raw: string): SeoResult {
  return parseJsonObject<SeoResult>(raw, 'Keine gültigen SEO-Daten erhalten.')
}

function parseQAResult(raw: string): QAResult {
  const parsed = parseJsonObject<QAResult>(raw, 'Keine gültigen QA-Daten erhalten.')

  return {
    ...parsed,
    score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 0,
    spacepc_stil_score:
      typeof parsed.spacepc_stil_score === 'number'
        ? Math.max(0, Math.min(100, parsed.spacepc_stil_score))
        : 0,
  }
}

function buildRewriteInstructions({
  context,
  language,
}: {
  context: EditorialContext
  language: string
}) {
  return [
    'Du bist ein erfahrener deutscher Redakteur.',
    'Deine Aufgabe: Prüfe und überarbeite den folgenden Text so, dass er natürlicher, klarer und menschlicher klingt.',
    'Wichtig:',
    '- Verändere keine Fakten.',
    '- Erfinde keine neuen Aussagen, Zahlen, Namen, Beispiele oder Versprechen.',
    '- Entferne typische KI-Floskeln, Marketing-Blabla und unnötige Füllsätze.',
    '- Schreibe direkter, konkreter und verständlicher.',
    '- Variiere Satzlängen, aber übertreibe es nicht.',
    '- Nutze aktive Sprache.',
    '- Behalte Fachbegriffe bei, wenn sie sinnvoll sind.',
    '- Behandle Platzhalter im Format [[SPC_PROTECTED_0]] als unveränderliche geschützte Inhalte. Gib sie exakt unverändert zurück.',
    '- Der Text soll nicht künstlich locker wirken.',
    '- Keine absichtlichen Fehler einbauen.',
    language === 'Deutsch' ? '- Kein Gendern.' : '',
    '- Gib nur den vollständig überarbeiteten Markdown-Text aus.',
    '- Keine JSON-Ausgabe.',
    '- Keine Erklärung vor oder nach dem Ergebnis.',
    'Kontext:',
    `Zielgruppe: ${context.zielgruppe}`,
    `Kanal: ${context.kanal}`,
    `Ton: ${context.ton}`,
    `Sprache: ${language}`,
    `Content-Modus: ${context.modeLabel}`,
    `Empfohlene Struktur: ${context.struktur}`,
    'Stilvorgaben:',
    context.stilvorgaben,
    'SpacePC-Schreibstil:',
    '- Ansprache: Du.',
    '- Perspektive: persönlich, erfahrungsnah, technisch.',
    '- Wirkung: kompetent, nahbar, praktisch, nicht werblich.',
    '- Wortwahl: klare Alltagssprache mit technischen Begriffen, wenn sie nötig sind.',
    '- Haltung: lieber konkret kritisieren als neutral herumformulieren.',
    '- Der Text soll nicht wie ein neutraler KI-Ratgeber klingen, sondern wie ein technisch erfahrener Mensch, der das Thema aus der Praxis kennt, klar bewertet und ohne Marketing-Blabla erklärt.',
    '- Keine Floskeln wie "in der heutigen digitalen Welt", "innovative Lösung", "maßgeschneidert", "nahtlose Integration".',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildQAInstructions({
  context,
  language,
}: {
  context: EditorialContext
  language: string
}) {
  return [
    'Du bist Qualitätsprüfer für deutsche Texte.',
    'Deine Aufgabe: Vergleiche den Originaltext mit der überarbeiteten Version und prüfe, ob die Überarbeitung brauchbar ist.',
    'Prüfkriterien:',
    '1. Wurden Fakten verändert?',
    '2. Wurden neue Aussagen erfunden?',
    '3. Wurde etwas Wichtiges entfernt?',
    '4. Ist der Text klarer und natürlicher geworden?',
    '5. Klingt der Text weniger nach KI?',
    '6. Ist der Ton passend für Zielgruppe und Kanal?',
    '7. Gibt es Floskeln, Buzzwords oder unnötige Füllsätze?',
    '8. Ist die Sprache sauber, konkret und verständlich?',
    language === 'Deutsch' ? '9. Wurde auf Gendern verzichtet?' : '',
    '10. Ist der Text sofort veröffentlichbar?',
    'Kontext:',
    `Zielgruppe: ${context.zielgruppe}`,
    `Kanal: ${context.kanal}`,
    `Ton: ${context.ton}`,
    `Sprache: ${language}`,
    `Content-Modus: ${context.modeLabel}`,
    'Bewerte den Score von 0 bis 100. Ab 85 ist der Text automatisch freigabefähig.',
    'Prüfe zusätzlich, ob der Text zum SpacePC-Stil passt:',
    '1. Gibt es einen konkreten Einstieg statt generischer Einleitung?',
    '2. Klingt der Text nach echter Praxiserfahrung?',
    '3. Gibt es klare Aussagen statt weichgespülter Formulierungen?',
    '4. Sind technische Begriffe korrekt und sinnvoll eingesetzt?',
    '5. Gibt es unnötiges Marketing-Blabla?',
    '6. Ist der Text direkt genug?',
    '7. Gibt es natürliche Satzvariation?',
    '8. Klingt der Text zu glatt, zu neutral oder zu sehr nach KI?',
    '9. Passt die Du-Ansprache?',
    '10. Wurde auf Gendern verzichtet?',
    'Bewerte zusätzlich "spacepc_stil_score" von 0 bis 100.',
    'Antworte ausschließlich als valides JSON in exakt dieser Struktur:',
    '{"freigabe":true,"score":0,"spacepc_stil_score":0,"probleme":[{"kategorie":"Faktenfehler | Halluzination | Auslassung | Stil | Sprache | Ton | Floskel | Sonstiges","stelle":"betroffene Textstelle","problem":"kurze Beschreibung","empfehlung":"konkrete Korrektur"}],"gesamturteil":"kurze Einschätzung","muss_nochmal_ueberarbeitet_werden":false}',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildRepairInstructions({
  context,
  language,
}: {
  context: EditorialContext
  language: string
}) {
  return [
    'Du bist ein deutscher Redakteur.',
    'Die folgende Überarbeitung wurde geprüft und hat noch Probleme. Verbessere sie anhand des QA-Berichts.',
    'Regeln:',
    '- Nutze den Originaltext als Wahrheit.',
    '- Übernimm keine erfundenen Aussagen.',
    '- Korrigiere alle im QA-Bericht genannten Probleme.',
    '- Entferne Floskeln und unnatürliche Formulierungen.',
    '- Behalte den gewünschten Ton bei.',
    '- Behandle Platzhalter im Format [[SPC_PROTECTED_0]] als unveränderliche geschützte Inhalte. Gib sie exakt unverändert zurück.',
    language === 'Deutsch' ? '- Kein Gendern.' : '',
    '- Gib nur den finalen Text aus, keine Erklärung.',
    'Kontext:',
    `Zielgruppe: ${context.zielgruppe}`,
    `Kanal: ${context.kanal}`,
    `Ton: ${context.ton}`,
    `Sprache: ${language}`,
    `Content-Modus: ${context.modeLabel}`,
    `Empfohlene Struktur: ${context.struktur}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildQAInput({
  originalText,
  rewrittenText,
}: {
  originalText: string
  rewrittenText: string
}) {
  return [
    'Originaltext:',
    '"""',
    originalText,
    '"""',
    '',
    'Überarbeitete Version:',
    '"""',
    rewrittenText,
    '"""',
  ].join('\n')
}

function buildRepairInput({
  originalText,
  qa,
  rewrittenText,
}: {
  originalText: string
  qa: QAResult
  rewrittenText: string
}) {
  return [
    'Originaltext:',
    '"""',
    originalText,
    '"""',
    '',
    'Bisherige Überarbeitung:',
    '"""',
    rewrittenText,
    '"""',
    '',
    'QA-Bericht:',
    '"""',
    JSON.stringify(qa, null, 2),
    '"""',
  ].join('\n')
}

async function runEditorialRewrite({
  collectionSlug,
  requestedMode,
  locale,
  source,
  title,
}: {
  collectionSlug: string
  requestedMode?: EditorialMode
  locale: string
  source: string
  title?: string
}): Promise<EditorialRunResult> {
  const context = getEditorialContext({ collectionSlug, requestedMode, source, title })
  const language = locale === 'en' ? 'Englisch' : 'Deutsch'
  let rewrittenText = (
    await runOpenAI({
      instructions: buildRewriteInstructions({ context, language }),
      input: ['Originaltext:', '"""', source, '"""'].join('\n'),
    })
  ).trim()

  rewrittenText = rewrittenText
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  if (!rewrittenText) {
    throw new Error('Die KI hat keinen überarbeiteten Text zurückgegeben.')
  }

  let qa = parseQAResult(
    await runOpenAI({
      instructions: buildQAInstructions({ context, language }),
      input: buildQAInput({ originalText: source, rewrittenText }),
    }),
  )

  let repairs = 0

  while (
    (qa.score ?? 0) < EDITORIAL_APPROVAL_SCORE ||
    (qa.spacepc_stil_score ?? 0) < SPACEPC_STYLE_APPROVAL_SCORE ||
    qa.freigabe !== true ||
    qa.muss_nochmal_ueberarbeitet_werden === true
  ) {
    if ((qa.score ?? 0) < EDITORIAL_REPAIR_SCORE) {
      throw new Error(
        `Automatische Überarbeitung braucht manuelle Prüfung. QA-Score: ${qa.score ?? 0}, SpacePC-Stil: ${qa.spacepc_stil_score ?? 0}. ${qa.gesamturteil ?? ''}`.trim(),
      )
    }

    if (repairs >= EDITORIAL_MAX_REPAIRS) {
      return {
        manualReviewReason:
          `QA-Score: ${qa.score ?? 0}, SpacePC-Stil: ${qa.spacepc_stil_score ?? 0}. ${qa.gesamturteil ?? ''}`.trim(),
        mode: context.mode,
        modeLabel: context.modeLabel,
        qa,
        repairs,
        requiresManualReview: true,
        text: rewrittenText,
      }
    }

    rewrittenText = (
      await runOpenAI({
        instructions: buildRepairInstructions({ context, language }),
        input: buildRepairInput({ originalText: source, qa, rewrittenText }),
      })
    )
      .trim()
      .replace(/^```(?:markdown|md)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    if (!rewrittenText) {
      throw new Error('Die KI hat nach dem Repair keinen Text zurückgegeben.')
    }

    repairs += 1
    qa = parseQAResult(
      await runOpenAI({
        instructions: buildQAInstructions({ context, language }),
        input: buildQAInput({ originalText: source, rewrittenText }),
      }),
    )
  }

  return {
    mode: context.mode,
    modeLabel: context.modeLabel,
    qa,
    repairs,
    text: rewrittenText,
  }
}

function aggregateQAResults(results: QAResult[]): QAResult {
  if (results.length === 0) {
    return {
      freigabe: false,
      probleme: [],
      score: 0,
      spacepc_stil_score: 0,
      gesamturteil: 'Keine QA-Ergebnisse vorhanden.',
      muss_nochmal_ueberarbeitet_werden: true,
    }
  }

  const minScore = Math.min(...results.map((result) => result.score ?? 0))
  const minStyleScore = Math.min(...results.map((result) => result.spacepc_stil_score ?? 0))
  const problems = results.flatMap((result) => result.probleme ?? [])

  return {
    freigabe:
      results.every((result) => result.freigabe === true) &&
      minScore >= EDITORIAL_APPROVAL_SCORE &&
      minStyleScore >= SPACEPC_STYLE_APPROVAL_SCORE,
    probleme: problems,
    score: minScore,
    spacepc_stil_score: minStyleScore,
    gesamturteil: `Abschnittsweise geprüft. Schwächster QA-Score: ${minScore}, schwächster SpacePC-Stilscore: ${minStyleScore}.`,
    muss_nochmal_ueberarbeitet_werden: results.some(
      (result) => result.muss_nochmal_ueberarbeitet_werden === true,
    ),
  }
}

async function runProtectedSectionRewrite({
  collectionSlug,
  locale,
  requestedMode,
  section,
  title,
}: {
  collectionSlug: string
  locale: string
  requestedMode?: EditorialMode
  section: string
  title?: string
}) {
  const protectedSection = protectMarkdown(section)
  const result = await runEditorialRewrite({
    collectionSlug,
    locale,
    requestedMode,
    source: protectedSection.protectedText,
    title,
  })

  assertProtectedTokensPreserved({
    ...protectedSection,
    protectedText: result.text,
  })

  return {
    ...result,
    text: restoreProtectedMarkdown({
      ...protectedSection,
      protectedText: result.text,
    }),
  }
}

async function runChunkedEditorialRewrite({
  collectionSlug,
  locale,
  requestedMode,
  source,
  title,
}: {
  collectionSlug: string
  locale: string
  requestedMode?: EditorialMode
  source: string
  title?: string
}): Promise<EditorialRunResult> {
  const sections = splitMarkdownIntoEditorialSections(source)

  if (sections.length < 2) {
    return runProtectedSectionRewrite({
      collectionSlug,
      locale,
      requestedMode,
      section: source,
      title,
    })
  }

  const rewrittenSections: string[] = []
  const sectionResults: EditorialRunResult[] = []

  for (const section of sections) {
    const rewrittenSection = await runProtectedSectionRewrite({
      collectionSlug,
      locale,
      requestedMode,
      section,
      title,
    })

    rewrittenSections.push(rewrittenSection.text)
    sectionResults.push(rewrittenSection)
  }

  const text = rewrittenSections.join('\n\n').trim()
  const context = getEditorialContext({ collectionSlug, requestedMode, source, title })
  const language = locale === 'en' ? 'Englisch' : 'Deutsch'
  const finalQA = parseQAResult(
    await runOpenAI({
      instructions: buildQAInstructions({ context, language }),
      input: buildQAInput({ originalText: source, rewrittenText: text }),
    }),
  )

  if (
    finalQA.freigabe !== true ||
    (finalQA.score ?? 0) < EDITORIAL_APPROVAL_SCORE ||
    (finalQA.spacepc_stil_score ?? 0) < SPACEPC_STYLE_APPROVAL_SCORE ||
    finalQA.muss_nochmal_ueberarbeitet_werden === true
  ) {
    if ((finalQA.score ?? 0) < EDITORIAL_REPAIR_SCORE) {
      throw new Error(
        `Gesamt-QA nach abschnittsweiser Überarbeitung braucht manuelle Prüfung. QA-Score: ${finalQA.score ?? 0}, SpacePC-Stil: ${finalQA.spacepc_stil_score ?? 0}. ${finalQA.gesamturteil ?? ''}`.trim(),
      )
    }

    return {
      chunkCount: sections.length,
      manualReviewReason:
        `Gesamt-QA: ${finalQA.score ?? 0}, SpacePC-Stil: ${finalQA.spacepc_stil_score ?? 0}. ${finalQA.gesamturteil ?? ''}`.trim(),
      mode: context.mode,
      modeLabel: context.modeLabel,
      qa: aggregateQAResults([...sectionResults.map((result) => result.qa), finalQA]),
      repairs: sectionResults.reduce((sum, result) => sum + result.repairs, 0),
      requiresManualReview: true,
      text,
    }
  }

  return {
    chunkCount: sections.length,
    mode: context.mode,
    modeLabel: context.modeLabel,
    qa: aggregateQAResults([...sectionResults.map((result) => result.qa), finalQA]),
    repairs: sectionResults.reduce((sum, result) => sum + result.repairs, 0),
    text,
  }
}

async function runSafeEditorialRewrite({
  collectionSlug,
  locale,
  requestedMode,
  source,
  title,
}: {
  collectionSlug: string
  locale: string
  requestedMode?: EditorialMode
  source: string
  title?: string
}) {
  if (source.length > EDITORIAL_MANUAL_REVIEW_THRESHOLD) {
    throw new Error(
      `Text ist zu lang für automatische Überarbeitung (${source.length} Zeichen). Bitte abschnittsweise manuell prüfen oder kürzere Teile überarbeiten.`,
    )
  }

  if (source.length > EDITORIAL_SECTION_REWRITE_THRESHOLD) {
    return runChunkedEditorialRewrite({
      collectionSlug,
      locale,
      requestedMode,
      source,
      title,
    })
  }

  return runProtectedSectionRewrite({
    collectionSlug,
    locale,
    requestedMode,
    section: source,
    title,
  })
}

async function runOpenAI({ input, instructions }: { input: string; instructions: string }) {
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
      return NextResponse.json(
        { error: 'Collection ist für diese KI-Aktion nicht freigeschaltet.' },
        { status: 400 },
      )
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

      let parsed = parseSeoResult(seoRaw)

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

        parsed = parseSeoResult(seoRaw)

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
      const sourceContent = await syncBlogContent({
        config: payloadConfig,
        content: input.content,
        contentMarkdown: input.contentMarkdown,
      })
      const source =
        typeof sourceContent.contentMarkdown === 'string' && sourceContent.contentMarkdown.trim()
          ? sourceContent.contentMarkdown.trim()
          : typeof input.content === 'string'
            ? input.content.trim()
            : JSON.stringify(input.content)

      if (!source?.trim()) {
        return NextResponse.json(
          { error: 'Kein Inhalt zum Umschreiben vorhanden.' },
          { status: 400 },
        )
      }

      const editorialResult = await runSafeEditorialRewrite({
        collectionSlug,
        requestedMode: input.editorialMode,
        locale,
        source,
        title: input.title,
      })

      const syncedContent = await syncBlogContent({
        config: payloadConfig,
        content: sourceContent.content,
        contentMarkdown: editorialResult.text,
      })

      const chunkInfo = editorialResult.chunkCount
        ? ` in ${editorialResult.chunkCount} Abschnitten`
        : ''
      const reviewInfo = editorialResult.requiresManualReview
        ? ` Manuelle Prüfung empfohlen: ${editorialResult.manualReviewReason ?? 'QA-Freigabe unter Schwellwert.'}`
        : ''

      return NextResponse.json({
        message: editorialResult.requiresManualReview
          ? `Inhalt wurde als ${editorialResult.modeLabel}${chunkInfo} überarbeitet, aber nicht automatisch freigegeben.${reviewInfo}`
          : `Inhalt wurde als ${editorialResult.modeLabel}${chunkInfo} überarbeitet und per QA freigegeben (Score ${editorialResult.qa.score ?? 0}, Stil ${editorialResult.qa.spacepc_stil_score ?? 0}).`,
        result: {
          content: syncedContent.content,
          contentMarkdown: syncedContent.contentMarkdown,
          chunkCount: editorialResult.chunkCount,
          editorialQa: editorialResult.qa,
          editorialMode: editorialResult.mode,
          manualReviewReason: editorialResult.manualReviewReason,
          originalContentMarkdown: source,
          repairRuns: editorialResult.repairs,
          requiresManualReview: editorialResult.requiresManualReview,
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
