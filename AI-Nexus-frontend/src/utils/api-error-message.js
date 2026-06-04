/**
 * Show API errors to users. Prefer the backend `message` field; use short fallbacks only
 * when the browser never received a response (e.g. connection lost).
 */

function isMultipartUpload(error) {
  const url = String(error?.config?.url || '');
  const method = String(error?.config?.method || '').toLowerCase();
  if (method !== 'post' && method !== 'put' && method !== 'patch') return false;
  return /upload/i.test(url) || error?.config?.data instanceof FormData;
}

function readBackendMessage(error) {
  const data = error?.response?.data;
  if (data && typeof data === 'object' && typeof data.message === 'string') {
    const text = data.message.trim();
    if (text) return text;
  }
  if (typeof data === 'string') {
    const text = data.trim();
    if (text && text.length < 300 && !text.startsWith('<')) return text;
  }
  return '';
}

const FALLBACK = {
  uploadFailed: 'Upload failed. Please try again or use a smaller file.',
  uploadTooLarge: 'This file is too large. Please choose a smaller video or image.',
  signInAgain: 'Your session has expired. Please sign in again.',
  noPermission: 'You do not have permission to do this.',
  serverDown: 'The server is not available right now. Please try again later.',
  generic: 'Something went wrong. Please try again.',
};

/**
 * @param {import('axios').AxiosError | Error} error
 */
export function getApiErrorMessage(error) {
  const fromBackend = readBackendMessage(error);
  if (fromBackend) return fromBackend;

  const upload = isMultipartUpload(error);
  const status = error?.response?.status;

  if (status === 413) return FALLBACK.uploadTooLarge;
  if (status === 401) return FALLBACK.signInAgain;
  if (status === 403) return FALLBACK.noPermission;
  if (status >= 500) return FALLBACK.serverDown;

  const noResponse = error?.message === 'Network Error' || !error?.response;
  if (noResponse) {
    return upload ? FALLBACK.uploadFailed : FALLBACK.serverDown;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return FALLBACK.generic;
}
