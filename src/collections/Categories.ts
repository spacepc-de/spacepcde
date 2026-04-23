import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { withTranslationButton } from '../fields/translationButton'

export const Categories: CollectionConfig = {
  slug: 'categories',
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
    withTranslationButton({
      name: 'description',
      type: 'textarea',
      localized: true,
    }),
  ],
}
