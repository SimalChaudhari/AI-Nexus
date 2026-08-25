import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';

import {
  readMembershipSalesforceSession,
} from 'src/utils/membership-salesforce-session';

import { buildLogoutPayload, clearClientSalesforceSessions } from './logout-payload';
import { clearAuthSession } from './utils';

const USER_SESSION_KEY = 'user';

/**
 * Set on logout. Next SSO clears Salesforce cookies via
 * logout.jsp?retUrl=<authorize> (same Salesforce domain — no popup).
 */
export const FORCE_IDP_LOGIN_KEY = 'requireIdpLogin';

function readForceIdpLoginRaw() {
  try {
    return (
      window.localStorage.getItem(FORCE_IDP_LOGIN_KEY)
      || window.sessionStorage.getItem(FORCE_IDP_LOGIN_KEY)
      || ''
    );
  } catch {
    return '';
  }
}

export function markForceIdpLogin() {
  try {
    window.localStorage.setItem(FORCE_IDP_LOGIN_KEY, '1');
    window.sessionStorage.setItem(FORCE_IDP_LOGIN_KEY, '1');
  } catch {
    // ignore
  }
}

/** Peek only — do not clear (React Strict Mode remount safe). */
export function isForceIdpLogin() {
  const value = readForceIdpLoginRaw();
  return value === '1' || value === 'true';
}

export function clearForceIdpLogin() {
  try {
    window.localStorage.removeItem(FORCE_IDP_LOGIN_KEY);
    window.sessionStorage.removeItem(FORCE_IDP_LOGIN_KEY);
  } catch {
    // ignore
  }
}

export function consumeForceIdpLogin() {
  const forced = isForceIdpLogin();
  if (forced) clearForceIdpLogin();
  return forced;
}

