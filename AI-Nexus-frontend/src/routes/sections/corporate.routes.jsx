import { lazy, Suspense } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { CorporateLayout } from 'src/layouts/corporate';
import { LoadingScreen } from 'src/components/loading-screen';

import { paths } from '../paths';

// ----------------------------------------------------------------------

const OverviewPage = lazy(() => import('src/pages/corporate/overview'));
const ProgressPage = lazy(() => import('src/pages/corporate/progress'));
const EnrolPage = lazy(() => import('src/pages/corporate/enrol'));
const ReportsPage = lazy(() => import('src/pages/corporate/reports'));

// ----------------------------------------------------------------------

function CorporateShell() {
  return (
    <CorporateLayout>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </CorporateLayout>
  );
}

export const corporateRoutes = [
  {
    path: 'corporate',
    element: <CorporateShell />,
    children: [
      { element: <Navigate to={paths.corporate.overview} replace />, index: true },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'enrol', element: <EnrolPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
];
