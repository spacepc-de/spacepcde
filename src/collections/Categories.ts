import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'

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
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title', { localized: false }),
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
