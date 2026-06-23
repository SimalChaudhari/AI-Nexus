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
  clearAuthSession,
  establishPlatformSessionFromToken,
  exchangeOAuthCode,
  promoteSalesforceAssociateMember,
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
  allowsSsoLoginWithoutScaqCandidate,
  isSalesforceMemberAccountType,
  isScaqMembershipSsoFlow,
  POST_OAUTH_RETURN_TO_KEY,
  isIscaMemberSsoCheckPending,
  clearIscaMemberSsoCheckPending,
  ensureNoYesYesFlowAfterEservicesFailure,
  buildResumeMembershipSignupReturnUrl,
  stripResumeMembershipSignupFromPath,
} from 'src/utils/membership-eligibility-sso';
import {
  isRecognitionMembershipApplicationFlow,
  isStudentMembershipApplicationFlow,
  isStudentMemberLoginOAuthOutcome,
  persistMembershipSalesforceSession,
  clearMembershipApplicationPending,
  clearStudentMembershipApplicationPending,
  clearStudentMemberLoginPending,
  isStudentMemberLoginPending,
  readMembershipApplicationCourseReturn,
} from 'src/utils/membership-salesforce-session';
import {
  redirectCaMemberToPlatform,
  tryCompleteCaMemberPlatformLogin,
  fetchMembershipNexusUserInfo,
} from 'src/utils/membership-application-ca';
import { tryCompleteApprovedMemberPlatformLogin } from 'src/utils/membership-application-approved-member';
import {
  redirectStudentMemberToPlatform,
  tryCompleteStudentMemberPlatformLogin,
} from 'src/utils/membership-application-student';

// ----------------------------------------------------------------------

/** Recognition pathway: save Salesforce session; CA members sign in — others go to application form. */
async function finishRecognitionApplicationTab(router, searchParams, payload) {
  const fromQuery = readSalesforceFlagsFromCallbackParams(searchParams);
  const accountId = (payload?.accountId || fromQuery.accountId || '').trim();
  if (!accountId) return false;

  const socialToken = String(
    payload?.socialToken || searchParams.get('socialAccessToken') || ''
  ).trim();

  persistMembershipSalesforceSession({
    accountId,
    socialToken,
    memberClass: fromQuery.memberClass || undefined,
    pendingPlatformAccessToken: String(payload?.pendingPlatformAccessToken || '').trim() || undefined,
    ...(searchParams.get('firstName') ? { firstName: searchParams.get('firstName') } : {}),
    ...(searchParams.get('lastName') ? { lastName: searchParams.get('lastName') } : {}),
    ...(searchParams.get('email') ? { email: searchParams.get('email') } : {}),
  });

  if (socialToken) {
    try {
      const caLogin = await tryCompleteCaMemberPlatformLogin({
        socialAccessToken: socialToken,
        redirectTo: readMembershipApplicationCourseReturn() || paths.learning,
      });
      if (caLogin.loggedIn && caLogin.redirectTo) {
        redirectCaMemberToPlatform(caLogin.redirectTo);
        return true;
      }
    } catch {
      // continue to application form when verification fails
    }
  }

  router.replace(paths.auth.membership.application);
  return true;
}

/** After student application submit — verify Student member class and sign into platform. */
async function finishStudentMemberLoginTab(searchParams, payload) {
  const socialToken = String(
    payload?.socialToken || searchParams.get('socialAccessToken') || ''
  ).trim();
  if (!socialToken) {
    return {
      handled: true,
      error: 'eServices session is missing. Please try signing in again.',
    };
  }

  try {
    const studentLogin = await tryCompleteStudentMemberPlatformLogin({
      socialAccessToken: socialToken,
      platformAccessToken: String(payload?.pendingPlatformAccessToken || '').trim() || undefined,
      redirectTo: readMembershipApplicationCourseReturn() || paths.learning,
    });
    if (studentLogin.loggedIn && studentLogin.redirectTo) {
      redirectStudentMemberToPlatform(studentLogin.redirectTo);
      return { handled: true };
    }

    const sf = readSalesforceFlagsFromCallbackParams(searchParams);
    if (sf.accountId && socialToken) {
      persistMembershipSalesforceSession({
        accountId: sf.accountId,
        socialToken,
        memberClass: studentLogin.memberClass || sf.memberClass,
        pendingPlatformAccessToken: String(payload?.pendingPlatformAccessToken || '').trim() || undefined,
      });
    }

    return {
      handled: true,
      error:
        studentLogin.message
        || 'Student membership was not confirmed in eServices. Please try again after approval.',
    };
  } catch (err) {
    return {
      handled: true,
      error:
        err instanceof Error
          ? err.message
          : 'Student membership sign-in could not be completed. Please try again.',
    };
  }
}

