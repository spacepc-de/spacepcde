'use client'

import { Button, toast, useDocumentInfo, useField, useLocale } from '@payloadcms/ui'
import React, { useState } from 'react'

const baseClass = 'ai-field-button'

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

    if (!titleField.value?.trim() && !excerptField.value?.trim() && !contentMarkdownField.value?.trim()) {
      toast.error('Es fehlen Inhalte fuer die SEO-Generierung.')
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
      toast.success(json.message ?? 'SEO-Felder wurden mit KI ausgefuellt.')
    } catch {
      toast.error('SEO-Generierung fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRewriteMarkdown = async () => {
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
            title: titleField.value,
          },
        }),
      })

      const json = (await response.json()) as AIActionResponse

      if (!response.ok || !json.result?.contentMarkdown) {
        toast.error(json.error ?? 'Markdown-Umschreibung fehlgeschlagen.')
        return
      }

      contentMarkdownField.setValue(json.result.contentMarkdown)
      if (json.result.content) {
        contentField.setValue(json.result.content)
      }

      toast.success(json.message ?? 'Inhalt wurde in sauberes Markdown umgeschrieben.')
    } catch {
      toast.error('Markdown-Umschreibung fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  const buttonLabel =
    buttonLabelOverride ??
    (action === 'generateSeo'
      ? isLoading
        ? 'SEO wird erzeugt...'
        : 'SEO mit KI'
      : isLoading
        ? 'Markdown wird erzeugt...'
        : 'Mit KI in Markdown umschreiben')

  const isDisabled =
    !collectionSlug ||
    !id ||
    isLoading ||
    (action === 'generateSeo'
      ? !titleField.value?.trim() && !excerptField.value?.trim() && !contentMarkdownField.value?.trim()
      : !contentField.value && !contentMarkdownField.value?.trim())

  return (
    <div
      className={baseClass}
      style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}
    >
      <Button
        buttonStyle="secondary"
        disabled={isDisabled}
        onClick={action === 'generateSeo' ? handleGenerateSeo : handleRewriteMarkdown}
      >
        {buttonLabel}
      </Button>
    </div>
  )
}
