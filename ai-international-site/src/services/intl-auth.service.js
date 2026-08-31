import axios from 'src/utils/axios';

import { clearIntlSession, getIntlAccessToken, setIntlSession } from 'src/auth/intl-session';

export async function intlRegister(payload) {
  const res = await axios.post('/intl-auth/register', payload);
  const data = res.data || {};
  const { accessToken, user, message, draftUserId, signupAccessToken, requiresPayment } = data;
  // Only persist session for fully activated accounts (not unpaid drafts).
  if (accessToken && user && !requiresPayment) {
    setIntlSession({ accessToken, user });
  }
  return {
    accessToken,
    user,
    message,
    draftUserId,
    signupAccessToken,
    requiresPayment: Boolean(requiresPayment || draftUserId),
  };
}

export async function intlLogin({ identifier, password }) {
  const res = await axios.post('/intl-auth/login', { identifier, password });
  const { accessToken, user, message } = res.data || {};
  if (accessToken && user) {
    setIntlSession({ accessToken, user });
  }
  return { accessToken, user, message };
}

export async function intlMe() {
  const token = getIntlAccessToken();
  if (!token) return null;
  const res = await axios.get('/intl-auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const user = res.data?.user || null;
  if (user) setIntlSession({ accessToken: token, user });
  return user;
}

export function intlSignOut() {
  clearIntlSession();
}
