import { describe, expect, it } from 'vitest'

import { normalizeMarkdownFormatting } from '@/lib/markdownFormatting'

describe('normalizeMarkdownFormatting', () => {
  it('normalizes triple-fence closing lines with accidental language labels', () => {
    const input = [
      'Beispiel:',
      '```cpp',
      'int main() { return 0; }',
      '```text',
      'Fertig.',
    ].join('\n')

    const output = normalizeMarkdownFormatting(input)

    expect(output).toBe(
      ['Beispiel:', '```cpp', 'int main() { return 0; }', '```', 'Fertig.'].join('\n'),
    )
  })

  it('adds a missing closing triple-fence when markdown ends inside a fence', () => {
    const input = ['```text', 'hello'].join('\n')

    const output = normalizeMarkdownFormatting(input)

    expect(output).toBe(['```text', 'hello', '', '```'].join('\n'))
  })

  it('keeps four-backtick fences unchanged', () => {
    const input = ['````markdown', '```cpp', 'int x = 1;', '```', '````'].join('\n')

    const output = normalizeMarkdownFormatting(input)

    expect(output).toBe(input)
  })

  it('normalizes escaped triple-backtick fences', () => {
    const input = ['\\`\\`\\`cpp', 'int main() { return 0; }', '\\`\\`\\`'].join('\n')

    const output = normalizeMarkdownFormatting(input)

    expect(output).toBe(['```cpp', 'int main() { return 0; }', '```'].join('\n'))
  })

  it('removes empty headings outside code fences', () => {
    const input = ['#', '', 'Intro', '', '```text', '#', '```'].join('\n')

    const output = normalizeMarkdownFormatting(input)

    expect(output).toBe(['', 'Intro', '', '```text', '#', '```'].join('\n'))
  })
})
