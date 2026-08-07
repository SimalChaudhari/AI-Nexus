/**
 * Optional manual overrides for pathway module videos.
 * Dynamic URLs are loaded from curriculum pillar courses first;
 * set a value here only when you need to force a specific URL.
 * Supports YouTube, Spotlightr watch URLs, and direct video file URLs.
 */
export const MODULE_VIDEO_URLS = {
  // Example:
  // '01-00': 'https://www.youtube.com/watch?v=...',
};

export function getModuleVideoUrl(code) {
  const url = MODULE_VIDEO_URLS[code];
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}
