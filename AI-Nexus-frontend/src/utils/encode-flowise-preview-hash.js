/**
 * Same encoding as Flowise `/embed/marketplace-preview` hash parsing.
 */
export function encodeFlowDataForHash(value) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(value)));
  } catch {
    return '';
  }
}
