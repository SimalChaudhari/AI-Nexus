import { paths } from 'src/routes/paths';

import axios from 'src/utils/axios';
import { clearCachedUser, clearLegacyTokenStorage } from './session';

// ----------------------------------------------------------------------

export function jwtDecode(token) {
  try {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid token!');
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));

    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export function isValidToken(accessToken) {
  if (!accessToken) {
    return false;
  }

  try {
    const decoded = jwtDecode(accessToken);

    if (!decoded) {
      return false;
    }

    if ('exp' in decoded) {
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    }

    return true;
  } catch (error) {
    console.error('Error during token validation:', error);
    return false;
  }
}

// ----------------------------------------------------------------------

/** Legacy helper — session is cookie-based; clears client cache only. */
export async function setSession() {
  try {
    delete axios.defaults.headers.common.Authorization;
    clearLegacyTokenStorage();
  } catch (error) {
    console.error('Error during set session:', error);
    throw error;
  }
}

/** Clear auth cookies via API and wipe client user cache. */
export async function clearAuthSession() {
  clearCachedUser();
  clearLegacyTokenStorage();
  delete axios.defaults.headers.common.Authorization;
}
