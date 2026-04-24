'use client'

import { Button, toast, useDocumentInfo, useField, useFormModified, useLocale } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

const baseClass = 'translate-field-button'

export const TranslateFieldButton = (props: any) => {
  const { collectionSlug, id } = useDocumentInfo()
  const modified = useFormModified()
  const { code: locale } = useLocale()
  const { value } = useField<string>({ path: props.path })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  if (!props.field.localized || locale !== 'de') {
    return null
  }

  const fieldName = props.field.name
  const translationMode = props.field.custom?.translationMode ?? 'text'
  const isDisabled = !collectionSlug || !id || !value?.trim() || isLoading

  const handleTranslate = async () => {
    if (!collectionSlug || !id || !fieldName) {
      toast.error('Dokument erst speichern, dann übersetzen.')
      return
    }

    if (!value?.trim()) {
      toast.error('Kein deutscher Inhalt zum Übersetzen vorhanden.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/translate-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collectionSlug,
          fieldName,
          id,
          sourceLocale: 'de',
          targetLocale: 'en',
          translationMode,
          value,
        }),
      })

      const json = (await response.json()) as { message?: string; error?: string }

      if (!response.ok) {
        toast.error(json.error ?? 'Übersetzung fehlgeschlagen.')
        return
      }

      const currentURL = new URL(window.location.href)
      currentURL.searchParams.set('locale', 'en')

      if (modified) {
        window.open(currentURL.toString(), '_blank', 'noopener,noreferrer')
        toast.success(
          `${json.message ?? 'Englische Übersetzung gespeichert.'} Die englische Version wurde in einem neuen Tab geöffnet, damit ungespeicherte deutsche Änderungen nicht verloren gehen.`,
        )
      } else {
        toast.success(`${json.message ?? 'Englische Übersetzung gespeichert.'} Wechsel zu EN...`)
        router.push(currentURL.toString())
        router.refresh()
      }
    } catch {
      toast.error('Übersetzung fehlgeschlagen.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={baseClass}
      style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}
    >
      <Button buttonStyle="secondary" disabled={isDisabled} onClick={handleTranslate}>
        {isLoading ? 'Übersetze...' : 'Übersetzen'}
      </Button>
    </div>
  )
}
