const TOKEN_KEY = 'intl_access_token';
const USER_KEY = 'intl_user';

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
  try {
    if (accessToken) sessionStorage.setItem(TOKEN_KEY, accessToken);
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
}

export function clearIntlSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export function isIntlAuthenticated() {
  return Boolean(getIntlAccessToken());
}
