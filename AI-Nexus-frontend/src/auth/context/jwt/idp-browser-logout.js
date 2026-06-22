import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';

import {
  readMembershipSalesforceSession,
} from 'src/utils/membership-salesforce-session';

import { buildLogoutPayload } from './logout-payload';

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
    console.warn('Backend logout failed (non-fatal):', err);
  }

  const user = cachedUser ?? readCachedUserSafe();
  const browserLogoutUrl = await resolveIdpBrowserLogoutUrl({
    logoutResponse,
    cachedUser: user,
  });

  return { logoutResponse, browserLogoutUrl };
}
