import type { CollectionConfig } from 'payload'

function getMediaProxyUrl(filename: string) {
  return `/api/media-proxy/${encodeURIComponent(filename)}`
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  hooks: {
    afterRead: [
      ({ doc }) => {
        if (!doc?.filename) {
          return doc
        }

        const url = getMediaProxyUrl(doc.filename)

        return {
          ...doc,
          thumbnailURL: url,
          url,
        }
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // These are not supported on Workers yet due to lack of sharp
    crop: false,
    focalPoint: false,
  },
}
