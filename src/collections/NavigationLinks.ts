import type { CollectionConfig } from 'payload'

import { withTranslationButton } from '../fields/translationButton'

export const NavigationLinks: CollectionConfig = {
  slug: 'navigation-links',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Layout',
    useAsTitle: 'label',
    defaultColumns: ['label', 'href', 'order', 'updatedAt'],
  },
  defaultSort: 'order',
  fields: [
    withTranslationButton({
      name: 'label',
      type: 'text',
      required: true,
      localized: true,
    }),
    withTranslationButton({
      name: 'href',
      type: 'text',
      required: true,
      localized: true,
    }),
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'openInNewTab',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'children',
      type: 'array',
      admin: {
        initCollapsed: true,
      },
      fields: [
        withTranslationButton({
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
        }),
        withTranslationButton({
          name: 'href',
          type: 'text',
          required: true,
          localized: true,
        }),
        {
          name: 'openInNewTab',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
}
