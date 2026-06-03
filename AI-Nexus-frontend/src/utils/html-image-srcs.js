// ----------------------------------------------------------------------

/** Normalize image URLs for lightbox matching (absolute vs relative). */
export function normalizeImageSrc(src) {
  const raw = String(src || '').trim();
  if (!raw) return '';
  if (typeof window === 'undefined') return raw;
  try {
    return new URL(raw, window.location.origin).href;
  } catch {
    return raw;
  }
}

/** Collect unique image src values from HTML (TipTap / CKEditor output). */
export function extractImageSrcsFromHtml(html) {
  const raw = String(html || '').trim();
  if (!raw) return [];

  const seen = new Set();
  const srcs = [];

  const add = (value) => {
    const normalized = normalizeImageSrc(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    srcs.push(normalized);
  };

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      doc.querySelectorAll('img[src]').forEach((img) => add(img.getAttribute('src')));
      if (srcs.length) return srcs;
    } catch {
      // fall through to regex
    }
  }

  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let match = re.exec(raw);
  while (match) {
    add(match[1]);
    match = re.exec(raw);
  }

  return srcs;
}
