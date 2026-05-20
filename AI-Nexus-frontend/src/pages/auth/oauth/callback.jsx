import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useAuthContext } from 'src/auth/hooks';
import {
  setSession,
  jwtDecode,
  exchangeOAuthCode,
  promoteSalesforceAssociateMember,
  signOut,
} from 'src/auth/context/jwt';
import {
  mergeSalesforceFromExchangeUser,
  mergeSalesforceFromOAuthCallbackSearchParams,
  mergeSalesforceFlagsIntoSessionUser,
  mergeSalesforceIntoMembershipEligibilityDraft,
  clearMembershipEligibilitySessionStorage,
  persistPaidSignupPrefillAfterScaqReject,
  resolveScaqPostLoginDecision,
  readSalesforceFlagsFromCallbackParams,
  readSalesforceFlagsFromSessionUser,
  readScaqFlagsFromOAuthCallback,
  shouldScaqRejectToPaidSignup,
  isScaqMembershipSsoFlow,
  POST_OAUTH_RETURN_TO_KEY,
} from 'src/utils/membership-eligibility-sso';

// ----------------------------------------------------------------------

function resolvePostLoginPath(searchParams) {
  const fromQuery = searchParams.get('returnTo');
  if (fromQuery) {
    try {
      return decodeURIComponent(fromQuery);
    } catch {
      return fromQuery;
    }
  }
  try {
    const stored = sessionStorage.getItem(POST_OAUTH_RETURN_TO_KEY);
    if (stored) {
      sessionStorage.removeItem(POST_OAUTH_RETURN_TO_KEY);
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

async function rejectScaqAndRedirectToPaidSignup(router, checkUserSession, profile = {}) {
  persistPaidSignupPrefillAfterScaqReject(profile);

  let returnTo = '';
  try {
    returnTo = sessionStorage.getItem(POST_OAUTH_RETURN_TO_KEY) || '';
  } catch {
    // ignore
  }

  try {
    await signOut();
  } catch {
    setSession(null);
    try {
      sessionStorage.removeItem('user');
    } catch {
      // ignore
    }
  }
  await checkUserSession?.();
  clearMembershipEligibilitySessionStorage();

  const params = new URLSearchParams({ membershipOutcome: 'paid-signup' });
  if (returnTo) params.set('returnTo', returnTo);
  router.replace(`${paths.auth.simple.signUp}?${params.toString()}`);
}

async function runScaqPromoteAssociateIfNeeded(decision, scaqFlow) {
  if (decision !== 'promote-associate') return;

  const promoteResult = await promoteSalesforceAssociateMember();
  const sf = promoteResult?.salesforce;

  if (sf?.isAssociateMember !== true) {
    throw new Error(
      'Associate member status was not confirmed in Salesforce after member class update.'
    );
  }

  if (scaqFlow && sf) {
    mergeSalesforceFlagsIntoSessionUser(sf);
    mergeSalesforceIntoMembershipEligibilityDraft({
      isSCAQCandidate: sf.isSCAQCandidate,
      isAssociateMember: sf.isAssociateMember,
      accountId: sf.accountId,
      accountType: sf.accountType,
      memberClass: sf.memberClass,
    });
  }
}

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const { checkUserSession } = useAuthContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const success = searchParams.get('success');
      const code = searchParams.get('code');
      const accessToken = searchParams.get('accessToken');
      const errorParam = searchParams.get('error');

      if (errorParam || success === 'false') {
        setError(searchParams.get('error') || 'SSO sign-in failed. Please try again.');
        setLoading(false);
        return;
      }

      const scaqFlow = isScaqMembershipSsoFlow(searchParams);
      const scaqProfileOnly = searchParams.get('scaqProfileOnly') === 'true';

      try {
        if (scaqProfileOnly) {
          const sf = readSalesforceFlagsFromCallbackParams(searchParams);
          await rejectScaqAndRedirectToPaidSignup(router, checkUserSession, {
            email: searchParams.get('email'),
            firstName: searchParams.get('firstName'),
            lastName: searchParams.get('lastName'),
            salesforce: {
              isSCAQCandidate: sf.isSCAQCandidate,
              isAssociateMember: sf.isAssociateMember,
              accountId: sf.accountId,
              accountType: sf.accountType,
              memberClass: sf.memberClass,
            },
          });
          return;
        }

        if (code) {
          const exchangeResult = await exchangeOAuthCode({
            code,
            state: searchParams.get('state') || undefined,
          });

          if (exchangeResult.scaqProfileOnly) {
            await rejectScaqAndRedirectToPaidSignup(router, checkUserSession, {
              email: exchangeResult.email,
              firstName: exchangeResult.firstName,
              lastName: exchangeResult.lastName,
              salesforce: exchangeResult.salesforce,
            });
            return;
          }

          const { user } = exchangeResult;
          const sf = readSalesforceFlagsFromSessionUser(user);
          const decision = resolveScaqPostLoginDecision(
            sf.isSCAQCandidate,
            sf.isAssociateMember,
            searchParams
          );

          if (decision === 'reject-paid-signup') {
            await rejectScaqAndRedirectToPaidSignup(router, checkUserSession, {
              email: user?.email,
              firstName: user?.firstname,
              lastName: user?.lastname,
              username: user?.username,
              salesforce: user?.salesforce,
            });
            return;
          }

          if (scaqFlow) {
            mergeSalesforceFromExchangeUser(user);
          }

          await runScaqPromoteAssociateIfNeeded(decision, scaqFlow);
        } else if (accessToken) {
          const sf = readSalesforceFlagsFromCallbackParams(searchParams);
          const decision = resolveScaqPostLoginDecision(
            sf.isSCAQCandidate,
            sf.isAssociateMember,
            searchParams
          );

          if (decision === 'reject-paid-signup') {
            await rejectScaqAndRedirectToPaidSignup(router, checkUserSession, {
              email: searchParams.get('email'),
              firstName: searchParams.get('firstName'),
              lastName: searchParams.get('lastName'),
              salesforce: {
                isSCAQCandidate: sf.isSCAQCandidate,
                isAssociateMember: sf.isAssociateMember,
                accountId: sf.accountId,
                accountType: sf.accountType,
                memberClass: sf.memberClass,
              },
            });
            return;
          }

          setSession(accessToken);
          const userId = searchParams.get('userId');
          const email = searchParams.get('email');
          const firstName = searchParams.get('firstName');
          const lastName = searchParams.get('lastName');
          let role = 'User';
          try {
            const decoded = jwtDecode(accessToken);
            const { role: decodedRole } = decoded || {};
            if (decodedRole) role = decodedRole;
          } catch {
            // use default role if decode fails
          }
          sessionStorage.setItem(
            'user',
            JSON.stringify({
              id: userId,
              email,
              firstname: firstName,
              lastname: lastName,
              role,
              salesforce: {
                isSCAQCandidate: sf.isSCAQCandidate,
                isAssociateMember: sf.isAssociateMember,
                accountId: sf.accountId,
                accountType: sf.accountType,
                memberClass: sf.memberClass,
              },
            })
          );

          if (scaqFlow) {
            mergeSalesforceFromOAuthCallbackSearchParams(searchParams);
          }

          await runScaqPromoteAssociateIfNeeded(decision, scaqFlow);
        } else {
          setError('Missing access token or code.');
          setLoading(false);
          return;
        }

        await checkUserSession?.();
        const userStr = sessionStorage.getItem('user');
        let userRole = 'User';
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            userRole = (u?.role || 'User').toLowerCase();
          } catch {
            // use default role if parse fails
          }
        }

        const nextPath = resolvePostLoginPath(searchParams);

        clearMembershipEligibilitySessionStorage();

        if (userRole === 'admin') {
          router.replace(`${paths.admin.root}/dashboard`);
        } else if (nextPath) {
          router.replace(nextPath);
        } else {
          router.replace('/home');
        }
      } catch (err) {
        const scaqFlowOnError = isScaqMembershipSsoFlow(searchParams);
        if (scaqFlowOnError) {
          const sfOnError = readScaqFlagsFromOAuthCallback(searchParams);
          if (shouldScaqRejectToPaidSignup(sfOnError.isSCAQCandidate)) {
            await rejectScaqAndRedirectToPaidSignup(router, checkUserSession, {
              email: searchParams.get('email'),
              firstName: searchParams.get('firstName'),
              lastName: searchParams.get('lastName'),
              salesforce: sfOnError,
            });
            return;
          }
          try {
            await signOut();
          } catch {
            setSession(null);
            try {
              sessionStorage.removeItem('user');
            } catch {
              // ignore
            }
          }
          await checkUserSession?.();
          setError(
            err instanceof Error
              ? err.message
              : 'SCAQ verification could not be completed. Please try again or contact support.'
          );
          setLoading(false);
          return;
        }
        setError(err instanceof Error ? err.message : 'SSO sign-in failed.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [searchParams, router, checkUserSession]);

  if (loading && !error) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ minHeight: '60vh', p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Completing sign-in...
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
