const TOKEN_KEY = 'intl_access_token';
const USER_KEY = 'intl_user';
const FLASH_TOAST_KEY = 'intl_flash_toast';
export const INTL_AUTH_CHANGED_EVENT = 'intl-auth-changed';

function emitAuthChanged(detail) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(INTL_AUTH_CHANGED_EVENT, { detail }));
  } catch {
    // ignore
  }
}

export function getIntlAccessToken() {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function getIntlUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setIntlSession({ accessToken, user }) {
  if (typeof window === 'undefined') return;
  let changed = false;
  try {
    if (accessToken) {
      const prevToken = sessionStorage.getItem(TOKEN_KEY) || '';
      if (prevToken !== accessToken) {
        sessionStorage.setItem(TOKEN_KEY, accessToken);
        changed = true;
      }
    }
    if (user) {
      const nextRaw = JSON.stringify(user);
      const prevRaw = sessionStorage.getItem(USER_KEY) || '';
      if (prevRaw !== nextRaw) {
        sessionStorage.setItem(USER_KEY, nextRaw);
        changed = true;
      }
    }
  } catch {
    // ignore storage errors
  }
  if (!changed) return;
  emitAuthChanged({
    accessToken: accessToken || getIntlAccessToken(),
    user: user || getIntlUser(),
  });
}

export function clearIntlSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
  emitAuthChanged({ accessToken: '', user: null });
}

export function isIntlAuthenticated() {
  return Boolean(getIntlAccessToken());
}

/** One-shot toast shown after navigation (payment success, sign-in, etc.). */
export function setIntlFlashToast({ message, severity = 'success' } = {}) {
  if (typeof window === 'undefined') return;
  const text = String(message || '').trim();
  if (!text) return;
  try {
    sessionStorage.setItem(
      FLASH_TOAST_KEY,
      JSON.stringify({ message: text, severity: severity || 'success' }),
    );
  } catch {
    // ignore
  }
}

export function consumeIntlFlashToast() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(FLASH_TOAST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(FLASH_TOAST_KEY);
    const parsed = JSON.parse(raw);
    const message = String(parsed?.message || '').trim();
    if (!message) return null;
    return {
      message,
      severity: parsed?.severity === 'error' ? 'error' : 'success',
    };
  } catch {
    try {
      sessionStorage.removeItem(FLASH_TOAST_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}
