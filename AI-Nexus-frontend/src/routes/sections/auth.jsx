import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AuthSplitLayout } from 'src/layouts/auth-split';
import { AuthCenteredLayout } from 'src/layouts/auth-centered';

import { SplashScreen } from 'src/components/loading-screen';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

/** **************************************
 * Jwt
 *************************************** */
const Jwt = {
  SignInPage: lazy(() => import('src/pages/auth/jwt/sign-in')),
  SignUpPage: lazy(() => import('src/pages/auth/jwt/sign-up')),
  ForgotPasswordPage: lazy(() => import('src/pages/auth/jwt/forgot-password')),
  ResetPasswordPage: lazy(() => import('src/pages/auth/jwt/reset-password')),
};

const authJwt = {
  path: 'jwt',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <AuthSplitLayout section={{ title: 'Hi, Welcome back' }}>
            <Jwt.SignInPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'sign-up',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Jwt.SignUpPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'forgot-password',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Jwt.ForgotPasswordPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'reset-password',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Jwt.ResetPasswordPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
  ],
};

/** **************************************
 * Amplify
 *************************************** */
const Amplify = {
  SignInPage: lazy(() => import('src/pages/auth/amplify/sign-in')),
  SignUpPage: lazy(() => import('src/pages/auth/amplify/sign-up')),
  VerifyPage: lazy(() => import('src/pages/auth/amplify/verify')),
  UpdatePasswordPage: lazy(() => import('src/pages/auth/amplify/update-password')),
  ResetPasswordPage: lazy(() => import('src/pages/auth/amplify/reset-password')),
};

const authAmplify = {
  path: 'amplify',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <AuthSplitLayout section={{ title: 'Hi, Welcome back' }}>
            <Amplify.SignInPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'sign-up',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Amplify.SignUpPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'verify',
      element: (
        <AuthSplitLayout>
          <Amplify.VerifyPage />
        </AuthSplitLayout>
      ),
    },
    {
      path: 'reset-password',
      element: (
        <AuthSplitLayout>
          <Amplify.ResetPasswordPage />
        </AuthSplitLayout>
      ),
    },
    {
      path: 'update-password',
      element: (
        <AuthSplitLayout>
          <Amplify.UpdatePasswordPage />
        </AuthSplitLayout>
      ),
    },
  ],
};

/** **************************************
 * Firebase
 *************************************** */
const Firebase = {
  SignInPage: lazy(() => import('src/pages/auth/firebase/sign-in')),
  SignUpPage: lazy(() => import('src/pages/auth/firebase/sign-up')),
  VerifyPage: lazy(() => import('src/pages/auth/firebase/verify')),
  ResetPasswordPage: lazy(() => import('src/pages/auth/firebase/reset-password')),
};

const authFirebase = {
  path: 'firebase',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <AuthSplitLayout section={{ title: 'Hi, Welcome back' }}>
            <Firebase.SignInPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'sign-up',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Firebase.SignUpPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'verify',
      element: (
        <AuthSplitLayout>
          <Firebase.VerifyPage />
        </AuthSplitLayout>
      ),
    },
    {
      path: 'reset-password',
      element: (
        <AuthSplitLayout>
          <Firebase.ResetPasswordPage />
        </AuthSplitLayout>
      ),
    },
  ],
};

/** **************************************
 * Auth0
 *************************************** */
const Auth0 = {
  SignInPage: lazy(() => import('src/pages/auth/auth0/sign-in')),
  CallbackPage: lazy(() => import('src/pages/auth/auth0/callback')),
};

const authAuth0 = {
  path: 'auth0',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <AuthSplitLayout section={{ title: 'Hi, Welcome back' }}>
            <Auth0.SignInPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'callback',
      element: (
        <GuestGuard>
          <Auth0.CallbackPage />
        </GuestGuard>
      ),
    },
  ],
};

/** **************************************
 * Supabase
 *************************************** */
const Supabase = {
  SignInPage: lazy(() => import('src/pages/auth/supabase/sign-in')),
  SignUpPage: lazy(() => import('src/pages/auth/supabase/sign-up')),
  VerifyPage: lazy(() => import('src/pages/auth/supabase/verify')),
  UpdatePasswordPage: lazy(() => import('src/pages/auth/supabase/update-password')),
  ResetPasswordPage: lazy(() => import('src/pages/auth/supabase/reset-password')),
};

const authSupabase = {
  path: 'supabase',
  children: [
    {
      path: 'sign-in',
      element: (
        <GuestGuard>
          <AuthSplitLayout section={{ title: 'Hi, Welcome back' }}>
            <Supabase.SignInPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'sign-up',
      element: (
        <GuestGuard>
          <AuthSplitLayout>
            <Supabase.SignUpPage />
          </AuthSplitLayout>
        </GuestGuard>
      ),
    },
    {
      path: 'verify',
      element: (
        <AuthSplitLayout>
          <Supabase.VerifyPage />
        </AuthSplitLayout>
      ),
    },
    {
      path: 'reset-password',
      element: (
        <AuthSplitLayout>
          <Supabase.ResetPasswordPage />
        </AuthSplitLayout>
      ),
    },
    {
      path: 'update-password',
      element: (
        <AuthSplitLayout>
          <Supabase.UpdatePasswordPage />
        </AuthSplitLayout>
      ),
    },
  ],
};

/** **************************************
 * OAuth (SSO): start = redirect to IdP, callback = return from IdP
 *************************************** */
const OAuthStartPage = lazy(() => import('src/pages/auth/oauth/start'));
const OAuthCallbackPage = lazy(() => import('src/pages/auth/oauth/callback'));
const MembershipSalesforceCreatePage = lazy(() => import('src/pages/auth/membership/salesforce-create'));
const MembershipSalesforceBridgePage = lazy(() => import('src/pages/auth/membership/salesforce-bridge'));
const MembershipApplicationPage = lazy(() => import('src/pages/auth/membership/application'));
const StudentMembershipApplicationPage = lazy(() => import('src/pages/auth/membership/student-application'));

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
    children: [authSimple, authOauth, authMembershipCentered, authMembershipApplication],
  },
];
