'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

import {
  getIntlUser,
  INTL_AUTH_CHANGED_EVENT,
  isIntlAuthenticated,
  setIntlSession,
} from 'src/auth/intl-session';
import { intlMe, intlSignOut } from 'src/services/intl-auth.service';

// ----------------------------------------------------------------------

const IntlAuthContext = createContext({
  user: null,
  ready: false,
  refresh: async () => null,
  applySession: () => {},
  signOut: () => {},
});

export function IntlAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore cached session before paint (survives dashboard ↔ profile navigations).
  useLayoutEffect(() => {
    if (!isIntlAuthenticated()) {
      setUser(null);
      setReady(true);
      return;
    }
    const cached = getIntlUser();
    if (cached) setUser(cached);
    setReady(true);
  }, []);

  // Keep React state in sync when payment-return / login writes sessionStorage.
  useEffect(() => {
    const onAuthChanged = () => {
      const nextUser = getIntlUser();
      setUser(nextUser || null);
      setReady(true);
    };
    window.addEventListener(INTL_AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(INTL_AUTH_CHANGED_EVENT, onAuthChanged);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isIntlAuthenticated()) return;
      try {
        const fresh = await intlMe();
        if (active && fresh) setUser(fresh);
      } catch {
        // keep cached
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isIntlAuthenticated()) {
      setUser(null);
      setReady(true);
      return null;
    }
    try {
      const fresh = await intlMe();
      if (fresh) setUser(fresh);
      setReady(true);
      return fresh;
    } catch {
      setReady(true);
      return getIntlUser();
    }
  }, []);

  const applySession = useCallback(({ accessToken, user: nextUser } = {}) => {
    if (accessToken || nextUser) {
      setIntlSession({ accessToken, user: nextUser });
      if (nextUser) setUser(nextUser);
      else setUser(getIntlUser());
    }
    setReady(true);
  }, []);

  const signOut = useCallback(() => {
    intlSignOut();
    setUser(null);
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      refresh,
      applySession,
      signOut,
    }),
    [user, ready, refresh, applySession, signOut]
  );

  return <IntlAuthContext.Provider value={value}>{children}</IntlAuthContext.Provider>;
}

export function useIntlAuth() {
  return useContext(IntlAuthContext);
}