/** Student membership pathway: save Salesforce session and open student application form. */
async function finishStudentApplicationTab(router, searchParams, payload) {
  const fromQuery = readSalesforceFlagsFromCallbackParams(searchParams);
  const accountId = (payload?.accountId || fromQuery.accountId || '').trim();
  if (!accountId) return false;

  const socialToken = String(
    payload?.socialToken || searchParams.get('socialAccessToken') || ''
  ).trim();

  persistMembershipSalesforceSession({
    accountId,
    socialToken,
    memberClass: fromQuery.memberClass || undefined,
    pendingPlatformAccessToken: String(payload?.pendingPlatformAccessToken || '').trim() || undefined,
  });

  clearStudentMembershipApplicationPending();
  router.replace(paths.auth.membership.studentApplication);
  return true;
}

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

/** Plain sign-in page SSO: only verified ISCA members (CA or approved Member) may log in. */
async function tryCompleteIscaMemberSsoLogin(options = {}) {
  const socialToken = String(options.socialToken || '').trim();
  const pendingPlatformAccessToken = String(options.pendingPlatformAccessToken || '').trim();
  const redirectTo =
    options.redirectTo
    || (options.searchParams ? resolvePostLoginPath(options.searchParams) : null)
    || paths.home;
  const searchParams = options.searchParams;

  if (searchParams && socialToken) {
    const sf = readSalesforceFlagsFromCallbackParams(searchParams);
    if (sf.accountId) {
      persistMembershipSalesforceSession({
        accountId: sf.accountId,
        socialToken,
        pendingPlatformAccessToken: pendingPlatformAccessToken || undefined,
        memberClass: sf.memberClass || undefined,
      });
    }
  }

  if (!socialToken) {
    return { loggedIn: false };
  }

  try {
    const caLogin = await tryCompleteCaMemberPlatformLogin({
      socialAccessToken: socialToken,
      redirectTo,
    });
    if (caLogin.loggedIn && caLogin.redirectTo) {
      redirectCaMemberToPlatform(caLogin.redirectTo);
      return { loggedIn: true, redirectTo: caLogin.redirectTo };
    }
  } catch {
    // try approved ISCA Member next
  }

  try {
    const memberLogin = await tryCompleteApprovedMemberPlatformLogin({
      socialAccessToken: socialToken,
      redirectTo,
    });
    if (memberLogin.loggedIn && memberLogin.redirectTo) {
      redirectCaMemberToPlatform(memberLogin.redirectTo);
      return { loggedIn: true, redirectTo: memberLogin.redirectTo };
    }
  } catch {
    // not a verified ISCA member
  }

  return { loggedIn: false };
}

function isPlainSignInSsoFlow(searchParams) {
  return (
    !isScaqMembershipSsoFlow(searchParams)
    && !isRecognitionMembershipApplicationFlow(searchParams)
    && !isStudentMembershipApplicationFlow(searchParams)
    && !isStudentMemberLoginOAuthOutcome(searchParams)
    && !isIscaMemberSsoCheckPending(searchParams)
  );
}

