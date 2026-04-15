import { lazy, Suspense } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';

import { SplashScreen } from 'src/components/loading-screen';

import { authRoutes } from './auth';
import { authDemoRoutes } from './auth-demo';
import { dashboardRoutes } from './dashboard';
import { adminRoutes } from './admin.routes';
import { userRoutes } from './user.routes';
import { mainRoutes } from './main';

// import { componentsRoutes } from './components';

// ----------------------------------------------------------------------

const FlowiseBridgePage = lazy(() => import('src/pages/flowise-bridge'));

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

    // Auth
    ...authRoutes,
    ...authDemoRoutes,

    // Admin Routes (Admin only)
    ...adminRoutes,

    // User Routes
    ...userRoutes,

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
