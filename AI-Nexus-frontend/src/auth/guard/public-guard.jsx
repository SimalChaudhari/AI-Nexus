import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { SplashScreen } from 'src/components/loading-screen';

import { useAuthContext } from '../hooks';

// ----------------------------------------------------------------------

/** Survives Strict Mode remounts so we never swap SplashScreen ↔ children again. */
let publicGuardReady = false;

export function PublicGuard({ children }) {
  const router = useRouter();

  const { loading, authenticated, user } = useAuthContext();

  const [ready, setReady] = useState(() => publicGuardReady);

  useEffect(() => {
    if (loading) {
      return;
    }

    // If user is authenticated and is Admin, redirect to admin dashboard
    if (authenticated && user?.role === 'Admin') {
      router.replace(paths.dashboard.root);
      return;
    }
    if (authenticated && String(user?.role || '').toLowerCase() === 'corporate') {
      router.replace(paths.corporate.overview);
      return;
    }

    publicGuardReady = true;
    setReady(true);
  }, [authenticated, loading, user?.role, router]);

  // First bootstrap only. After ready, always keep children mounted — swapping to
  // SplashScreen unmounts /learning (AllCourses), which restarts loading locally.
  if (!ready) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