/** Ensure cookie session exists after SSO when backend returned a deferred token. */
async function ensureOAuthPlatformSession({
  searchParams,
  sf,
  pendingPlatformAccessToken,
  accessToken,
}) {
  if (!allowsSsoLoginWithoutScaqCandidate(sf?.isSCAQCandidate, sf?.accountType)) {
    return false;
  }

  const socialToken = String(searchParams.get('socialAccessToken') || '').trim();
  if (
    socialToken
    && isSalesforceMemberAccountType(sf?.accountType)
    && sf?.isSCAQCandidate !== true
  ) {
    try {
      const memberLogin = await tryCompleteApprovedMemberPlatformLogin({
        socialAccessToken: socialToken,
        redirectTo: resolvePostLoginPath(searchParams) || paths.home,
      });
      if (memberLogin.loggedIn) {
        return true;
      }
    } catch {
      // Fall through to deferred token session establishment.
    }
  }

  const platformToken = String(
    pendingPlatformAccessToken
    || accessToken
    || searchParams.get('pendingPlatformAccessToken')
    || ''
  ).trim();
  if (!platformToken) {
    return false;
  }

  return establishPlatformSessionFromToken(platformToken);
}

async function rejectScaqAndRedirectToPaidSignup(
  router,
  checkUserSession,
  profile = {},
  options = {},
) {
  const socialToken = String(
    options.socialToken || options.socialAccessToken || ''
  ).trim();

  if (socialToken && !options.skipStudentLoginAttempt) {
    try {
      const studentLogin = await tryCompleteStudentMemberPlatformLogin({
        socialAccessToken: socialToken,
        platformAccessToken: String(options.pendingPlatformAccessToken || '').trim() || undefined,
        redirectTo:
          (options.searchParams ? resolvePostLoginPath(options.searchParams) : null)
          || readMembershipApplicationCourseReturn()
          || paths.learning,
      });
      if (studentLogin.loggedIn && studentLogin.redirectTo) {
        redirectStudentMemberToPlatform(studentLogin.redirectTo);
        return;
      }
    } catch {
      // Not an approved student member — continue to paid signup.
    }
  }

  persistPaidSignupPrefillAfterScaqReject(profile);

  let returnTo = '';
  try {
    returnTo = sessionStorage.getItem(POST_OAUTH_RETURN_TO_KEY) || '';
  } catch {
    // ignore
  }

  // Callback rejection paths can be reached without an active app session.
  // Avoid backend logout noise ("session expired") and clear local state only.
  await clearAuthSession();
  await checkUserSession?.();
  clearMembershipEligibilitySessionStorage();

  const params = new URLSearchParams({ membershipOutcome: 'paid-signup' });
  if (returnTo) params.set('returnTo', returnTo);
  router.replace(`${paths.auth.simple.signUp}?${params.toString()}`);
}

/**
 * Non-SCAQ SSO: recognition/student application tabs, or paid signup.
 * Plain sign-in page SSO: only verified ISCA members log in; others → paid signup.
 * @returns {boolean} true when navigation was handled.
 */
async function handleNonScaqCandidateAfterSso(
  router,
  checkUserSession,
  searchParams,
  {
    isSCAQCandidate,
    accountType,
    recognitionApplicationFlow,
    studentApplicationFlow,
    profile = {},
    payload = {},
  }
) {
  if (!shouldScaqRejectToPaidSignup(isSCAQCandidate, accountType)) {
    return false;
  }

  if (studentApplicationFlow) {
    return await finishStudentApplicationTab(router, searchParams, payload);
  }

  if (recognitionApplicationFlow) {
    return await finishRecognitionApplicationTab(router, searchParams, payload);
  }

  if (isPlainSignInSsoFlow(searchParams)) {
    const iscaLogin = await tryCompleteIscaMemberSsoLogin({
      socialToken: payload?.socialToken,
      pendingPlatformAccessToken: payload?.pendingPlatformAccessToken,
      searchParams,
    });
    if (iscaLogin.loggedIn) {
      return true;
    }

    await rejectScaqAndRedirectToPaidSignup(router, checkUserSession, profile, {
      socialToken: payload?.socialToken,
      pendingPlatformAccessToken: payload?.pendingPlatformAccessToken,
      searchParams,
      skipStudentLoginAttempt: true,
    });
    return true;
  }

  await rejectScaqAndRedirectToPaidSignup(router, checkUserSession, profile, {
    socialToken: payload?.socialToken,
    pendingPlatformAccessToken: payload?.pendingPlatformAccessToken,
    searchParams,
  });
  return true;
}

