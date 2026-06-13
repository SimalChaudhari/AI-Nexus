import { isSpotlightrUrl } from 'src/utils/spotlightr';
import { isYouTubeUrl } from 'src/utils/youtube';

/** @typedef {'youtube' | 'spotlightr' | 'native' | 'none'} VideoSourceKind */

/** @param {string | null | undefined} url @returns {VideoSourceKind} */
export function getVideoSourceKind(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return 'none';
  if (isYouTubeUrl(trimmed)) return 'youtube';
  if (isSpotlightrUrl(trimmed)) return 'spotlightr';
  return 'native';
}
