import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { NetplanToolPage } from '@/components/frontend/NetplanToolPage'
import { getLocalizedAlternates, isLocaleCode } from '@/lib/frontend'
import {
  getNetplanToolContent,
  isNetplanToolSlug,
  NETPLAN_TOOL_SLUGS,
} from '@/lib/netplan'

export function generateStaticParams() {
  return NETPLAN_TOOL_SLUGS.flatMap((tool) => [{ tool }])
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; tool: string }>
}): Promise<Metadata> {
  const { locale, tool } = await params

  if (!isLocaleCode(locale) || !isNetplanToolSlug(tool)) {
    return {}
  }

  const content = getNetplanToolContent(locale, tool)

  return {
    alternates: getLocalizedAlternates(locale, `tools/${tool}`),
    description: content.description,
    title: `${content.title} | spacepc.de`,
  }
}

export default async function NetplanToolRoute({
  params,
}: {
  params: Promise<{ locale: string; tool: string }>
}) {
  const { locale, tool } = await params

  if (!isLocaleCode(locale) || !isNetplanToolSlug(tool)) {
    notFound()
  }

  return <NetplanToolPage locale={locale} slug={tool} />
}
