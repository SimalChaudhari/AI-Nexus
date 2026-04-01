import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

export function GuestGuard({ children }) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const { loading, authenticated, user } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = async () => {
    if (loading) {
      return;
    }

    if (authenticated) {
      const returnTo = searchParams.get('returnTo');
      const userRole = (user?.role || 'user').toLowerCase();

      // Only for user role: navigate back to the previous route (e.g. checkout) after login
      if (userRole !== 'admin' && returnTo) {
        router.replace(returnTo);
        return;
      }
      if (userRole === 'admin') {
        router.replace(`${paths.admin.root}/dashboard`);
        return;
      }
      router.replace('/home');
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
