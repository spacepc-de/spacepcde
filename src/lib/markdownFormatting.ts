const TRIPLE_FENCE_LINE =
  /^\s*["']?(?:```|(?:\\`){3})(?:\s*([A-Za-z0-9_+-]+))?\s*["']?\s*$/
const EMPTY_HEADING_LINE = /^\s{0,3}#{1,6}\s*$/

export function normalizeMarkdownFormatting(markdown: string) {
  const lines = markdown.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
  const normalizedLines: string[] = []
  let inTripleFence = false

  for (const line of lines) {
    const fenceMatch = line.match(TRIPLE_FENCE_LINE)

    if (!fenceMatch) {
      if (!inTripleFence && EMPTY_HEADING_LINE.test(line)) {
        continue
      }

      normalizedLines.push(line)
      continue
    }

    const language = fenceMatch[1]?.trim().toLowerCase()

    if (!inTripleFence) {
      normalizedLines.push(language ? `\`\`\`${language}` : '```')
      inTripleFence = true
      continue
    }

    normalizedLines.push('```')
    inTripleFence = false
  }

  if (inTripleFence) {
    if (normalizedLines.length > 0 && normalizedLines[normalizedLines.length - 1]?.trim() !== '') {
      normalizedLines.push('')
    }

    normalizedLines.push('```')
  }

  return normalizedLines.join('\n')
}
