/**
 * Extract YouTube video id from watch, youtu.be, shorts, embed, and mobile links.
 * @param {string} url
 * @returns {string|null}
 */
export function getYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      const fromQuery = parsed.searchParams.get('v');
      if (fromQuery) return fromQuery;

      const parts = parsed.pathname.split('/').filter(Boolean);
      const [kind, id] = parts;
      if (id && ['embed', 'shorts', 'live', 'v'].includes(kind)) {
        return id;
      }
    }

    if (host === 'youtube-nocookie.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' && parts[1]) return parts[1];
    }
  } catch {
    // fall through to regex
  }

  if (!trimmed.includes('youtube') && !trimmed.includes('youtu.be')) return null;

  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{6,})/
  );
  return match?.[1] || null;
}

/**
 * Get YouTube embed URL from watch, youtu.be, shorts, or embed link.
 * @param {string} url
 * @returns {string|null}
 */
export function getYouTubeEmbedUrl(url) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}

/** @param {string} url */
export function isYouTubeUrl(url) {
  return Boolean(getYouTubeVideoId(url));
}
