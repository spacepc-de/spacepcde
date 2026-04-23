import type { FieldHook, TextField } from 'payload'

import { withTranslationButton } from './translationButton'

const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildSlugHook =
  (fallbackField: string): FieldHook =>
  ({ data, value }) => {
    if (typeof value === 'string' && value.trim()) {
      return normalizeSlug(value)
    }

    const fallbackValue = data?.[fallbackField]

    if (typeof fallbackValue === 'string' && fallbackValue.trim()) {
      return normalizeSlug(fallbackValue)
    }

    return value
  }

export const slugField = (fallbackField = 'title'): TextField =>
  withTranslationButton(
    {
      name: 'url',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        description: 'URL-Slug fuer Frontend-Routen, z. B. mein-artikel',
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [buildSlugHook(fallbackField)],
      },
    },
    'slug',
  )
