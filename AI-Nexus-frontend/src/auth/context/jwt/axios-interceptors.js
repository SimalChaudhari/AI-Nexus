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

function isAuthRoute(pathname) {
  if (typeof pathname !== 'string') return false;
  return pathname.startsWith('/auth');
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
        const hadSession = Boolean(readCachedUser());

        const shouldTryRefresh =
          originalConfig &&
          !originalConfig._authRetry &&
          !originalConfig.skipAuthRefresh &&
          !isRefreshRequest &&
          !isAuthRequest;

        if (shouldTryRefresh) {
          originalConfig._authRetry = true;
          try {
            await refreshAuthSession(axiosInstance);
            return axiosInstance(originalConfig);
          } catch {
            if (hadSession) {
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
          hadSession &&
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
