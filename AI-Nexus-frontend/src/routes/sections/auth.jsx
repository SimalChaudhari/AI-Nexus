import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AuthCenteredLayout } from 'src/layouts/auth-centered';

import { SplashScreen } from 'src/components/loading-screen';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

/** **************************************
 * OAuth (SSO): start = redirect to IdP, callback = return from IdP
 *************************************** */
const OAuthStartPage = lazy(() => import('src/pages/auth/oauth/start'));
const OAuthCallbackPage = lazy(() => import('src/pages/auth/oauth/callback'));
const MembershipSalesforceCreatePage = lazy(() => import('src/pages/auth/membership/salesforce-create'));
const MembershipSalesforceBridgePage = lazy(() => import('src/pages/auth/membership/salesforce-bridge'));
const MembershipApplicationPage = lazy(() => import('src/pages/auth/membership/application'));
const StudentMembershipApplicationPage = lazy(() => import('src/pages/auth/membership/student-application'));
const AffiliateSignUpPage = lazy(() => import('src/pages/auth/affiliate/sign-up'));

const authMembershipCentered = {
  path: 'membership',
  element: (
    <AuthCenteredLayout showHeader={false}>
      <Outlet />
    </AuthCenteredLayout>
  ),
  children: [
    {
      path: 'salesforce-bridge',
      element: (
        <GuestGuard>
          <MembershipSalesforceBridgePage />
        </GuestGuard>
      ),
    },
  ],
};

const authMembershipApplication = {
  path: 'membership',
  element: <Outlet />,
  children: [
    {
      path: 'salesforce-create',
      element: (
        <GuestGuard>
          <MembershipSalesforceCreatePage />
        </GuestGuard>
      ),
    },
    {
      path: 'application',
      element: (
        <GuestGuard>
          <MembershipApplicationPage />
        </GuestGuard>
      ),
    },
    {
      path: 'student-application',
      element: (
        <GuestGuard>
          <StudentMembershipApplicationPage />
        </GuestGuard>
      ),
    },
  ],
};

const authAffiliate = {
  path: 'affiliate',
  element: <Outlet />,
  children: [
    {
      path: 'sign-up',
      element: (
        <GuestGuard>
          <AffiliateSignUpPage />
        </GuestGuard>
      ),
    },
  ],
};

const authOauth = {
  path: 'oauth',
  element: <Outlet />,
  children: [
    {
      path: 'start',
      element: (
        <GuestGuard>
          <OAuthStartPage />
        </GuestGuard>
      ),
    },
    {
      path: 'callback',
      element: (
        <GuestGuard>
          <OAuthCallbackPage />
        </GuestGuard>
      ),
    },
  ],
};

/** **************************************
 * Simple
 *************************************** */
const Simple = {
  SignInPage: lazy(() => import('src/pages/auth/simple/sign-in')),
  SignUpPage: lazy(() => import('src/pages/auth/simple/sign-up')),
  CorporateSignUpPage: lazy(() => import('src/pages/auth/simple/corporate-sign-up')),
  ForgotPasswordPage: lazy(() => import('src/pages/auth/simple/forgot-password')),
  ResetPasswordPage: lazy(() => import('src/pages/auth/simple/reset-password')),
  VerifyPage: lazy(() => import('src/pages/auth/simple/verify')),
  FeeWaiverHrVerifyPage: lazy(() => import('src/pages/auth/simple/fee-waiver-audit-hr-verify')),
  StudentAcademicVerifyPage: lazy(() => import('src/pages/auth/simple/student-academic-verify')),
};

const authSimple = {
  path: '',
  element: (
    <AuthCenteredLayout showHeader={false}>
      <Outlet />
    </AuthCenteredLayout>
  ),
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <Simple.SignInPage />
        </GuestGuard>
      ),
    },
    {
      path: 'sign-up',
      element: (
        <GuestGuard>
          <Simple.SignUpPage />
        </GuestGuard>
      ),
    },
    {
      path: 'corporate-sign-up',
      element: (
        <GuestGuard>
          <Simple.CorporateSignUpPage />
        </GuestGuard>
      ),
    },
    {
      path: 'forgot-password',
      element: (
        <GuestGuard>
          <Simple.ForgotPasswordPage />
        </GuestGuard>
      ),
    },
    {
      path: 'reset-password',
      element: (
        <GuestGuard>
          <Simple.ResetPasswordPage />
        </GuestGuard>
      ),
    },
    {
      path: 'verify',
      element: (
        <GuestGuard>
          <Simple.VerifyPage />
        </GuestGuard>
      ),
    },
    {
      path: 'fee-waiver-audit/hr-verify',
      element: <Simple.FeeWaiverHrVerifyPage />,
    },
    {
      path: 'student-verification/confirm',
      element: <Simple.StudentAcademicVerifyPage />,
    },
  ],
};

// ----------------------------------------------------------------------

export const authRoutes = [
  {
    path: 'auth',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    children: [
      authSimple,
      authOauth,
      authMembershipCentered,
      authMembershipApplication,
      authAffiliate,
    ],
  },
];
