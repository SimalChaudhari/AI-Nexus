const ENTITY_REPLACEMENTS = [
  [/&nbsp;/gi, ' '],
  [/&amp;/gi, '&'],
  [/&lt;/gi, '<'],
  [/&gt;/gi, '>'],
  [/&quot;/gi, '"'],
  [/&#39;/gi, "'"],
  [/&apos;/gi, "'"],
  [/&mdash;/gi, '—'],
  [/&ndash;/gi, '–'],
  [/&hellip;/gi, '…'],
  [/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))],
  [/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))],
];

/** Decode common HTML entities (browser or fallback). */
export function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') return '';
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }
  let out = text;
  ENTITY_REPLACEMENTS.forEach(([pattern, replacement]) => {
    out = out.replace(pattern, replacement);
  });
  return out;
}

/**
 * Strip HTML tags for search, excerpts, and validation (TipTap / rich text).
 */
export function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  const withoutTags = html.replace(/<[^>]+>/g, ' ');
  return decodeHtmlEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

export function isEffectivelyEmptyHtml(html) {
  return htmlToPlainText(html).length === 0;
}
