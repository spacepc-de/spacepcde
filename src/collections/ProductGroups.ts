import type { CollectionConfig } from 'payload'

import { normalizeSlug } from '../lib/slugify'

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
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        condition: () => false,
        hidden: true,
      },
      hooks: {
        beforeValidate: [
          ({ data, value }) => {
            if (typeof value === 'string' && value.trim()) {
              return normalizeSlug(value)
            }

            const title = data?.title

            if (typeof title === 'string' && title.trim()) {
              return normalizeSlug(title)
            }

            return value
          },
        ],
      },
    },
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
