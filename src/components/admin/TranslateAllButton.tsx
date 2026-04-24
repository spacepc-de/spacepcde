'use client'

import { Button, toast, useDocumentInfo, useField, useFormModified, useLocale } from '@payloadcms/ui'
import React, { useState } from 'react'

type TranslationMode = 'slug' | 'text'

type TranslateTask = {
  fieldName: 'contentMarkdown' | 'seoDescription' | 'seoTitle' | 'title' | 'url'
  label: string
  mode: TranslationMode
  value?: string | null
}

export const TranslateAllButton = () => {
  const { collectionSlug, id } = useDocumentInfo()
  const modified = useFormModified()
  const { code: locale } = useLocale()
  const [isLoading, setIsLoading] = useState(false)

  const titleField = useField<string>({ path: 'title' })
  const slugField = useField<string>({ path: 'url' })
  const contentMarkdownField = useField<string>({ path: 'contentMarkdown' })
  const seoTitleField = useField<string>({ path: 'seoTitle' })
  const seoDescriptionField = useField<string>({ path: 'seoDescription' })

  if (locale !== 'de') {
    return null
  }

  const tasks: TranslateTask[] = [
    { fieldName: 'title', label: 'Titel', mode: 'text', value: titleField.value },
    { fieldName: 'url', label: 'Slug', mode: 'slug', value: slugField.value },
    { fieldName: 'contentMarkdown', label: 'Content', mode: 'text', value: contentMarkdownField.value },
    { fieldName: 'seoTitle', label: 'SEO-Titel', mode: 'text', value: seoTitleField.value },
    { fieldName: 'seoDescription', label: 'SEO-Beschreibung', mode: 'text', value: seoDescriptionField.value },
  ]

  const availableTasks = tasks.filter((task) => task.value?.trim())

  const isDisabled = !collectionSlug || !id || isLoading || modified || availableTasks.length === 0

  const handleTranslateAll = async () => {
    if (!collectionSlug || !id) {
      toast.error('Dokument erst speichern, dann alles übersetzen.')
      return
    }

    if (modified) {
      toast.error('Bitte zuerst speichern, damit alle Felder konsistent übersetzt werden.')
      return
    }

    if (availableTasks.length === 0) {
      toast.error('Keine deutschen Inhalte zum Übersetzen vorhanden.')
      return
    }

    setIsLoading(true)

    try {
      for (const task of availableTasks) {
        const response = await fetch('/api/admin/translate-field', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            collectionSlug,
            fieldName: task.fieldName,
            id,
            sourceLocale: 'de',
            targetLocale: 'en',
            translationMode: task.mode,
            value: task.value,
          }),
        })

        const json = (await response.json()) as { error?: string; message?: string }

        if (!response.ok) {
          toast.error(`${task.label}: ${json.error ?? 'Übersetzung fehlgeschlagen.'}`)
          return
        }
      }

      toast.success('Titel, Slug, Content und SEO wurden einzeln nach EN übersetzt.')
    } catch {
      toast.error('Gesamtübersetzung fehlgeschlagen.')
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
          <strong>Alles übersetzen</strong>
          <div style={{ color: 'var(--theme-elevation-600)', fontSize: '0.92rem', marginTop: '0.2rem' }}>
            Titel, Slug, Content und SEO werden als getrennte KI-Anfragen nach Englisch übersetzt.
          </div>
        </div>

        <Button buttonStyle="secondary" disabled={isDisabled} onClick={handleTranslateAll}>
          {isLoading ? 'Übersetze Felder...' : 'Alles nach EN übersetzen'}
        </Button>
      </div>
    </div>
  )
}
