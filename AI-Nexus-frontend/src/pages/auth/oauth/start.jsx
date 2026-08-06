import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import axios from 'src/utils/axios';

import { getOAuthAuthUrl } from 'src/auth/context/jwt';
import {
  buildIdpLogoutThenAuthorizeUrl,
  isForceIdpLogin,
  clearForceIdpLogin,
} from 'src/auth/context/jwt/idp-browser-logout';
import { POST_OAUTH_RETURN_TO_KEY, setScaqSsoVerificationPending, SCAQ_SSO_VERIFICATION_PENDING_KEY, MEMBERSHIP_ELIGIBILITY_FLOW_KEY } from 'src/utils/membership-eligibility-sso';
import {
  MEMBERSHIP_APPLICATION_OUTCOME,
  STUDENT_MEMBERSHIP_APPLICATION_OUTCOME,
  STUDENT_MEMBER_LOGIN_OUTCOME,
  setMembershipApplicationPending,
  clearMembershipApplicationPending,
  setStudentMembershipApplicationPending,
  clearStudentMembershipApplicationPending,
  setStudentMemberLoginPending,
  clearStudentMemberLoginPending,
  saveMembershipApplicationCourseReturn,
} from 'src/utils/membership-salesforce-session';

// ----------------------------------------------------------------------

export default function OAuthStartPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Redirecting to SSO...');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const forceIdpLogin = isForceIdpLogin();
        if (forceIdpLogin) {
          setStatusText('Preparing secure sign-in…');
        }

        const params = new URLSearchParams(window.location.search);
        if (params.get('membershipOutcome') === 'scaq-sso-verify') {
          setScaqSsoVerificationPending();
        }
        const membershipOutcome = params.get('membershipOutcome') || '';
        const isRecognitionApplication =
          membershipOutcome === MEMBERSHIP_APPLICATION_OUTCOME
          || params.get('eligibilityType') === 'recognition'
          || params.get('eligibilityType') === 'experienced';
        const isStudentApplication =
          membershipOutcome === STUDENT_MEMBERSHIP_APPLICATION_OUTCOME
          || (params.get('eligibilityType') === 'student'
            && membershipOutcome !== STUDENT_MEMBER_LOGIN_OUTCOME);
        const isStudentMemberLogin = membershipOutcome === STUDENT_MEMBER_LOGIN_OUTCOME;
        const isDeferredMembershipApplication =
          isRecognitionApplication || isStudentApplication || isStudentMemberLogin;

        if (isStudentMemberLogin) {
          setStudentMemberLoginPending();
          clearStudentMembershipApplicationPending();
          clearMembershipApplicationPending();
        } else if (isStudentApplication) {
          clearStudentMemberLoginPending();
          setStudentMembershipApplicationPending();
          clearMembershipApplicationPending();
        } else if (isRecognitionApplication) {
          setMembershipApplicationPending();
          clearStudentMembershipApplicationPending();
          clearStudentMemberLoginPending();
        } else {
          clearMembershipApplicationPending();
          clearStudentMembershipApplicationPending();
          clearStudentMemberLoginPending();
          if (!params.get('membershipOutcome') && !params.get('eligibilityType')) {
            try {
              sessionStorage.removeItem(SCAQ_SSO_VERIFICATION_PENDING_KEY);
              sessionStorage.removeItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
            } catch {
              // ignore
            }
          }
        }

        if (isDeferredMembershipApplication) {
          const existingCourseReturn = sessionStorage.getItem(POST_OAUTH_RETURN_TO_KEY) || '';
          if (existingCourseReturn && !existingCourseReturn.includes('/salesforce-bridge')) {
            saveMembershipApplicationCourseReturn(existingCourseReturn);
          }
        }

        const returnTo = params.get('returnTo');
        if (returnTo) {
          try {
            sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, decodeURIComponent(returnTo));
          } catch {
            sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, returnTo);
          }
        }

        const decodedReturnTo = (() => {
          if (!returnTo) return '';
          try {
            return decodeURIComponent(returnTo);
          } catch {
            return returnTo;
          }
        })();
        const loginAsCorporate =
          params.get('loginAsCorporate') === '1'
          || params.get('loginAsCorporate') === 'true'
          || decodedReturnTo.includes('/corporate');

        const scaqVerify = params.get('membershipOutcome') === 'scaq-sso-verify';
        if (forceIdpLogin && !cancelled) {
          setStatusText('Preparing secure sign-in…');
        }
        const { authUrl } = await getOAuthAuthUrl({
          scaqVerify,
          deferredAuth: isDeferredMembershipApplication,
          loginAsCorporate,
        });
        if (cancelled) return;
        if (authUrl && (authUrl.startsWith('http://') || authUrl.startsWith('https://'))) {
          // After logout (localhost): clear Salesforce cookies then authorize (same tab, no popup).
          // Normal login goes straight to authorize — no extra step.
          let target = authUrl;
          if (forceIdpLogin) {
            try {
              const logoutRes = await axios.get('/auth/oauth/browser-logout-url', {
                skipAuthRefresh: true,
                skipApiLoading: true,
              });
              const chained = buildIdpLogoutThenAuthorizeUrl(
                logoutRes.data?.browserLogoutUrl,
                authUrl,
              );
              if (chained) target = chained;
            } catch {
              // Fall back to authorize URL.
            }
            clearForceIdpLogin();
          }
          window.location.replace(target);
          return;
        }
        setError('SSO is not configured or invalid. Please try sign in with email.');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to start SSO sign-in.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  if (loading && !error) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'background.default',
          zIndex: 9999,
          p: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {statusText}
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 480, mx: 'auto', mt: 8, p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button component={RouterLink} href={paths.auth.simple.signIn} variant="contained" size="medium">
          Back to sign in
        </Button>
      </Stack>
    );
  }

  return null;
}
