'use client'

import { Button, toast, useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import React, { useState } from 'react'

type AIActionResponse = {
  error?: string
  message?: string
  result?: {
    seoDescription?: string
    seoTitle?: string
  }
}

export const SeoAIActions = () => {
  const { collectionSlug, id } = useDocumentInfo()
  const { code: locale } = useLocale()
  const [isLoading, setIsLoading] = useState(false)

  const titleField = useField<string>({ path: 'title' })
  const excerptField = useField<string>({ path: 'excerpt' })
  const contentMarkdownField = useField<string>({ path: 'contentMarkdown' })
  const seoTitleField = useField<string>({ path: 'seoTitle' })
  const seoDescriptionField = useField<string>({ path: 'seoDescription' })

  const isDisabled =
    !collectionSlug ||
    !id ||
    isLoading ||
    (!titleField.value?.trim() && !excerptField.value?.trim() && !contentMarkdownField.value?.trim())

  const handleGenerateSeo = async () => {
    if (!collectionSlug || !id) {
      toast.error('Dokument erst speichern, dann SEO generieren.')
      return
    }

    if (!titleField.value?.trim() && !excerptField.value?.trim() && !contentMarkdownField.value?.trim()) {
      toast.error('Es fehlen Inhalte für die SEO-Generierung.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/ai-field-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateSeo',
          collectionSlug,
          id,
          locale,
          input: {
            contentMarkdown: contentMarkdownField.value,
            excerpt: excerptField.value,
            title: titleField.value,
          },
        }),
      })

      const json = (await response.json()) as AIActionResponse

      if (!response.ok || !json.result?.seoTitle || !json.result?.seoDescription) {
        toast.error(json.error ?? 'SEO-Generierung fehlgeschlagen.')
        return
      }

      seoTitleField.setValue(json.result.seoTitle)
      seoDescriptionField.setValue(json.result.seoDescription)
      toast.success(json.message ?? 'SEO-Felder wurden mit KI ausgefüllt.')
    } catch {
      toast.error('SEO-Generierung fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'space-between',
          padding: '0.85rem 1rem',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '0.5rem',
          background: 'var(--theme-elevation-0)',
        }}
      >
        <div>
          <strong>SEO mit KI</strong>
          <div style={{ color: 'var(--theme-elevation-600)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Meta-Titel und Meta-Description auf Basis von Titel und Inhalt erzeugen.
          </div>
        </div>

        <Button buttonStyle="secondary" disabled={isDisabled} onClick={handleGenerateSeo}>
          {isLoading ? 'SEO wird erzeugt...' : 'Meta-Daten mit KI erzeugen'}
        </Button>
      </div>
    </div>
  )
}
