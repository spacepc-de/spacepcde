import { getCloudflareContext } from '@opennextjs/cloudflare'
import { NextResponse } from 'next/server'

function getMimeType(filename: string) {
  const extension = filename.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'avif':
      return 'image/avif'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

function getPublicFallbackUrl(request: Request, filename: string) {
  return new URL(`/blog-images/${encodeURIComponent(filename)}`, request.url)
}

async function getPublicFallbackResponse(request: Request, filename: string, method: 'GET' | 'HEAD') {
  const response = await fetch(getPublicFallbackUrl(request, filename), {
    method,
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(method === 'HEAD' ? null : response.body, {
    headers,
    status: response.status,
  })
}

async function getMediaResponse(request: Request, filename: string, method: 'GET' | 'HEAD') {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const object = await env.R2.get(filename)

    if (!object) {
      return getPublicFallbackResponse(request, filename, method)
    }

    const headers = new Headers()

    object.writeHttpMetadata(headers)

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', getMimeType(filename))
    }

    if (!headers.has('Content-Length')) {
      headers.set('Content-Length', String(object.size))
    }

    headers.set('Cache-Control', 'public, max-age=31536000, immutable')

    return new Response(method === 'HEAD' ? null : object.body, {
      headers,
      status: 200,
    })
  } catch {
    return getPublicFallbackResponse(request, filename, method)
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  return getMediaResponse(request, filename, 'GET')
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  return getMediaResponse(request, filename, 'HEAD')
}
