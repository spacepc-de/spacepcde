import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { withTranslationButton } from '../fields/translationButton'

export const Tags: CollectionConfig = {
  slug: 'tags',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Blog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'url', 'updatedAt'],
  },
  fields: [
    withTranslationButton({
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    }),
    slugField(),
  ],
}
