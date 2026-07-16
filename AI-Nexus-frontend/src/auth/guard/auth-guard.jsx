import { useState, useEffect, useCallback } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname, useSearchParams } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

export function AuthGuard({ children }) {
  const router = useRouter();

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const { authenticated, loading } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  const createQueryString = useCallback(
    (name, value) => {
      const params = new URLSearchParams();
      params.set(name, value);
      return params.toString();
    },
    []
  );

  const checkPermissions = async () => {
    if (loading) {
      return;
    }

    if (!authenticated) {
      const signInPath = paths.auth.simple.signIn;

      // Full path (pathname + search) so e.g. /product/checkout?step=1 is preserved
      const search = searchParams.toString();
      const returnToPath = search ? `${pathname}?${search}` : pathname;
      const href = `${signInPath}?${createQueryString('returnTo', returnToPath)}`;

      setIsChecking(false);
      router.replace(href);
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