function readCachedUserSafe() {
  try {
    const raw = sessionStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Absolute app sign-in URL used after logout. */
export function getAppSignInUrl(extraQuery = '') {
  if (typeof window === 'undefined') return '';
  const base = (CONFIG.site.basePath || '').replace(/\/$/, '');
  const path = `${window.location.origin}${base}${paths.auth.simple.signIn}`;
  const query = String(extraQuery || '').replace(/^\?/, '');
  return query ? `${path}?${query}` : path;
}

export function buildIdpLogoutRedirectUrl(browserLogoutUrl, retUrl) {
  const url = String(browserLogoutUrl || '').trim();
  const target = String(retUrl || getAppSignInUrl() || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return '';
  if (!target) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('retUrl', target);
    parsed.searchParams.set('retURL', target);
    return parsed.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}retUrl=${encodeURIComponent(target)}&retURL=${encodeURIComponent(target)}`;
  }
}

export function stripIdpLogoutRetUrl(browserLogoutUrl) {
  const url = String(browserLogoutUrl || '').trim();
  if (!url) return '';

  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('retUrl');
    parsed.searchParams.delete('retURL');
    return parsed.toString();
  } catch {
    return url.replace(/([?&])retURL?=[^&]*&?/gi, '$1').replace(/[?&]$/, '');
  }
}

export function openIdpLogoutPlaceholderWindow() {
  return null;
}

/** No popup. */
export function triggerIdpBrowserLogoutPopup(_browserLogoutUrl, existingPopup = null) {
  try {
    existingPopup?.close();
  } catch {
    // ignore
  }
  return null;
}

export async function triggerIdpBrowserLogoutIframe(_browserLogoutUrl) {
  // no-op
}

/**
 * Logout → stay on our app sign-in only (Individual + Corporate).
 * Never send the browser to Salesforce/eServices on logout.
 * Next SSO clears Salesforce cookies via logout.jsp?retUrl=authorize (same SF domain).
 */
export async function finishLogoutWithIdpBrowserClear(_browserLogoutUrl, redirectTo) {
  markForceIdpLogin();
  const target = String(redirectTo || getAppSignInUrl() || '').trim();
  if (target) {
    window.location.replace(target);
  }
}

/** Same-domain: logout.jsp?retUrl=<authorizeUrl> — clears cookies then shows login form. */
export function buildIdpLogoutThenAuthorizeUrl(browserLogoutUrl, authUrl) {
  const authorize = String(authUrl || '').trim();
  if (!authorize || !/^https?:\/\//i.test(authorize)) return '';

  // Salesforce blocks logout.jsp retUrl to a different host ("Invalid Page Redirection").
  // Always run logout.jsp on the same origin as authorize (e.g. eservices.isca.org.sg).
  let logoutBase = '';
  try {
    const auth = new URL(authorize);
    const configured = stripIdpLogoutRetUrl(browserLogoutUrl);
    let logoutPath = '/secur/logout.jsp';
    if (configured && /^https?:\/\//i.test(configured)) {
      try {
        logoutPath = new URL(configured).pathname || logoutPath;
      } catch {
        // keep default
      }
    }
    logoutBase = `${auth.origin}${logoutPath.startsWith('/') ? logoutPath : `/${logoutPath}`}`;
  } catch {
    logoutBase = stripIdpLogoutRetUrl(browserLogoutUrl);
  }

  if (!logoutBase) return '';
  return buildIdpLogoutRedirectUrl(logoutBase, authorize);
}

/**
 * Blocked SSO cleanup — clear local app session only.
 * Do NOT call Salesforce clearSession/revoke here: that raced with a successful
 * parallel SSO callback and logged users out right after sign-in.
 * @param {string} [socialAccessToken]
 */
export async function endEservicesSessionAfterBlockedLogin(socialAccessToken = '') {
  void socialAccessToken;
  await clearAuthSession();
  clearClientSalesforceSessions();
  markForceIdpLogin();
}

/**
 * Failed SSO error screen — user clicked "Go to sign in page".
 * Revoke eServices token + platform session so the next SSO is a fresh login
 * (Individual vs Corporate / ATO radios), then flag logout.jsp on next start.
 * @param {string} [socialAccessToken]
 */
export async function expireEservicesSessionOnFailedSignIn(socialAccessToken = '') {
  const token = String(socialAccessToken || '').trim();
  const payload = token ? { socialAccessToken: token } : buildLogoutPayload();

  try {
    await axios.post('/auth/oauth/end-eservices-session', payload, {
      skipAuthRefresh: true,
      skipApiLoading: true,
    });
  } catch {
    // Token may already be invalid after a failed callback.
  }

  try {
    await axios.post('/auth/logout', payload, {
      skipAuthRefresh: true,
      skipApiLoading: true,
    });
  } catch {
    // No platform session is expected when SSO never completed.
  }

  await clearAuthSession();
  clearClientSalesforceSessions();
  markForceIdpLogin();
}

function shouldAttemptIdpBrowserLogout(cachedUser) {
  const authProvider = String(cachedUser?.authProvider || '').toUpperCase();
  if (authProvider === 'OAUTH') return true;

  const membershipSf = readMembershipSalesforceSession();
  const supplementalToken = String(
    membershipSf?.socialToken || membershipSf?.pendingPlatformAccessToken || ''
  ).trim();
  if (supplementalToken) return true;

  const payload = buildLogoutPayload();
  return Boolean(String(payload?.socialAccessToken || '').trim());
}

export async function resolveIdpBrowserLogoutUrl({ logoutResponse, cachedUser } = {}) {
  const fromResponse = String(logoutResponse?.browserLogoutUrl || '').trim();
  if (fromResponse) return fromResponse;

  if (!shouldAttemptIdpBrowserLogout(cachedUser)) return null;

  try {
    const res = await axios.get('/auth/oauth/browser-logout-url', {
      skipAuthRefresh: true,
      skipApiLoading: true,
    });
    return String(res.data?.browserLogoutUrl || '').trim() || null;
  } catch {
    return null;
  }
}

export async function postLogoutWithIdpBrowserClear(cachedUser) {
  let logoutResponse = null;
  try {
    const res = await axios.post('/auth/logout', buildLogoutPayload(), {
      skipAuthRefresh: true,
      skipApiLoading: true,
    });
    logoutResponse = res.data;
  } catch (err) {
    const status = err?.response?.status;
    const message = String(err?.response?.data?.message || err?.message || '').toLowerCase();
    const isExpectedMissingSession =
      status === 401 || message.includes('session has expired') || message.includes('unauthorized');
    if (!isExpectedMissingSession) {
      console.warn('Backend logout failed (non-fatal):', err);
    }
  }

  const user = cachedUser ?? readCachedUserSafe();
  const browserLogoutUrl = await resolveIdpBrowserLogoutUrl({
    logoutResponse,
    cachedUser: user,
  });

  return { logoutResponse, browserLogoutUrl };
}
