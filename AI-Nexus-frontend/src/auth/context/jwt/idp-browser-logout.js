import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';

import {
  readMembershipSalesforceSession,
} from 'src/utils/membership-salesforce-session';

import { buildLogoutPayload, clearClientSalesforceSessions } from './logout-payload';
import { clearAuthSession } from './utils';

const IDP_LOGOUT_IFRAME_MS = 1200;
const USER_SESSION_KEY = 'user';

function readCachedUserSafe() {
  try {
    const raw = sessionStorage.getItem(USER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Absolute app sign-in URL used as Salesforce logout retUrl. */
export function getAppSignInUrl() {
  if (typeof window === 'undefined') return '';
  const base = (CONFIG.site.basePath || '').replace(/\/$/, '');
  return `${window.location.origin}${base}${paths.auth.simple.signIn}`;
}

/** Append or replace retUrl on the Salesforce browser logout URL. */
export function buildIdpLogoutRedirectUrl(browserLogoutUrl, retUrl) {
  const url = String(browserLogoutUrl || '').trim();
  const target = String(retUrl || getAppSignInUrl() || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return '';
  if (!target) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('retUrl', target);
    return parsed.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}retUrl=${encodeURIComponent(target)}`;
  }
}

/** Strip retUrl — Experience Cloud ignores external retUrl and shows its own Signin page. */
export function stripIdpLogoutRetUrl(browserLogoutUrl) {
  const url = String(browserLogoutUrl || '').trim();
  if (!url) return '';

  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('retUrl');
    return parsed.toString();
  } catch {
    return url.replace(/([?&])retUrl=[^&]*&?/g, '$1').replace(/[?&]$/, '');
  }
}

const IDP_LOGOUT_POPUP_MS = 2000;

/**
 * Clear Salesforce SSO in a popup (top-level navigation sends IdP cookies).
 * Do not pass retUrl — ISCA sends users to eservices.isca.org.sg/Signin instead of our app.
 */
export function triggerIdpBrowserLogoutPopup(browserLogoutUrl) {
  const logoutOnlyUrl = stripIdpLogoutRetUrl(browserLogoutUrl);
  if (!logoutOnlyUrl || !/^https?:\/\//i.test(logoutOnlyUrl)) return;

  try {
    const popup = window.open(
      logoutOnlyUrl,
      'sf-idp-logout',
      'width=1,height=1,left=-10000,top=-10000,noopener,noreferrer',
    );
    window.setTimeout(() => {
      try {
        popup?.close();
      } catch {
        // ignore
      }
    }, IDP_LOGOUT_POPUP_MS);
  } catch {
    void triggerIdpBrowserLogoutIframe(logoutOnlyUrl);
  }
}

/** End IdP browser session in background, then send the user to the app sign-in page. */
export function finishLogoutWithIdpBrowserClear(browserLogoutUrl, redirectTo) {
  const target = String(redirectTo || getAppSignInUrl() || '').trim();
  if (browserLogoutUrl) {
    triggerIdpBrowserLogoutPopup(browserLogoutUrl);
  }
  if (target) {
    window.location.assign(target);
  }
}

/** Best-effort IdP logout via hidden iframe (session expiry paths). */
export async function triggerIdpBrowserLogoutIframe(browserLogoutUrl) {
  const url = String(browserLogoutUrl || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return;

  await new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

    const cleanup = () => {
      window.clearTimeout(timer);
      iframe.remove();
      resolve();
    };

    iframe.onload = cleanup;
    iframe.onerror = cleanup;
    const timer = window.setTimeout(cleanup, IDP_LOGOUT_IFRAME_MS);

    document.body.appendChild(iframe);
    iframe.src = url;
  });
}

/**
 * Non-member SSO blocked from platform login — revoke eServices token, clear server session,
 * wipe local app state, and clear IdP browser cookies (popup).
 * @param {string} [socialAccessToken]
 */
export async function endEservicesSessionAfterBlockedLogin(socialAccessToken = '') {
  const token = String(socialAccessToken || '').trim();

  await clearAuthSession();
  clearClientSalesforceSessions();

  let browserLogoutUrl = null;
  try {
    const res = await axios.post(
      '/auth/oauth/end-eservices-session',
      token ? { socialAccessToken: token } : {},
      { skipAuthRefresh: true, skipApiLoading: true },
    );
    browserLogoutUrl = String(res.data?.browserLogoutUrl || '').trim() || null;
  } catch {
    browserLogoutUrl = await resolveIdpBrowserLogoutUrl({});
  }

  if (browserLogoutUrl) {
    triggerIdpBrowserLogoutPopup(browserLogoutUrl);
  }
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

/** Resolve Salesforce browser logout URL from logout API or public fallback endpoint. */
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

/**
 * Backend logout + resolve Salesforce browser logout URL.
 * Caller handles redirect (manual sign-out) or iframe (forced expiry).
 */
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
