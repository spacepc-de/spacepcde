import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { withTranslationButton } from '../fields/translationButton'

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
    withTranslationButton({
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    }),
    slugField(),
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
        withTranslationButton({
          name: 'productName',
          type: 'text',
          required: true,
          localized: true,
          label: 'Produktname',
        }),
        withTranslationButton({
          name: 'link',
          type: 'text',
          required: true,
          localized: true,
          label: 'Link',
        }),
      ],
    },
  ],
}
