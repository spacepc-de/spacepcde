'use client'

import { Button, toast, useField } from '@payloadcms/ui'
import React from 'react'

import { normalizeSlug } from '@/lib/slugify'

type Props = {
  path: string
}

export const GenerateSlugButton = ({ path }: Props) => {
  const titleField = useField<string>({ path: 'title' })
  const slugField = useField<string>({ path })

  const title = titleField.value?.trim() ?? ''
  const nextSlug = title ? normalizeSlug(title) : ''
  const isDisabled = !title || !nextSlug || nextSlug === slugField.value

  const handleGenerateSlug = () => {
    if (!title) {
      toast.error('Es ist kein Titel vorhanden.')
      return
    }

    if (!nextSlug) {
      toast.error('Aus dem Titel konnte kein gueltiger Permalink erzeugt werden.')
      return
    }

    slugField.setValue(nextSlug)
    toast.success('Permalink wurde aus dem Titel erzeugt.')
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
      <Button buttonStyle="secondary" disabled={isDisabled} onClick={handleGenerateSlug}>
        Permalink aus Titel
      </Button>
    </div>
  )
}
