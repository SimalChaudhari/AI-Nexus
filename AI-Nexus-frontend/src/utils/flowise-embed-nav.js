import { resolveFlowisePublicBaseUrl, resolveFlowiseApiBaseUrl } from 'src/utils/flowise-public-url';

/** Flowise UI (other origin) asks the parent AI Nexus tab to open the bridge. */
export const MSG_AINEXUS_NAVIGATE = 'AINEXUS_NAVIGATE';

/** flowise-bridge running in an iframe asks the parent tab to start Flowise cookie login. */
export const MSG_FLOWISE_AUTH_REDIRECT = 'AINEXUS_FLOWISE_AUTH_REDIRECT';

export function isAllowedFlowiseExternalLoginUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '') || '/';
    if (path !== '/api/v1/auth/external-login') return false;

    const allowedOrigins = new Set();
    for (const base of [resolveFlowiseApiBaseUrl(), resolveFlowisePublicBaseUrl()]) {
      if (!base) continue;
      const resolved = /^https?:\/\//i.test(base)
        ? base
        : `${window.location.origin}${base.startsWith('/') ? base : `/${base}`}`;
      allowedOrigins.add(new URL(resolved).origin);
    }
    return allowedOrigins.has(u.origin);
  } catch {
    return false;
  }
}

/**
 * Use top-level navigation when possible so auth never stays trapped in an iframe
 * (avoids chrome-error + "Unsafe attempt to load URL" when ports/origins differ).
 */
export function redirectTopOrSameTab(url) {
  const raw = String(url || '').trim();
  if (!raw) return;

  if (window.top === window.self) {
    window.location.replace(raw);
    return;
  }

  try {
    if (window.top) {
      window.top.location.replace(raw);
      return;
    }
  } catch {
    // cross-origin top — ask parent tab (AI Nexus) to navigate
  }

  const absolute = /^https?:\/\//i.test(raw)
    ? raw
    : `${window.location.origin}${raw.startsWith('/') ? raw : `/${raw}`}`;

  try {
    window.parent?.postMessage({ type: MSG_AINEXUS_NAVIGATE, url: absolute }, '*');
  } catch {
    window.location.replace(raw);
  }
}

/**
 * flowise-bridge → Flowise external-login; may need parent when running in a sandboxed iframe.
 */
export function redirectFlowiseAuthFromBridge(url) {
  const target = String(url || '').trim();
  if (!target) return;

  if (window.top === window.self) {
    window.location.replace(target);
    return;
  }

  try {
    if (window.top) {
      window.top.location.replace(target);
      return;
    }
  } catch {
    // cross-origin top — parent must navigate
  }

  try {
    window.parent?.postMessage({ type: MSG_FLOWISE_AUTH_REDIRECT, url: target }, '*');
  } catch {
    window.location.replace(target);
  }
}

export function registerFlowiseParentMessageListeners() {
  const onMessage = (event) => {
    const { data } = event;
    if (!data || typeof data !== 'object') return;

    if (data.type === MSG_AINEXUS_NAVIGATE && typeof data.url === 'string') {
      try {
        const u = new URL(data.url);
        if (u.origin !== window.location.origin) return;
        const { pathname } = u;
        if (
          !pathname.startsWith('/flowise-bridge') &&
          !pathname.startsWith('/auth/') &&
          pathname !== '/home'
        ) {
          return;
        }
        window.location.assign(data.url);
      } catch {
        // ignore
      }
      return;
    }

    if (data.type === MSG_FLOWISE_AUTH_REDIRECT && typeof data.url === 'string') {
      if (!isAllowedFlowiseExternalLoginUrl(data.url)) return;
      window.location.replace(data.url);
    }
  };

  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}
