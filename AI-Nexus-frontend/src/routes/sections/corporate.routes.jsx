import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { CorporateLayout } from 'src/layouts/corporate';
import { LoadingScreen } from 'src/components/loading-screen';
import { AuthGuard, RoleBasedGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

import { paths } from '../paths';

// ----------------------------------------------------------------------

const OverviewPage = lazy(() => import('src/pages/corporate/overview'));
const ProgressPage = lazy(() => import('src/pages/corporate/progress'));
const LearnerDetailPage = lazy(() => import('src/pages/corporate/learner-detail'));
const EnrolPage = lazy(() => import('src/pages/corporate/enrol'));
const ReportsPage = lazy(() => import('src/pages/corporate/reports'));

// ----------------------------------------------------------------------

function CorporateLayoutContent() {
  const { user } = useAuthContext();
  const currentRole = user?.role || 'User';

  return (
    <CorporateLayout>
      <Suspense fallback={<LoadingScreen />}>
        <RoleBasedGuard
          currentRole={currentRole}
          acceptRoles={['Corporate', 'Admin']}
          hasContent
          redirectTo="/home"
        >
          <Outlet />
        </RoleBasedGuard>
      </Suspense>
    </CorporateLayout>
  );
}

function CorporateRoutesWrapper() {
  return CONFIG.auth.skip ? (
    <CorporateLayoutContent />
  ) : (
    <AuthGuard>
      <CorporateLayoutContent />
    </AuthGuard>
  );
}

export const corporateRoutes = [
  {
    path: 'corporate',
    element: <CorporateRoutesWrapper />,
    children: [
      { element: <Navigate to={paths.corporate.overview} replace />, index: true },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'progress/:userId', element: <LearnerDetailPage /> },
      { path: 'enrol', element: <EnrolPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
];
