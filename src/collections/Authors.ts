import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'

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
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField('name', { localized: false }),
    {
      name: 'role',
      type: 'text',
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'avatar',
      type: 'relationship',
      relationTo: 'media',
    },
  ],
}
