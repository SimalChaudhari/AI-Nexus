/**
 * Strip HTML tags for search, excerpts, and validation (TipTap / rich text).
 */
export function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  const withoutTags = html.replace(/<[^>]+>/g, ' ');
  return withoutTags.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export function isEffectivelyEmptyHtml(html) {
  return htmlToPlainText(html).length === 0;
}
