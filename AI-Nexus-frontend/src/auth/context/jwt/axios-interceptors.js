import { CONFIG } from 'src/config-global';
import { apiLoading } from 'src/utils/api-loading';
import { getApiErrorMessage } from 'src/utils/api-error-message';
import { forceLogout, readCachedUser } from './session';

// ----------------------------------------------------------------------

const REFRESH_PATH = '/auth/refresh';
/** Auth routes that must not trigger access-token refresh (bootstrap /auth/me is not listed). */
const AUTH_EXEMPT_PATH =
  /\/auth\/(login|register|refresh|logout|forgot|reset|verify|health|oauth|establish-session|fee-waiver-audit|student-verification)/;

let refreshPromise = null;
let lastUnauthorizedRedirectAt = 0;

/** Suppress forceLogout briefly after SSO establish-session (avoids wiping a just-created session). */
const SSO_SESSION_GRACE_KEY = 'ssoSessionGraceUntil';
const SSO_SESSION_GRACE_MS = 15000;

export function markSsoSessionGracePeriod(ms = SSO_SESSION_GRACE_MS) {
  try {
    sessionStorage.setItem(SSO_SESSION_GRACE_KEY, String(Date.now() + ms));
  } catch {
    // ignore
  }
}

function isSsoSessionGraceActive() {
  try {
    const until = Number(sessionStorage.getItem(SSO_SESSION_GRACE_KEY) || 0);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function isAuthRoute(pathname) {
  if (typeof pathname !== 'string') return false;
  return pathname.startsWith('/auth');
}

function isAuthMeRequest(url) {
  return typeof url === 'string' && /\/auth\/me(?:\?|$)/.test(url);
}

async function refreshAuthSession(axiosInstance) {
  if (!refreshPromise) {
    refreshPromise = axiosInstance
      .post(REFRESH_PATH, {}, { skipAuthRefresh: true, skipApiLoading: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Proactively refresh the access-token cookie (single-flight).
 * Used before unload/keepalive progress saves so cookies are less likely to be expired.
 */
export function ensureFreshAuthSession(axiosInstance) {
  return refreshAuthSession(axiosInstance);
}

function shouldTrackApiLoading(config, method) {
  const isMutation = method !== 'get';
  return (isMutation || config?.trackApiLoading === true) && config?.skipApiLoading !== true;
}

// ----------------------------------------------------------------------

/** Register request + response interceptors for cookie auth, refresh, and logout. */
export function attachAuthAxiosInterceptors(axiosInstance) {
  // Request interceptor — HttpOnly cookies carry the access token.
  axiosInstance.interceptors.request.use(
    (config) => {
      const method = (config.method || 'get').toLowerCase();
      if (shouldTrackApiLoading(config, method)) {
        apiLoading.increment();
      }
      return config;
    },
    (error) => {
      apiLoading.decrement();
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response) => {
      const method = (response.config?.method || 'get').toLowerCase();
      if (shouldTrackApiLoading(response.config, method)) {
        apiLoading.decrement();
      }
      return response;
    },
    async (error) => {
      const method = (error.config?.method || 'get').toLowerCase();
      if (shouldTrackApiLoading(error.config, method)) {
        apiLoading.decrement();
      }

      if (error.code === 'ECONNREFUSED' || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        const connectionError = new Error(getApiErrorMessage(error));
        connectionError.code = 'ECONNREFUSED';
        return Promise.reject(connectionError);
      }

      if (error.response?.status === 413) {
        const tooLarge = new Error(getApiErrorMessage(error));
        tooLarge.code = 'PAYLOAD_TOO_LARGE';
        return Promise.reject(tooLarge);
      }

      if (error.message === 'Network Error' || !error.response) {
        const networkError = new Error(getApiErrorMessage(error));
        networkError.code = 'NETWORK_ERROR';
        return Promise.reject(networkError);
      }

      const originalConfig = error.config;
      const isRefreshRequest =
        typeof originalConfig?.url === 'string' && originalConfig.url.includes(REFRESH_PATH);

      if (error.response?.status === 401 && typeof window !== 'undefined') {
        const requestUrl = originalConfig?.url || error.config?.url || '';
        const isAuthRequest = AUTH_EXEMPT_PATH.test(requestUrl);
        const isMeRequest = isAuthMeRequest(requestUrl);
        const pathname = window.location.pathname || '';
        // OAuth callback/start: never wipe a just-issued SSO session via forceLogout.
        const isOAuthBootstrap =
          pathname.includes('/auth/oauth/callback') || pathname.includes('/auth/oauth/start');
        const inSsoGrace = isSsoSessionGraceActive();
        // /auth/me bootstrap must never call POST /auth/logout — that raced with SSO login.
        const allowForceLogout =
          Boolean(readCachedUser())
          && !isOAuthBootstrap
          && !isMeRequest
          && !inSsoGrace;

        const shouldTryRefresh =
          originalConfig &&
          !originalConfig._authRetry &&
          !originalConfig.skipAuthRefresh &&
          !isRefreshRequest &&
          !isAuthRequest &&
          !isOAuthBootstrap &&
          !isMeRequest;

        if (shouldTryRefresh) {
          originalConfig._authRetry = true;
          try {
            await refreshAuthSession(axiosInstance);
            return axiosInstance(originalConfig);
          } catch {
            if (allowForceLogout) {
              const now = Date.now();
              if (now - lastUnauthorizedRedirectAt >= 1500) {
                lastUnauthorizedRedirectAt = now;
                await forceLogout({ redirect: !isAuthRoute(window.location.pathname || '') });
              }
            }
            return Promise.reject(error);
          }
        }

        const shouldForceLogout =
          allowForceLogout &&
          !isAuthRequest &&
          (isRefreshRequest || originalConfig?._authRetry);

        if (shouldForceLogout) {
          const currentPath = window.location.pathname || '';
          if (!isAuthRoute(currentPath)) {
            const now = Date.now();
            if (now - lastUnauthorizedRedirectAt >= 1500) {
              lastUnauthorizedRedirectAt = now;
              await forceLogout({ redirect: true });
            }
          }
          return Promise.reject(error);
        }
      }

      const message = getApiErrorMessage(error);
      const finalError =
        error instanceof Error && error.message === message ? error : new Error(message);
      return Promise.reject(finalError);
    }
  );
}
