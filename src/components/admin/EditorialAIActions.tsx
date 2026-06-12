'use client'

import { Button, toast, useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import React, { useState } from 'react'

type EditorialMode = 'experienceReport' | 'opinion' | 'service' | 'technicalGuide'

type AIActionResponse = {
  error?: string
  message?: string
  result?: {
    content?: unknown
    contentMarkdown?: string
    manualReviewReason?: string
    originalContentMarkdown?: string
    requiresManualReview?: boolean
  }
}

type PendingRewrite = {
  content?: unknown
  contentMarkdown: string
  manualReviewReason?: string
  message?: string
  originalContentMarkdown: string
  requiresManualReview?: boolean
}

type DiffRow = {
  text: string
  type: 'added' | 'removed' | 'unchanged'
}

const rewriteModes: Array<{ label: string; mode: EditorialMode }> = [
  { label: 'Anleitung', mode: 'technicalGuide' },
  { label: 'Erfahrung', mode: 'experienceReport' },
  { label: 'Meinung', mode: 'opinion' },
  { label: 'Service', mode: 'service' },
]

function buildLineDiff(original: string, rewritten: string): DiffRow[] {
  const originalLines = original.split('\n')
  const rewrittenLines = rewritten.split('\n')
  const table = Array.from({ length: originalLines.length + 1 }, () =>
    Array<number>(rewrittenLines.length + 1).fill(0),
  )

  for (let i = originalLines.length - 1; i >= 0; i -= 1) {
    for (let j = rewrittenLines.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        originalLines[i] === rewrittenLines[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0

  while (i < originalLines.length && j < rewrittenLines.length) {
    if (originalLines[i] === rewrittenLines[j]) {
      rows.push({ text: originalLines[i], type: 'unchanged' })
      i += 1
      j += 1
      continue
    }

    if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ text: originalLines[i], type: 'removed' })
      i += 1
    } else {
      rows.push({ text: rewrittenLines[j], type: 'added' })
      j += 1
    }
  }

  while (i < originalLines.length) {
    rows.push({ text: originalLines[i], type: 'removed' })
    i += 1
  }

  while (j < rewrittenLines.length) {
    rows.push({ text: rewrittenLines[j], type: 'added' })
    j += 1
  }

  return rows
}

export const EditorialAIActions = () => {
  const { collectionSlug, id } = useDocumentInfo()
  const { code: locale } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [pendingRewrite, setPendingRewrite] = useState<PendingRewrite | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<'error' | 'info' | 'success' | 'warning'>('info')

  const titleField = useField<string>({ path: 'title' })
  const contentField = useField<unknown>({ path: 'content' })
  const contentMarkdownField = useField<string>({ path: 'contentMarkdown' })

  const isDisabled =
    !collectionSlug ||
    !id ||
    isLoading ||
    (!contentField.value && !contentMarkdownField.value?.trim())

  const handleRewrite = async (editorialMode: EditorialMode) => {
    setPendingRewrite(null)

    if (!collectionSlug || !id) {
      setStatusTone('error')
      setStatusMessage('Dokument erst speichern, dann Inhalt überarbeiten.')
      toast.error('Dokument erst speichern, dann Inhalt überarbeiten.')
      return
    }

    if (!contentField.value && !contentMarkdownField.value?.trim()) {
      setStatusTone('error')
      setStatusMessage('Kein Inhalt vorhanden.')
      toast.error('Kein Inhalt vorhanden.')
      return
    }

    setIsLoading(true)
    setStatusTone('info')
    setStatusMessage('Überarbeitung läuft. Je nach Textlänge kann das länger dauern.')

    try {
      const response = await fetch('/api/admin/ai-field-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rewriteMarkdown',
          collectionSlug,
          id,
          locale,
          input: {
            content: contentField.value,
            contentMarkdown: contentMarkdownField.value,
            editorialMode,
            title: titleField.value,
          },
        }),
      })

      const json = (await response.json()) as AIActionResponse

      if (!response.ok || !json.result?.contentMarkdown) {
        setStatusTone('error')
        setStatusMessage(json.error ?? 'Überarbeitung fehlgeschlagen.')
        toast.error(json.error ?? 'Überarbeitung fehlgeschlagen.')
        return
      }

      const originalContentMarkdown =
        json.result.originalContentMarkdown ||
        contentMarkdownField.value ||
        'Der Originaltext wurde aus dem Editorinhalt erzeugt.'

      setPendingRewrite({
        content: json.result.content,
        contentMarkdown: json.result.contentMarkdown,
        manualReviewReason: json.result.manualReviewReason,
        message: json.message,
        originalContentMarkdown,
        requiresManualReview: json.result.requiresManualReview,
      })

      if (originalContentMarkdown === json.result.contentMarkdown) {
        setStatusTone('info')
        setStatusMessage('Die KI hat keine sichtbaren Änderungen am Markdown geliefert.')
      } else if (json.result.requiresManualReview) {
        setStatusTone('warning')
        setStatusMessage(
          json.message ??
            `Überarbeitung ist als Vorschau bereit, aber manuelle Prüfung ist empfohlen. ${json.result.manualReviewReason ?? ''}`.trim(),
        )
      } else {
        setStatusTone('success')
        setStatusMessage('Überarbeitung ist als Vorschau bereit. Noch nichts wurde übernommen.')
      }

      toast.success('Überarbeitung ist als Vorschau bereit.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Überarbeitung fehlgeschlagen.'
      setStatusTone('error')
      setStatusMessage(message)
      toast.error('Überarbeitung fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyRewrite = () => {
    if (!pendingRewrite) {
      return
    }

    contentMarkdownField.setValue(pendingRewrite.contentMarkdown)
    if (pendingRewrite.content) {
      contentField.setValue(pendingRewrite.content)
    }

    toast.success(pendingRewrite.message ?? 'Überarbeitung wurde übernommen.')
    setStatusTone('success')
    setStatusMessage('Überarbeitung wurde übernommen. Bitte Dokument speichern.')
    setPendingRewrite(null)
  }

  const diffRows = pendingRewrite
    ? buildLineDiff(pendingRewrite.originalContentMarkdown, pendingRewrite.contentMarkdown)
    : []
  const addedLines = diffRows.filter((row) => row.type === 'added').length
  const removedLines = diffRows.filter((row) => row.type === 'removed').length
  const statusBackground =
    statusTone === 'error'
      ? 'rgba(239, 68, 68, 0.12)'
      : statusTone === 'warning'
        ? 'rgba(245, 158, 11, 0.14)'
        : statusTone === 'success'
          ? 'rgba(34, 197, 94, 0.12)'
          : 'var(--theme-elevation-50)'
  const statusBorder =
    statusTone === 'error'
      ? 'rgba(239, 68, 68, 0.45)'
      : statusTone === 'warning'
        ? 'rgba(245, 158, 11, 0.55)'
        : statusTone === 'success'
          ? 'rgba(34, 197, 94, 0.45)'
          : 'var(--theme-elevation-150)'

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{
          alignItems: 'center',
          background: 'var(--theme-elevation-0)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '0.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'space-between',
          padding: '0.85rem 1rem',
        }}
      >
        <div>
          <strong>Beitrag überarbeiten</strong>
          <div
            style={{
              color: 'var(--theme-elevation-600)',
              fontSize: '0.92rem',
              marginTop: '0.2rem',
            }}
          >
            Rewrite, QA und optionaler Repair im SpacePC-Stil.
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {rewriteModes.map((mode) => (
            <Button
              buttonStyle="secondary"
              disabled={isDisabled}
              key={mode.mode}
              onClick={() => handleRewrite(mode.mode)}
            >
              {isLoading ? 'Text wird geprüft...' : mode.label}
            </Button>
          ))}
        </div>
      </div>
      {statusMessage ? (
        <div
          style={{
            background: statusBackground,
            border: `1px solid ${statusBorder}`,
            borderRadius: '0.5rem',
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
          }}
        >
          {statusMessage}
        </div>
      ) : null}
      {pendingRewrite ? (
        <div
          style={{
            background: 'var(--theme-elevation-0)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '0.5rem',
            marginTop: '0.75rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              alignItems: 'center',
              borderBottom: '1px solid var(--theme-elevation-150)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
            }}
          >
            <div>
              <strong>Vorschau der Änderungen</strong>
              <div
                style={{
                  color: 'var(--theme-elevation-600)',
                  fontSize: '0.86rem',
                  marginTop: '0.2rem',
                }}
              >
                {addedLines + removedLines > 0
                  ? `${addedLines} hinzugefügt, ${removedLines} entfernt`
                  : 'Keine zeilenweisen Unterschiede erkannt'}
              </div>
              {pendingRewrite.requiresManualReview ? (
                <div
                  style={{
                    color: 'var(--theme-elevation-700)',
                    fontSize: '0.86rem',
                    marginTop: '0.35rem',
                  }}
                >
                  Nicht automatisch freigegeben. Bitte Diff vor dem Übernehmen manuell prüfen.
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Button buttonStyle="secondary" onClick={() => setPendingRewrite(null)}>
                Verwerfen
              </Button>
              <Button buttonStyle="primary" onClick={handleApplyRewrite}>
                Übernehmen
              </Button>
            </div>
          </div>
          <div
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
              fontSize: '0.86rem',
              maxHeight: '28rem',
              overflow: 'auto',
              padding: '0.75rem 0',
              whiteSpace: 'pre-wrap',
            }}
          >
            {diffRows.map((row, index) => {
              const isAdded = row.type === 'added'
              const isRemoved = row.type === 'removed'

              return (
                <div
                  key={`${row.type}-${index}`}
                  style={{
                    background: isAdded
                      ? 'rgba(34, 197, 94, 0.14)'
                      : isRemoved
                        ? 'rgba(239, 68, 68, 0.14)'
                        : 'transparent',
                    borderLeft: `3px solid ${
                      isAdded ? '#22c55e' : isRemoved ? '#ef4444' : 'transparent'
                    }`,
                    color: isRemoved ? 'var(--theme-elevation-650)' : 'inherit',
                    padding: '0.1rem 1rem',
                    textDecoration: isRemoved ? 'line-through' : 'none',
                  }}
                >
                  <span style={{ color: 'var(--theme-elevation-500)', userSelect: 'none' }}>
                    {isAdded ? '+ ' : isRemoved ? '- ' : '  '}
                  </span>
                  {row.text || ' '}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
