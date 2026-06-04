import { CONFIG } from 'src/config-global';

function getRequestUrl(error) {
  const base = (CONFIG.site.serverUrl || '').replace(/\/$/, '');
  const path = error?.config?.url || '';
  if (!path) return base || '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function isMultipartUpload(error) {
  const url = String(error?.config?.url || '');
  const method = String(error?.config?.method || '').toLowerCase();
  if (method !== 'post' && method !== 'put' && method !== 'patch') return false;
  return (
    /upload/i.test(url) ||
    error?.config?.data instanceof FormData
  );
}

function isCrossOriginApiCall() {
  if (typeof window === 'undefined') return false;
  const apiBase = (CONFIG.site.serverUrl || '').trim();
  if (!apiBase || !/^https?:\/\//i.test(apiBase)) return false;
  try {
    const apiOrigin = new URL(apiBase).origin;
    return apiOrigin !== window.location.origin;
  } catch {
    return false;
  }
}

function formatFileSizeMb(bytes) {
  if (!bytes || !Number.isFinite(bytes)) return '';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/**
 * Turn axios/fetch failures into a short, actionable message for toasts and forms.
 */
export function getApiErrorMessage(error, options = {}) {
  const { context = 'request' } = options;
  const upload = isMultipartUpload(error);
  const requestUrl = getRequestUrl(error);
  const status = error?.response?.status;
  const data = error?.response?.data;

  // Prefer message from backend (GlobalExceptionFilter JSON)
  if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof data === 'string' && data.trim() && data.length < 300 && !data.startsWith('<')) {
    return data;
  }

  if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ERR_CONNECTION_REFUSED')) {
    return `Cannot reach the API server. Check that the backend is running (${requestUrl || CONFIG.site.serverUrl}).`;
  }

  if (error?.code === 'ECONNABORTED' || /timeout/i.test(error?.message || '')) {
    return upload
      ? 'Upload timed out. The file may be too large or the server is slow. Try a smaller video or ask your administrator to increase proxy timeouts.'
      : 'Request timed out. Please try again.';
  }

  if (status === 413) {
    const file = error?.config?.data instanceof FormData
      ? error.config.data.get('video') || error.config.data.get('file') || error.config.data.get('logo')
      : null;
    const sizeHint = file instanceof File ? ` (your file is about ${formatFileSizeMb(file.size)})` : '';
    return `File is too large for the server${sizeHint}. Ask your administrator to increase nginx client_max_body_size (e.g. 500M) on the API port.`;
  }

  if (status === 401) {
    return upload
      ? 'You are not signed in on the API host, or your session expired. Sign in again, then retry the upload.'
      : 'Session expired. Please sign in again.';
  }

  if (status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (status === 404) {
    return `API route not found (${requestUrl}). The server may be misconfigured — check that /api is proxied to the backend.`;
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'The API server or gateway is unavailable. Try again in a few minutes or contact support.';
  }

  if (status >= 500) {
    return 'Server error while processing your request. Please try again.';
  }

  const noResponse = error?.message === 'Network Error' || !error.response;
  if (noResponse) {
    const crossOrigin = isCrossOriginApiCall();
    const pageOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    const apiOrigin = (() => {
      try {
        return new URL(CONFIG.site.serverUrl).origin;
      } catch {
        return CONFIG.site.serverUrl;
      }
    })();

    if (upload && crossOrigin) {
      return (
        `Upload blocked (browser security / CORS). The app is on ${pageOrigin} but the API is ${apiOrigin}. ` +
        'Log in on the same API URL, ensure FRONTEND_URLS includes the site origin on the backend, ' +
        'or fix nginx so large uploads return proper CORS headers (not only "Network error").'
      );
    }

    if (upload) {
      return (
        `Video upload failed before the server responded. Common causes: file too large (nginx 413), CORS, or API offline. ` +
        `Target: ${requestUrl || 'API'}.`
      );
    }

    if (crossOrigin) {
      return `Cannot reach the API at ${apiOrigin} from ${pageOrigin}. Check CORS settings and that the backend is running.`;
    }

    return `Cannot reach the server (${requestUrl || CONFIG.site.serverUrl}). Check your connection and that the backend is running.`;
  }

  if (error instanceof Error && error.message && context !== 'request') {
    return error.message;
  }

  return error?.message || 'Something went wrong. Please try again.';
}
