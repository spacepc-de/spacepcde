function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return ''
  }

  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:')
  ) {
    return trimmed
  }

  return ''
}

function parseInline(markdown: string) {
  const tokens: string[] = []

  const stash = (html: string) => {
    const key = `@@MARKDOWN_TOKEN_${tokens.length}@@`
    tokens.push(html)
    return key
  }

  let value = markdown

  value = value.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
    const safeSrc = sanitizeUrl(src)

    if (!safeSrc) {
      return ''
    }

    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
    return stash(`<img alt="${escapeHtml(alt)}" loading="lazy" src="${escapeHtml(safeSrc)}"${titleAttr} />`)
  })

  value = value.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title) => {
    const safeHref = sanitizeUrl(href)

    if (!safeHref) {
      return escapeHtml(label)
    }

    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
    const relAttr = safeHref.startsWith('http') ? ' rel="noreferrer"' : ''
    const targetAttr = safeHref.startsWith('http') ? ' target="_blank"' : ''
    return stash(
      `<a href="${escapeHtml(safeHref)}"${titleAttr}${relAttr}${targetAttr}>${parseInline(label)}</a>`,
    )
  })

  value = value.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`))

  value = escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')

  tokens.forEach((token, index) => {
    value = value.replaceAll(`@@MARKDOWN_TOKEN_${index}@@`, token)
  })

  return value
}

function isHorizontalRule(line: string) {
  return /^(\*\s*\*\s*\*|-{3,}|_{3,})$/.test(line.trim())
}

function isTableSeparator(line: string) {
  return /^\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?$/.test(line.trim())
}

function parseTableRow(line: string) {
  const normalized = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return normalized.split('|').map((cell) => parseInline(cell.trim()))
}

function renderTable(lines: string[]) {
  const [head, , ...body] = lines
  const headCells = parseTableRow(head)
  const bodyRows = body.map(parseTableRow)

  return [
    '<table>',
    '<thead><tr>',
    ...headCells.map((cell) => `<th>${cell}</th>`),
    '</tr></thead>',
    bodyRows.length > 0 ? '<tbody>' : '',
    ...bodyRows.flatMap((row) => ['<tr>', ...row.map((cell) => `<td>${cell}</td>`), '</tr>']),
    bodyRows.length > 0 ? '</tbody>' : '',
    '</table>',
  ].join('')
}

function renderList(lines: string[], ordered: boolean) {
  const tag = ordered ? 'ol' : 'ul'
  const items: string[] = []
  let current: string[] = []

  const flushItem = () => {
    if (current.length === 0) {
      return
    }

    items.push(`<li>${parseInline(current.join(' ').trim())}</li>`)
    current = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (ordered ? /^\d+\.\s+/.test(trimmed) : /^[-*+]\s+/.test(trimmed)) {
      flushItem()
      current.push(trimmed.replace(ordered ? /^\d+\.\s+/ : /^[-*+]\s+/, ''))
      continue
    }

    if (current.length > 0) {
      current.push(trimmed)
    }
  }

  flushItem()

  return `<${tag}>${items.join('')}</${tag}>`
}

function renderParagraph(lines: string[]) {
  return `<p>${parseInline(lines.join(' ').trim())}</p>`
}

function renderBlockquote(lines: string[]) {
  const inner = lines.map((line) => line.replace(/^\s*>\s?/, '')).join('\n')
  return `<blockquote>${renderMarkdownToHtml(inner)}</blockquote>`
}

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n')
  const blocks: string[] = []

  for (let index = 0; index < lines.length; ) {
    const rawLine = lines[index] ?? ''
    const trimmed = rawLine.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    const fenceMatch = trimmed.match(/^```(\S+)?$/)
    if (fenceMatch) {
      const codeLines: string[] = []
      const language = fenceMatch[1]?.trim()
      index += 1

      while (index < lines.length && !lines[index]!.trim().startsWith('```')) {
        codeLines.push(lines[index]!)
        index += 1
      }

      if (index < lines.length) {
        index += 1
      }

      const languageClass = language ? ` class="language-${escapeHtml(language)}"` : ''
      blocks.push(
        `<pre class="content-page__code"><code${languageClass}>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
      )
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = Math.min(6, headingMatch[1]!.length + 1)
      blocks.push(`<h${level}>${parseInline(headingMatch[2]!.trim())}</h${level}>`)
      index += 1
      continue
    }

    if (isHorizontalRule(trimmed)) {
      blocks.push('<hr />')
      index += 1
      continue
    }

    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = []

      while (index < lines.length && lines[index]!.trim().startsWith('>')) {
        quoteLines.push(lines[index]!)
        index += 1
      }

      blocks.push(renderBlockquote(quoteLines))
      continue
    }

    if (trimmed.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1] ?? '')) {
      const tableLines = [rawLine, lines[index + 1]!]
      index += 2

      while (index < lines.length && lines[index]!.trim().includes('|') && lines[index]!.trim()) {
        tableLines.push(lines[index]!)
        index += 1
      }

      blocks.push(renderTable(tableLines))
      continue
    }

    const orderedList = /^\d+\.\s+/.test(trimmed)
    const unorderedList = /^[-*+]\s+/.test(trimmed)

    if (orderedList || unorderedList) {
      const listLines: string[] = []
      const matcher = orderedList ? /^(\d+\.\s+|\s{2,}\S)/ : /^([-*+]\s+|\s{2,}\S)/

      while (index < lines.length && matcher.test(lines[index]!.trimStart()) && lines[index]!.trim()) {
        listLines.push(lines[index]!)
        index += 1
      }

      blocks.push(renderList(listLines, orderedList))
      continue
    }

    const paragraphLines: string[] = []

    while (index < lines.length) {
      const current = lines[index] ?? ''
      const currentTrimmed = current.trim()

      if (
        !currentTrimmed ||
        currentTrimmed.startsWith('>') ||
        currentTrimmed.startsWith('```') ||
        /^(#{1,6})\s+/.test(currentTrimmed) ||
        isHorizontalRule(currentTrimmed) ||
        /^\d+\.\s+/.test(currentTrimmed) ||
        /^[-*+]\s+/.test(currentTrimmed) ||
        (currentTrimmed.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1] ?? ''))
      ) {
        break
      }

      paragraphLines.push(current)
      index += 1
    }

    if (paragraphLines.length > 0) {
      blocks.push(renderParagraph(paragraphLines))
      continue
    }

    index += 1
  }

  return blocks.join('')
}
