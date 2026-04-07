import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { CONFIG } from 'src/config-global';
import { DashboardLayout } from 'src/layouts/dashboard';
import { MainLayout } from 'src/layouts/main';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';
import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

// User Profile & Account (for regular users - User role)
const UserProfilePage = lazy(() => import('src/pages/user/profile'));

// Common Profile Page (works for both User and Admin)
const CommonProfilePage = lazy(() => import('src/pages/profile'));

// Dashboard User Pages (legacy routes)
const UserProfileOwnPage = lazy(() => import('src/pages/dashboard/user/profile-own'));
const UserCardsPage = lazy(() => import('src/pages/dashboard/user/cards'));
const UserAccountPage = lazy(() => import('src/pages/dashboard/user/account'));

// ----------------------------------------------------------------------

// Layout wrapper component that uses DashboardLayout for Admin, MainLayout for User
function UserLayoutWrapper() {
  const { user } = useAuthContext();
  const userRole = String(user?.role || 'User').toLowerCase();
  const isAdmin = userRole === 'admin';

  if (isAdmin) {
    // Admin users get dashboard layout with admin navigation
    return (
      <DashboardLayout>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    );
  }

  // Regular users get main layout without admin navigation
  return (
    <MainLayout>
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </MainLayout>
  );
}

const layoutContent = <UserLayoutWrapper />;

// ----------------------------------------------------------------------

/**
 * User Routes - Accessible to all authenticated users (not just Admin)
 * These routes use AuthGuard only, not RoleBasedGuard, so any authenticated user can access them
 * Layout is role-based: Admin gets DashboardLayout, User gets MainLayout
 */
export const userRoutes = [
  // Common profile route: /profile (works for both User and Admin)
  {
    path: 'profile',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { element: <CommonProfilePage />, index: true },
    ],
  },
  // Root level user profile route: /user/profile (for regular users)
  {
    path: 'user',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      { path: 'profile', element: <UserProfilePage /> },
    ],
  },
  // Dashboard user routes: /dashboard/user/*
  {
    path: 'dashboard',
    element: CONFIG.auth.skip ? <>{layoutContent}</> : <AuthGuard>{layoutContent}</AuthGuard>,
    children: [
      {
        path: 'user',
        children: [
          { element: <UserProfileOwnPage />, index: true },
          { path: 'profile', element: <UserProfileOwnPage /> },
          { path: 'cards', element: <UserCardsPage /> },
          { path: 'account', element: <UserAccountPage /> },
        ],
      },
    ],
  },
];

