import { lazy, Suspense } from 'react';
import { Navigate, useLocation, useRoutes } from 'react-router-dom';

import { SplashScreen } from 'src/components/loading-screen';

import { authRoutes } from './auth';
import { dashboardRoutes } from './dashboard';
import { adminRoutes } from './admin.routes';
import { userRoutes } from './user.routes';
import { corporateRoutes } from './corporate.routes';
import { mainRoutes } from './main';

// import { componentsRoutes } from './components';

// ----------------------------------------------------------------------

const FlowiseBridgePage = lazy(() => import('src/pages/flowise-bridge'));
const AffiliateDashboardPage = lazy(() => import('src/pages/affiliate/dashboard'));

/** Legacy/short referral link (?ref=CODE) -> main sign-up form, preserving the query string. */
function SignupRedirect() {
  const location = useLocation();
  return <Navigate to={`/auth/sign-up${location.search}`} replace />;
}

export function Router() {
  return useRoutes([
    {
      path: '/',
      element: <Navigate to="/home" replace />,
    },
    {
      path: '/flowise-bridge',
      element: (
        <Suspense fallback={<SplashScreen />}>
          <FlowiseBridgePage />
        </Suspense>
      ),
    },
    {
      path: '/signup',
      element: <SignupRedirect />,
    },
    {
      path: '/affiliate/dashboard',
      element: (
        <Suspense fallback={<SplashScreen />}>
          <AffiliateDashboardPage />
        </Suspense>
      ),
    },

    // Auth
    ...authRoutes,

    // Admin Routes (Admin only)
    ...adminRoutes,

    // User Routes
    ...userRoutes,

    // Corporate HR Portal (auth/SSO to be wired later)
    ...corporateRoutes,

    // Dashboard (Legacy - can be removed if not needed)
    ...dashboardRoutes,

    // Main
    ...mainRoutes,

    // Components
    // ...componentsRoutes,

    // No match
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}
