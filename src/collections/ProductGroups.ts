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
      defaultValue: [],
      labels: {
        singular: 'Produkt',
        plural: 'Produkte',
      },
      admin: {
        description: 'Manuelle Produktlinks. Optional, wenn Amazon-Produkte per Keyword oder ASIN geladen werden.',
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
    {
      name: 'amazonKeyword',
      type: 'text',
      label: 'Amazon Schlagwort',
      admin: {
        description: 'Optionales Suchkeyword für automatisch geladene Amazon-Produkte, z. B. "usb-c-kabel".',
      },
    },
    {
      name: 'amazonAsins',
      type: 'textarea',
      label: 'Amazon ASINs',
      admin: {
        description: 'Optionale feste ASINs, eine pro Zeile oder durch Kommas getrennt. ASINs haben Vorrang vor dem Keyword.',
      },
    },
    {
      name: 'amazonProductLimit',
      type: 'number',
      defaultValue: 4,
      label: 'Amazon Produktlimit',
      max: 8,
      min: 1,
      admin: {
        description: 'Maximale Anzahl automatisch geladener Amazon-Produkte für diese Gruppe.',
      },
    },
  ],
}
