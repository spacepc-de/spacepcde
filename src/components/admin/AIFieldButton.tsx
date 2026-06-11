'use client'

import { Button, toast, useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import React, { useState } from 'react'

const baseClass = 'ai-field-button'
type EditorialMode = 'experienceReport' | 'opinion' | 'service' | 'technicalGuide'

type Props = {
  field: {
    custom?: {
      aiAction?: 'generateSeo' | 'rewriteMarkdown'
      aiLabel?: string
    }
    name?: string
  }
  path: string
}

type AIActionResponse = {
  error?: string
  message?: string
  result?: {
    content?: unknown
    contentMarkdown?: string
    editorialQa?: {
      score?: number
      spacepc_stil_score?: number
    }
    editorialMode?: EditorialMode
    repairRuns?: number
    seoDescription?: string
    seoTitle?: string
  }
}

export const AIFieldButton = (props: Props) => {
  const { collectionSlug, id } = useDocumentInfo()
  const { code: locale } = useLocale()
  const action = props.field.custom?.aiAction
  const buttonLabelOverride = props.field.custom?.aiLabel
  const [isLoading, setIsLoading] = useState(false)

  const titleField = useField<string>({ path: 'title' })
  const excerptField = useField<string>({ path: 'excerpt' })
  const contentField = useField<unknown>({ path: 'content' })
  const contentMarkdownField = useField<string>({ path: 'contentMarkdown' })
  const seoTitleField = useField<string>({ path: 'seoTitle' })
  const seoDescriptionField = useField<string>({ path: 'seoDescription' })

  if (!action) {
    return null
  }

  const handleGenerateSeo = async () => {
    if (!collectionSlug || !id) {
      toast.error('Dokument erst speichern, dann SEO generieren.')
      return
    }

    if (
      !titleField.value?.trim() &&
      !excerptField.value?.trim() &&
      !contentMarkdownField.value?.trim()
    ) {
      toast.error('Es fehlen Inhalte für die SEO-Generierung.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/ai-field-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
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

  const rewriteModes: Array<{ label: string; mode: EditorialMode }> = [
    { label: 'Anleitung', mode: 'technicalGuide' },
    { label: 'Erfahrung', mode: 'experienceReport' },
    { label: 'Meinung', mode: 'opinion' },
    { label: 'Service', mode: 'service' },
  ]

  const handleRewriteMarkdown = async (editorialMode: EditorialMode) => {
    if (!collectionSlug || !id) {
      toast.error('Dokument erst speichern, dann Inhalt umschreiben.')
      return
    }

    if (!contentField.value && !contentMarkdownField.value?.trim()) {
      toast.error('Kein Inhalt vorhanden.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/ai-field-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
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
        toast.error(json.error ?? 'Überarbeitung fehlgeschlagen.')
        return
      }

      contentMarkdownField.setValue(json.result.contentMarkdown)
      if (json.result.content) {
        contentField.setValue(json.result.content)
      }

      toast.success(json.message ?? 'Inhalt wurde überarbeitet und per QA freigegeben.')
    } catch {
      toast.error('Überarbeitung fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  const isDisabled =
    !collectionSlug ||
    !id ||
    isLoading ||
    (action === 'generateSeo'
      ? !titleField.value?.trim() &&
        !excerptField.value?.trim() &&
        !contentMarkdownField.value?.trim()
      : !contentField.value && !contentMarkdownField.value?.trim())

  if (action === 'rewriteMarkdown') {
    return (
      <div
        className={baseClass}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          justifyContent: 'flex-end',
          marginTop: '0.5rem',
        }}
      >
        {rewriteModes.map((mode) => (
          <Button
            buttonStyle="secondary"
            disabled={isDisabled}
            key={mode.mode}
            onClick={() => handleRewriteMarkdown(mode.mode)}
          >
            {isLoading ? 'Text wird geprüft...' : mode.label}
          </Button>
        ))}
      </div>
    )
  }

  const buttonLabel = buttonLabelOverride ?? (isLoading ? 'SEO wird erzeugt...' : 'SEO mit KI')

  return (
    <div
      className={baseClass}
      style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}
    >
      <Button buttonStyle="secondary" disabled={isDisabled} onClick={handleGenerateSeo}>
        {buttonLabel}
      </Button>
    </div>
  )
}
