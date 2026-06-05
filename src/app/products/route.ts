import { NextResponse } from 'next/server'

import { getAmazonProducts, searchAmazonProducts } from '@/lib/amazonProducts'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function parseBoolean(value: string | null) {
  return value === '1' || value === 'true' || value === 'yes'
}

function parseItemCount(value: string | null) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed)) {
    return 6
  }

  return parsed
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword')?.trim()
    const asinParam = searchParams.get('asin') || searchParams.get('asins')
    const includeOffers = parseBoolean(searchParams.get('includeOffers'))

    if (keyword) {
      const result = await searchAmazonProducts({
        includeOffers,
        itemCount: parseItemCount(searchParams.get('limit')),
        keyword,
      })

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store',
        },
      })
    }

    const asins = asinParam?.split(',').map((asin) => asin.trim()).filter(Boolean) ?? []

    if (asins.length > 0) {
      const result = await getAmazonProducts({
        asins,
        includeOffers,
      })

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json(
      { error: 'Bitte keyword oder asin angeben.' },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
        status: 400,
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler'

    return NextResponse.json(
      { error: message },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
        status: 500,
      },
    )
  }
}
