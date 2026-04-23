function decodeHtmlEntities(input) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
}

function stripTags(input) {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ""));
}

function normalizeParagraphContent(input) {
  const text = stripTags(input).trim();
  if (!text) return "";
  return text;
}

function convertHtmlToMarkdown(input) {
  let output = input.replace(/\r\n/g, "\n");

  output = output.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
    return `\n\`\`\`\n${decodeHtmlEntities(code).trim()}\n\`\`\`\n`;
  });

  output = output.replace(/<img\b[^>]*src=(['"])(.*?)\1[^>]*>/gi, (match, _, src) => {
    const altMatch = match.match(/\balt=(['"])(.*?)\1/i);
    const alt = altMatch ? normalizeParagraphContent(altMatch[2]) : "";
    return `\n![${alt}](${decodeHtmlEntities(src).trim()})\n`;
  });

  output = output.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => {
    return `\n${"#".repeat(Number(level))} ${normalizeParagraphContent(text)}\n`;
  });

  output = output.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, list) => {
    const items = [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => {
      return `- ${normalizeParagraphContent(match[1])}`;
    });
    return `\n${items.join("\n")}\n`;
  });

  output = output.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, list) => {
    const items = [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match, index) => {
      return `${index + 1}. ${normalizeParagraphContent(match[1])}`;
    });
    return `\n${items.join("\n")}\n`;
  });

  output = output.replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    return `[${normalizeParagraphContent(text)}](${decodeHtmlEntities(href)})`;
  });

  output = output.replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_, __, text) => {
    return `**${normalizeParagraphContent(text)}**`;
  });

  output = output.replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_, __, text) => {
    return `*${normalizeParagraphContent(text)}*`;
  });

  output = output.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, text) => {
    return `\`${decodeHtmlEntities(text).trim()}\``;
  });

  output = output.replace(/<br\s*\/?>/gi, "\n");
  output = output.replace(/<hr\s*\/?>/gi, "\n---\n");

  output = output.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => {
    const content = normalizeParagraphContent(text);
    return content ? `${content}\n\n` : "\n";
  });

  output = output.replace(/<[^>]+>/g, "");
  output = decodeHtmlEntities(output);
  output = output.replace(/\n{3,}/g, "\n\n");

  return output.trim();
}

export function toMarkdown(input) {
  if (!input || typeof input !== "string") return "";
  if (!/<[a-z][\s\S]*>/i.test(input)) {
    return input.trim();
  }
  return convertHtmlToMarkdown(input);
}
