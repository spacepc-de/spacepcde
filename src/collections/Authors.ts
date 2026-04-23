import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { withTranslationButton } from '../fields/translationButton'

export const Authors: CollectionConfig = {
  slug: 'authors',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Blog',
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'updatedAt'],
  },
  fields: [
    withTranslationButton({
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
    }),
    slugField('name'),
    withTranslationButton({
      name: 'role',
      type: 'text',
      localized: true,
    }),
    withTranslationButton({
      name: 'bio',
      type: 'textarea',
      localized: true,
    }),
    {
      name: 'avatar',
      type: 'relationship',
      relationTo: 'media',
    },
  ],
}
