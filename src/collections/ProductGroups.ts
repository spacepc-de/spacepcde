import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'

export const ProductGroups: CollectionConfig = {
  slug: 'product-groups',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Blog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title', { localized: false }),
    {
      name: 'products',
      type: 'array',
      required: true,
      minRows: 1,
      labels: {
        singular: 'Produkt',
        plural: 'Produkte',
      },
      fields: [
        {
          name: 'productName',
          type: 'text',
          required: true,
          label: 'Produktname',
        },
        {
          name: 'link',
          type: 'text',
          required: true,
          label: 'Link',
        },
      ],
    },
  ],
}