function redirectToNoYesYesMembershipModal(router, redirectTo) {
  ensureNoYesYesFlowAfterEservicesFailure();
  clearIscaMemberSsoCheckPending();
  router.replace(buildResumeMembershipSignupReturnUrl(redirectTo));
}

async function handleIscaMemberSsoCheckAfterSso(
  router,
  searchParams,
  payload = {},
  checkUserSession
) {
  if (!isIscaMemberSsoCheckPending(searchParams)) return false;

  const socialToken = String(
    payload?.socialToken || searchParams.get('socialAccessToken') || ''
  ).trim();
  const pendingPlatformAccessToken = String(
    payload?.pendingPlatformAccessToken || searchParams.get('pendingPlatformAccessToken') || ''
  ).trim();

  const redirectTo = resolvePostLoginPath(searchParams) || paths.home;
  if (!socialToken) {
    redirectToNoYesYesMembershipModal(router, redirectTo);
    return true;
  }

  try {
    const nexusInfo = await fetchMembershipNexusUserInfo(socialToken);
    const fromNexusUser = nexusInfo?.nexusUser?.isSCAQCandidate;
    const fromTopLevel = nexusInfo?.isSCAQCandidate;
    const isScaqCandidate =
      typeof fromNexusUser === 'boolean'
        ? fromNexusUser
        : typeof fromTopLevel === 'boolean'
          ? fromTopLevel
          : readScaqFlagsFromOAuthCallback(searchParams).isSCAQCandidate;

    if (isScaqCandidate === true) {
      clearIscaMemberSsoCheckPending();
      clearMembershipEligibilitySessionStorage();

      const cleanRedirect = stripResumeMembershipSignupFromPath(redirectTo);
      const loginResult = await tryCompleteIscaMemberSsoLogin({
        socialToken,
        pendingPlatformAccessToken,
        redirectTo: cleanRedirect,
        searchParams,
      });
      if (loginResult.loggedIn) {
        return true;
      }

      await checkUserSession?.();
      router.replace(cleanRedirect);
      return true;
    }

    redirectToNoYesYesMembershipModal(router, redirectTo);
    return true;
  } catch {
    redirectToNoYesYesMembershipModal(router, redirectTo);
    return true;
  }
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
      const recognitionApplicationFlow = isRecognitionMembershipApplicationFlow(searchParams);
      const studentApplicationFlow = isStudentMembershipApplicationFlow(searchParams);
      const studentMemberLoginFlow = isStudentMemberLoginOAuthOutcome(searchParams);
      const scaqProfileOnly = searchParams.get('scaqProfileOnly') === 'true';

      try {
        if (scaqProfileOnly) {
          const sf = readSalesforceFlagsFromCallbackParams(searchParams);
          if (shouldScaqRejectToPaidSignup(sf.isSCAQCandidate, sf.accountType)) {
            await rejectScaqAndRedirectToPaidSignup(
              router,
              checkUserSession,
              {
                email: searchParams.get('email'),
                firstName: searchParams.get('firstName'),
                lastName: searchParams.get('lastName'),
                salesforce: sf,
              },
              {
                socialToken: searchParams.get('socialAccessToken') || '',
                pendingPlatformAccessToken: searchParams.get('pendingPlatformAccessToken') || '',
                searchParams,
              }
            );
            return;
          }
        }

        if (code) {
          const exchangeResult = await exchangeOAuthCode({
            code,
            state: searchParams.get('state') || undefined,
          });

          if (exchangeResult.scaqProfileOnly) {
            const sfProfile = exchangeResult.salesforce || {};
            if (
              shouldScaqRejectToPaidSignup(
                sfProfile.isSCAQCandidate,
                sfProfile.accountType
              )
            ) {
              await rejectScaqAndRedirectToPaidSignup(router, checkUserSession, {
                email: exchangeResult.email,
                firstName: exchangeResult.firstName,
                lastName: exchangeResult.lastName,
                salesforce: exchangeResult.salesforce,
              });
              return;
            }
          }

          if (exchangeResult.scaqProfileOnly) {
            setError('SSO sign-in could not be completed. Please try signing in again.');
            setLoading(false);
            return;
          }

          const { user } = exchangeResult;
          const sf = readSalesforceFlagsFromSessionUser(user);

          if (studentMemberLoginFlow) {
            const studentLoginResult = await finishStudentMemberLoginTab(searchParams, {
              socialToken: searchParams.get('socialAccessToken') || '',
              pendingPlatformAccessToken: exchangeResult.accessToken || '',
            });
            if (studentLoginResult.handled) {
              if (studentLoginResult.error) {
                setError(studentLoginResult.error);
                setLoading(false);
              }
              return;
            }
          }

          const handledIscaMemberCheck = await handleIscaMemberSsoCheckAfterSso(
            router,
            searchParams,
            {
              socialToken: searchParams.get('socialAccessToken') || '',
              pendingPlatformAccessToken: exchangeResult.accessToken || '',
            },
            checkUserSession
          );
          if (handledIscaMemberCheck) {
            return;
          }

          const handledNonScaq = await handleNonScaqCandidateAfterSso(
            router,
            checkUserSession,
            searchParams,
            {
              isSCAQCandidate: sf.isSCAQCandidate,
              accountType: sf.accountType,
              recognitionApplicationFlow,
              studentApplicationFlow,
              profile: {
                email: user?.email,
                firstName: user?.firstname,
                lastName: user?.lastname,
                username: user?.username,
                salesforce: user?.salesforce,
              },
              payload: {
                accountId: sf.accountId,
                socialToken: searchParams.get('socialAccessToken') || '',
                pendingPlatformAccessToken: exchangeResult.accessToken || '',
              },
            }
          );
          if (handledNonScaq) {
            return;
          }

          const decision = resolveScaqPostLoginDecision(
            sf.isSCAQCandidate,
            sf.isAssociateMember,
            searchParams,
            sf.accountType
          );

          if (scaqFlow) {
            mergeSalesforceFromExchangeUser(user);
          }

          await runScaqPromoteAssociateIfNeeded(decision, scaqFlow);
        } else if (success === 'true' || accessToken) {
          const pendingToken =
            searchParams.get('pendingPlatformAccessToken') || accessToken || '';

          const sf = readSalesforceFlagsFromCallbackParams(searchParams);

          if (studentMemberLoginFlow) {
            const studentLoginResult = await finishStudentMemberLoginTab(searchParams, {
              socialToken: searchParams.get('socialAccessToken') || '',
              pendingPlatformAccessToken: pendingToken,
            });
            if (studentLoginResult.handled) {
              if (studentLoginResult.error) {
                setError(studentLoginResult.error);
                setLoading(false);
              }
              return;
            }
          }

          const handledIscaMemberCheck = await handleIscaMemberSsoCheckAfterSso(
            router,
            searchParams,
            {
              socialToken: searchParams.get('socialAccessToken') || '',
              pendingPlatformAccessToken: pendingToken,
            },
            checkUserSession
          );
          if (handledIscaMemberCheck) {
            return;
          }

          const handledNonScaq = await handleNonScaqCandidateAfterSso(
            router,
            checkUserSession,
            searchParams,
            {
              isSCAQCandidate: sf.isSCAQCandidate,
              accountType: sf.accountType,
              recognitionApplicationFlow,
              studentApplicationFlow,
              profile: {
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
              },
              payload: {
                accountId: sf.accountId,
                socialToken: searchParams.get('socialAccessToken') || '',
                pendingPlatformAccessToken: pendingToken,
              },
            }
          );
          if (handledNonScaq) {
            return;
          }

          const decision = resolveScaqPostLoginDecision(
            sf.isSCAQCandidate,
            sf.isAssociateMember,
            searchParams,
            sf.accountType
          );

          if (scaqFlow) {
            mergeSalesforceFromOAuthCallbackSearchParams(searchParams);
          }

          await runScaqPromoteAssociateIfNeeded(decision, scaqFlow);
        } else {
          setError('Missing OAuth success flag or authorization code.');
          setLoading(false);
          return;
        }

        let sfBeforeSession = readSalesforceFlagsFromCallbackParams(searchParams);
        try {
          const cachedUserRaw = sessionStorage.getItem('user');
          if (cachedUserRaw) {
            sfBeforeSession = readSalesforceFlagsFromSessionUser(JSON.parse(cachedUserRaw));
          }
        } catch {
          // keep callback query flags
        }

        await ensureOAuthPlatformSession({
          searchParams,
          sf: sfBeforeSession,
          pendingPlatformAccessToken:
            searchParams.get('pendingPlatformAccessToken') || accessToken || '',
          accessToken,
        });

        await checkUserSession?.();

        if (isIscaMemberSsoCheckPending(searchParams)) {
          const handledIscaMemberCheck = await handleIscaMemberSsoCheckAfterSso(
            router,
            searchParams,
            {
              socialToken: searchParams.get('socialAccessToken') || '',
              pendingPlatformAccessToken:
                searchParams.get('pendingPlatformAccessToken') || accessToken || '',
            },
            checkUserSession
          );
          if (handledIscaMemberCheck) {
            return;
          }
        }

        let sfAfterLogin = readSalesforceFlagsFromCallbackParams(searchParams);
        const userStr = sessionStorage.getItem('user');
        let userRole = 'User';
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            userRole = (u?.role || 'User').toLowerCase();
            sfAfterLogin = readSalesforceFlagsFromSessionUser(u);
          } catch {
            // use default role if parse fails
          }
        }

        if (
          !isIscaMemberSsoCheckPending(searchParams)
          && shouldScaqRejectToPaidSignup(sfAfterLogin.isSCAQCandidate, sfAfterLogin.accountType)
          && !isPlainSignInSsoFlow(searchParams)
        ) {
          await rejectScaqAndRedirectToPaidSignup(
            router,
            checkUserSession,
            {
              email: searchParams.get('email'),
              firstName: searchParams.get('firstName'),
              lastName: searchParams.get('lastName'),
              salesforce: sfAfterLogin,
            },
            {
              socialToken: searchParams.get('socialAccessToken') || '',
              pendingPlatformAccessToken:
                searchParams.get('pendingPlatformAccessToken') || accessToken || '',
              searchParams,
            }
          );
          return;
        }

        const nextPath = resolvePostLoginPath(searchParams);

        clearMembershipApplicationPending();
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
          if (shouldScaqRejectToPaidSignup(sfOnError.isSCAQCandidate, sfOnError.accountType)) {
            await rejectScaqAndRedirectToPaidSignup(
              router,
              checkUserSession,
              {
                email: searchParams.get('email'),
                firstName: searchParams.get('firstName'),
                lastName: searchParams.get('lastName'),
                salesforce: sfOnError,
              },
              {
                socialToken: searchParams.get('socialAccessToken') || '',
                pendingPlatformAccessToken: searchParams.get('pendingPlatformAccessToken') || '',
                searchParams,
              }
            );
            return;
          }
          // On callback error, do local cleanup only; backend logout may already be expired.
          await clearAuthSession();
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
    const studentLoginPending = isStudentMemberLoginPending();
    return (
      <Stack spacing={2} sx={{ maxWidth: 520, mx: 'auto', mt: 8, p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {studentLoginPending && (
            <Button
              component={RouterLink}
              href={paths.auth.membership.studentApplication}
              variant="contained"
              size="medium"
            >
              Back to student application
            </Button>
          )}
          <Button
            component={RouterLink}
            href={paths.auth.simple.signIn}
            variant={studentLoginPending ? 'outlined' : 'contained'}
            size="medium"
          >
            Go to sign in page
          </Button>
        </Stack>
      </Stack>
    );
  }

  return null;
}
