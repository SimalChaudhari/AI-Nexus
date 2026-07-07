/** Trim for compare — any real URL change (including switching back to a prior link) triggers reset. */
export function normalizeVideoUrlForCompare(url?: string | null): string {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}

export function isSectionVideoUrlChanged(
  previousUrl?: string | null,
  nextUrl?: string | null,
): boolean {
  return normalizeVideoUrlForCompare(previousUrl) !== normalizeVideoUrlForCompare(nextUrl);
}
