import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import {
  persistMembershipSalesforceSession,
  notifyMembershipSalesforceSessionReady,
  isRecognitionMembershipApplicationFlow,
  isStudentMembershipApplicationFlow,
  clearStudentMembershipApplicationPending,
} from 'src/utils/membership-salesforce-session';
import { clearMembershipApplicationDraftOnSsoReturn } from 'src/utils/membership-salesforce-auth';
import {
  redirectCaMemberToPlatform,
  tryCompleteCaMemberPlatformLogin,
} from 'src/utils/membership-application-ca';
import { readSalesforceFlagsFromCallbackParams } from 'src/utils/membership-eligibility-sso';

// ----------------------------------------------------------------------

/**
 * Receives OAuth redirect (returnTo target), stores Salesforce accountId + social token,
 * then notifies the opener tab and closes.
 */
export default function MembershipSalesforceBridgePage() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Saving your Salesforce session…');

  useEffect(() => {
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');

    if (errorParam || success === 'false') {
      setMessage(searchParams.get('error') || 'Salesforce sign-in failed. Go back and try again.');
      return;
    }

    const accountId = (searchParams.get('salesforceAccountId') || '').trim();
    const socialToken = (searchParams.get('socialAccessToken') || '').trim();
    const pendingPlatformAccessToken = (
      searchParams.get('pendingPlatformAccessToken')
      || searchParams.get('accessToken')
      || ''
    ).trim();
    const callbackSf = readSalesforceFlagsFromCallbackParams(searchParams);
    const isRecognitionApplication = isRecognitionMembershipApplicationFlow(searchParams);
    const isStudentApplication = isStudentMembershipApplicationFlow(searchParams);

    if (!accountId) {
      setMessage('Salesforce account ID was not returned. Go back and try signing in again.');
      return;
    }

    persistMembershipSalesforceSession({
      accountId,
      socialToken,
      ...(callbackSf.memberClass ? { memberClass: callbackSf.memberClass } : {}),
      ...(isRecognitionApplication && pendingPlatformAccessToken
        ? { pendingPlatformAccessToken }
        : {}),
    });

    clearMembershipApplicationDraftOnSsoReturn();

    if (isStudentApplication) {
      setMessage('Salesforce account linked. Opening student membership application…');
      clearStudentMembershipApplicationPending();
      router.replace(paths.auth.membership.studentApplication);
      return undefined;
    }

    if (isRecognitionApplication) {
      setMessage('Checking your ISCA membership status…');

      const runRecognition = async () => {
        try {
          const caLogin = await tryCompleteCaMemberPlatformLogin({ socialAccessToken: socialToken });
          if (caLogin.loggedIn && caLogin.redirectTo) {
            redirectCaMemberToPlatform(caLogin.redirectTo);
            return;
          }
        } catch {
          // fall through to application form
        }
        setMessage('Salesforce account linked. Opening membership application…');
        router.replace(paths.auth.membership.application);
      };

      runRecognition();
      return undefined;
    }

    notifyMembershipSalesforceSessionReady();
    setMessage('Salesforce account linked. Returning to your course…');
    const returnTo = (searchParams.get('returnTo') || '').trim();
    const timer = window.setTimeout(() => {
      if (window.opener && !window.opener.closed) {
        window.close();
        return;
      }
      if (returnTo && returnTo.startsWith('/')) {
        router.replace(returnTo);
      } else {
        router.back();
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [searchParams, router]);

  return (
    <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight: '60vh', p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Salesforce membership
      </Typography>
      <Alert severity={searchParams.get('error') || searchParams.get('success') === 'false' ? 'error' : 'success'} sx={{ maxWidth: 480 }}>
        {message}
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, textAlign: 'center' }}>
        If you are not redirected automatically, use your browser back button or return to your course page.
      </Typography>
    </Stack>
  );
}
