import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getOAuthAuthUrl } from 'src/auth/context/jwt';
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

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
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

        const scaqVerify = params.get('membershipOutcome') === 'scaq-sso-verify';
        const { authUrl } = await getOAuthAuthUrl({ scaqVerify, deferredAuth: isDeferredMembershipApplication });
        if (cancelled) return;
        if (authUrl && (authUrl.startsWith('http://') || authUrl.startsWith('https://'))) {
          window.location.href = authUrl;
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
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh', p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Redirecting to SSO...
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
