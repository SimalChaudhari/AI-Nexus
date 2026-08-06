import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import { normalizeUserForSession } from 'src/auth/utils/normalize-user-session';
import { clearClientSalesforceSessions } from './logout-payload';
import { postLogoutWithIdpBrowserClear, finishLogoutWithIdpBrowserClear } from './idp-browser-logout';

const USER_SESSION_KEY = 'user';

/** Read cached user profile from sessionStorage (not the JWT). */
export function readCachedUser() {
  try {
    const raw = sessionStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCachedUser(user) {
  if (!user) {
    sessionStorage.removeItem(USER_SESSION_KEY);
    return null;
  }
  const normalized = normalizeUserForSession(user);
  sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearCachedUser() {
  sessionStorage.removeItem(USER_SESSION_KEY);
}

/** Fetch current user from API (HttpOnly access cookie is sent automatically). */
export async function fetchCurrentUser() {
  try {
    // skipAuthRefresh: a 401 here means "not logged in", not "force logout".
    // Refresh+forceLogout on /auth/me was calling POST /auth/logout right after SSO.
    const res = await axios.get('/auth/me', {
      skipApiLoading: true,
      skipAuthRefresh: true,
    });
    const user = res.data?.user;
    if (user) {
      return writeCachedUser(user);
    }
    clearCachedUser();
    return null;
  } catch (error) {
    if (error?.response?.status === 401) {
      clearCachedUser();
      return null;
    }
    throw error;
  }
}

let logoutInFlight = null;

/**
 * End session on the server (revoke refresh token + clear cookies) and on the client.
 * Used when access/refresh tokens expire or refresh fails.
 */
export async function forceLogout({ redirect = true } = {}) {
  if (logoutInFlight) {
    return logoutInFlight;
  }

  logoutInFlight = (async () => {
    const cachedUser = readCachedUser();
    try {
      await postLogoutWithIdpBrowserClear(cachedUser);
    } catch {
      // Still clear client state if cookies are already invalid.
    }

    clearCachedUser();
    clearLegacyTokenStorage();
    clearClientSalesforceSessions();
    delete axios.defaults.headers.common.Authorization;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }

    if (redirect && typeof window !== 'undefined') {
      const currentPath = window.location.pathname || '';
      if (!currentPath.startsWith('/auth')) {
        const returnTo = encodeURIComponent(currentPath + window.location.search);
        const base = (CONFIG.site.basePath || '').replace(/\/$/, '');
        const signInUrl = `${window.location.origin}${base}${CONFIG.auth.redirectPath}?returnTo=${returnTo}`;

        // Never open Salesforce on logout — next SSO clears IdP cookies.
        await finishLogoutWithIdpBrowserClear(null, signInUrl);
      }
    }
  })().finally(() => {
    logoutInFlight = null;
  });

  return logoutInFlight;
}

/** Clear legacy token storage from older auth implementation. */
export function clearLegacyTokenStorage() {
  try {
    sessionStorage.removeItem('jwt_access_token');
    localStorage.removeItem('jwt_access_token');
    localStorage.removeItem('access-token');
  } catch {
    // ignore
  }
}
