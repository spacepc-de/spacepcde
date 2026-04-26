import Image from 'next/image'

import { getFeaturedImage } from '@/lib/blog-frontend'

type PostWithFeaturedImage = {
  featuredImage?:
    | { alt?: string | null; height?: number | null; url?: string | null; width?: number | null }
    | number
    | null
  title: string
}

type Props = {
  className: string
  post: PostWithFeaturedImage
  priority?: boolean
  sizes: string
}

export function FeaturedPostImage({ className, post, priority = false, sizes }: Props) {
  const image = getFeaturedImage(post)

  if (!image) {
    return null
  }

  return (
    <Image
      alt={image.alt}
      className={className}
      priority={priority}
      sizes={sizes}
      src={image.url}
      unoptimized
      width={image.width}
      height={image.height}
    />
  )
}
