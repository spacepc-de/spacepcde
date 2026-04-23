import type { CollectionConfig } from 'payload'

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Routing',
    useAsTitle: 'fromPath',
    defaultColumns: ['fromPath', 'toPath', 'statusCode', 'isEnabled', 'updatedAt'],
  },
  defaultSort: 'fromPath',
  fields: [
    {
      name: 'fromPath',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Exakter Quellpfad, z. B. /de/impressum-alt',
      },
    },
    {
      name: 'toPath',
      type: 'text',
      required: true,
      admin: {
        description: 'Zielpfad oder absolute URL, z. B. /de/impressum',
      },
    },
    {
      name: 'statusCode',
      type: 'select',
      required: true,
      defaultValue: '301',
      options: [
        {
          label: '301 Permanent',
          value: '301',
        },
        {
          label: '302 Temporary',
          value: '302',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'isEnabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
