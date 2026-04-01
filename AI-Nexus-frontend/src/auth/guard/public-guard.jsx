import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

export function PublicGuard({ children }) {
  const router = useRouter();

  const { loading, authenticated, user } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  const checkPermissions = async () => {
    if (loading) {
      return;
    }

    // If user is authenticated and is Admin, redirect to admin dashboard
    if (authenticated && user?.role === 'Admin') {
      router.replace(paths.dashboard.root);
      return;
    }

    setIsChecking(false);
  };

  useEffect(() => {
    checkPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, loading, user?.role]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}

