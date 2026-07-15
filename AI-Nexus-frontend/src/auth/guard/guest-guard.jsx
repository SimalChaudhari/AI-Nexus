import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams, usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';

import { SplashScreen } from 'src/components/loading-screen';

import { isMembershipApplicationPending } from 'src/utils/membership-salesforce-session';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

export function GuestGuard({ children }) {
  const router = useRouter();

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { loading, authenticated, user } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = async () => {
    if (loading) {
      return;
    }

    if (authenticated) {
      const returnTo = searchParams.get('returnTo');
      const userRole = (user?.role || 'user').toLowerCase();

      // Let the OAuth callback page finish merging session + redirect (avoids racing to /home).
      if (pathname?.includes('/auth/oauth/callback')) {
        setIsChecking(false);
        return;
      }

      // Recognition membership tab: stay on application form; do not redirect to /home.
      if (
        pathname?.includes('/auth/membership/application')
        || pathname?.includes('/auth/membership/student-application')
        || pathname?.includes('/auth/membership/salesforce-bridge')
        || pathname?.includes('/auth/membership/salesforce-create')
        || isMembershipApplicationPending()
      ) {
        setIsChecking(false);
        return;
      }

      // Only for learner role: navigate back to the previous route (e.g. checkout) after login
      if (userRole !== 'admin' && userRole !== 'corporate' && returnTo) {
        router.replace(returnTo);
        return;
      }
      if (userRole === 'admin') {
        router.replace(`${paths.admin.root}/dashboard`);
        return;
      }
      if (userRole === 'corporate') {
        router.replace(paths.corporate.overview);
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
  }, [authenticated, loading, pathname]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
