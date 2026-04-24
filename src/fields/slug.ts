import type { FieldHook, TextField } from 'payload'

import { normalizeSlug } from '../lib/slugify'
import { withTranslationButton } from './translationButton'

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

type SlugFieldOptions = {
  localized?: boolean
}

export const slugField = (fallbackField = 'title', options: SlugFieldOptions = {}): TextField => {
  const field: TextField = {
    name: 'url',
    type: 'text',
    required: true,
    localized: options.localized ?? true,
    admin: {
      description: 'URL-Slug fuer Frontend-Routen, z. B. mein-artikel',
      position: 'sidebar',
      components: {
        afterInput: ['./components/admin/GenerateSlugButton#GenerateSlugButton'],
      },
    },
    hooks: {
      beforeValidate: [buildSlugHook(fallbackField)],
    },
  }

  return field.localized ? withTranslationButton(field, 'slug') : field
}
