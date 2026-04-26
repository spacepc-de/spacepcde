'use client'

import { Button, toast, useDocumentInfo, useField } from '@payloadcms/ui'
import React, { useState } from 'react'

type FormatMarkdownResponse = {
  error?: string
  message?: string
  result?: {
    content?: unknown
    contentMarkdown?: string
  }
}

export const MarkdownFormatAction = () => {
  const { collectionSlug } = useDocumentInfo()
  const [isLoading, setIsLoading] = useState(false)

  const contentField = useField<unknown>({ path: 'content' })
  const contentMarkdownField = useField<string>({ path: 'contentMarkdown' })

  const hasInput = Boolean(contentField.value) || Boolean(contentMarkdownField.value?.trim())
  const isDisabled = !collectionSlug || isLoading || !hasInput

  const handleFormatMarkdown = async () => {
    if (!collectionSlug) {
      toast.error('Collection konnte nicht erkannt werden.')
      return
    }

    if (!contentField.value && !contentMarkdownField.value?.trim()) {
      toast.error('Kein Inhalt vorhanden.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/format-markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionSlug,
          input: {
            content: contentField.value,
            contentMarkdown: contentMarkdownField.value,
          },
        }),
      })

      const json = (await response.json()) as FormatMarkdownResponse

      if (!response.ok || !json.result?.contentMarkdown) {
        toast.error(json.error ?? 'Markdown-Formatierung fehlgeschlagen.')
        return
      }

      contentMarkdownField.setValue(json.result.contentMarkdown)
      if (json.result.content) {
        contentField.setValue(json.result.content)
      }

      toast.success(json.message ?? 'Markdown wurde formatiert und synchronisiert.')
    } catch {
      toast.error('Markdown-Formatierung fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{
          alignItems: 'center',
          background: 'var(--theme-elevation-0)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '0.5rem',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'space-between',
          padding: '0.85rem 1rem',
        }}
      >
        <div>
          <strong>Markdown synchronisieren</strong>
          <div style={{ color: 'var(--theme-elevation-600)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Normalisiert Markdown und synchronisiert es mit dem Editor-Inhalt.
          </div>
        </div>

        <Button buttonStyle="secondary" disabled={isDisabled} onClick={handleFormatMarkdown}>
          {isLoading ? 'Formatiere Markdown...' : 'Markdown formatieren'}
        </Button>
      </div>
    </div>
  )
}
