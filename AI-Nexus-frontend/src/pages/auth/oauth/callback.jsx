import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { useAuthContext } from 'src/auth/hooks';
import {
  clearAuthSession,
  establishPlatformSessionFromToken,
  exchangeOAuthCode,
  promoteSalesforceAssociateMember,
} from 'src/auth/context/jwt';
import { fetchCurrentUser } from 'src/auth/context/jwt/session';
import { endEservicesSessionAfterBlockedLogin } from 'src/auth/context/jwt/idp-browser-logout';
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
  allowsImmediatePlatformSessionAfterSso,
  isSalesforceMemberAccountType,
  isScaqMembershipSsoFlow,
  POST_OAUTH_RETURN_TO_KEY,
  isIscaMemberSsoCheckPending,
  clearIscaMemberSsoCheckPending,
  ensureNoYesYesFlowAfterEservicesFailure,
  buildResumeMembershipSignupReturnUrl,
  stripResumeMembershipSignupFromPath,
  ensureCitizenshipGapFlowAfterEservicesFailure,
  redirectToCitizenshipGapMembershipModal,
} from 'src/utils/membership-eligibility-sso';
import { shouldShowCitizenshipRecordGapScreen } from 'src/utils/nexus-citizenship-eligibility';
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
  tryCompleteNricNumberPlatformLogin,
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

/** Plain sign-in / ISCA check: CA, approved Member, and optionally NRIC platform login. */
async function tryCompleteIscaMemberSsoLogin(options = {}) {
  const socialToken = String(options.socialToken || '').trim();
  const pendingPlatformAccessToken = String(options.pendingPlatformAccessToken || '').trim();
  const skipNricLogin = options.skipNricLogin === true;
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
    // not a verified ISCA member — try NRIC_Number next (unless skipped)
  }

  if (!skipNricLogin) {
    try {
      const nricLogin = await tryCompleteNricNumberPlatformLogin({
        socialAccessToken: socialToken,
        redirectTo,
        pendingPlatformAccessToken,
      });
      if (nricLogin.loggedIn && nricLogin.redirectTo) {
        redirectCaMemberToPlatform(nricLogin.redirectTo);
        return { loggedIn: true, redirectTo: nricLogin.redirectTo };
      }
    } catch {
      // NRIC_Number not present or login failed
    }
  }

  return { loggedIn: false };
}

/**
 * Keep an already-valid platform session (cookies from non-deferred SSO) instead of
 * wiping it via the Non-member paid-signup reject path.
 */
async function tryKeepExistingPlatformSessionAfterSso(searchParams, pendingPlatformAccessToken = '') {
  const redirectTo = resolvePostLoginPath(searchParams) || paths.home;
  const pending = String(
    pendingPlatformAccessToken
    || searchParams?.get?.('pendingPlatformAccessToken')
    || searchParams?.get?.('accessToken')
    || ''
  ).trim();

  // Prefer establish-session from JWT in the callback URL — more reliable than
  // relying on Set-Cookie from the backend OAuth redirect across origins.
  if (pending) {
    const established = await establishPlatformSessionFromToken(pending);
    if (established) {
      redirectCaMemberToPlatform(redirectTo);
      return true;
    }
  }

  try {
    const existing = await fetchCurrentUser();
    if (existing) {
      redirectCaMemberToPlatform(redirectTo);
      return true;
    }
  } catch {
    // no cookie session yet
  }

  return false;
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

function resolveOAuthSocialToken(searchParams, exchangeResult, fallback = '') {
  return String(
    fallback
    || exchangeResult?.socialAccessToken
    || searchParams?.get('socialAccessToken')
    || ''
  ).trim();
}

/** Ensure cookie session exists after SSO when backend returned a deferred token. */
async function ensureOAuthPlatformSession({
  searchParams,
  sf,
  pendingPlatformAccessToken,
  accessToken,
}) {
  if (!allowsImmediatePlatformSessionAfterSso(sf?.accountType)) {
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

/** Revoke eServices + local session when SSO user cannot sign in to the platform. */
async function endBlockedNonMemberSsoSession(socialToken, checkUserSession) {
  await endEservicesSessionAfterBlockedLogin(socialToken);
  await checkUserSession?.();
}

/**
 * Non-member without Blue/Pink NRIC on file must not receive platform login
 * (including when isSCAQCandidate is true).
 * @returns {boolean} true when navigation was handled.
 */
async function redirectCitizenshipGapForNonEligibleLogin(
  router,
  checkUserSession,
  searchParams,
  socialToken = ''
) {
  const token = String(socialToken || searchParams?.get('socialAccessToken') || '').trim();
  if (!token) return false;

  try {
    const nexusData = await fetchMembershipNexusUserInfo(token);
    const nexusInfo = nexusData?.nexusUser || nexusData;

    if (nexusData?.isApprovedMember === true || nexusData?.isCaMember === true) {
      return false;
    }

    if (!shouldShowCitizenshipRecordGapScreen(nexusInfo)) {
      return false;
    }

    ensureCitizenshipGapFlowAfterEservicesFailure({}, nexusInfo, { socialToken: token });
    // Org Portal SSO stores returnTo=/corporate — eligibility modal must open on /home.
    redirectToCitizenshipGapMembershipModal(router, paths.home);
    return true;
  } catch {
    return false;
  }
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

  if (socialToken) {
    try {
      const nexusData = await fetchMembershipNexusUserInfo(socialToken);
      const nexusInfo = nexusData?.nexusUser || nexusData;
      if (shouldShowCitizenshipRecordGapScreen(nexusInfo)) {
        ensureCitizenshipGapFlowAfterEservicesFailure({}, nexusInfo, { socialToken });
        // Never use Org Portal /corporate returnTo — AuthGuard sends users to sign-in.
        redirectToCitizenshipGapMembershipModal(router, paths.home);
        return;
      }
    } catch {
      // Continue to paid signup when nexus info cannot be loaded.
    }
  }

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
  await endBlockedNonMemberSsoSession(socialToken, checkUserSession);
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
    if (isPlainSignInSsoFlow(searchParams)) {
      const socialToken = payload?.socialToken;
      if (
        await redirectCitizenshipGapForNonEligibleLogin(
          router,
          checkUserSession,
          searchParams,
          socialToken
        )
      ) {
        return true;
      }

      if (
        await tryKeepExistingPlatformSessionAfterSso(
          searchParams,
          payload?.pendingPlatformAccessToken
        )
      ) {
        return true;
      }

      const loginResult = await tryCompleteIscaMemberSsoLogin({
        socialToken: payload?.socialToken,
        pendingPlatformAccessToken: payload?.pendingPlatformAccessToken,
        searchParams,
      });
      if (loginResult.loggedIn) {
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
    return false;
  }

  if (studentApplicationFlow) {
    return await finishStudentApplicationTab(router, searchParams, payload);
  }

  if (recognitionApplicationFlow) {
    return await finishRecognitionApplicationTab(router, searchParams, payload);
  }

  if (isPlainSignInSsoFlow(searchParams)) {
    // Same as "Log in via my ISCA account": Non members → eligibility / paid-signup.
    // Only CA or approved Member may enter the app. Skip NRIC auto-login and do not
    // keep a deferred platform session (that would skip eligibility).
    const iscaLogin = await tryCompleteIscaMemberSsoLogin({
      socialToken: payload?.socialToken,
      pendingPlatformAccessToken: payload?.pendingPlatformAccessToken,
      searchParams,
      skipNricLogin: true,
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

  const memberOrNricLogin = await tryCompleteIscaMemberSsoLogin({
    socialToken: payload?.socialToken,
    pendingPlatformAccessToken: payload?.pendingPlatformAccessToken,
    searchParams,
  });
  if (memberOrNricLogin.loggedIn) {
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

      const resolvedNexusInfo = nexusInfo?.nexusUser || nexusInfo;
      if (shouldShowCitizenshipRecordGapScreen(resolvedNexusInfo)) {
        ensureCitizenshipGapFlowAfterEservicesFailure({}, resolvedNexusInfo, { socialToken });
        redirectToCitizenshipGapMembershipModal(router, redirectTo);
        return true;
      }

      const cleanRedirect = stripResumeMembershipSignupFromPath(redirectTo);
      const loginResult = await tryCompleteIscaMemberSsoLogin({
        socialToken,
        pendingPlatformAccessToken,
        redirectTo: cleanRedirect,
        searchParams,
      });
      if (loginResult.loggedIn) {
        clearMembershipEligibilitySessionStorage();
        return true;
      }

      await rejectScaqAndRedirectToPaidSignup(
        router,
        checkUserSession,
        {
          email: searchParams.get('email'),
          firstName: searchParams.get('firstName'),
          lastName: searchParams.get('lastName'),
        },
        {
          socialToken,
          pendingPlatformAccessToken,
          searchParams,
          skipStudentLoginAttempt: true,
        }
      );
      return true;
    }

    const resolvedNexusInfo = nexusInfo?.nexusUser || nexusInfo;
    if (shouldShowCitizenshipRecordGapScreen(resolvedNexusInfo)) {
      ensureCitizenshipGapFlowAfterEservicesFailure({}, resolvedNexusInfo, { socialToken });
      redirectToCitizenshipGapMembershipModal(router, redirectTo);
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
  const theme = useTheme();
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const { checkUserSession } = useAuthContext();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let lockStorageKey = '';

    const run = async () => {
      // React Strict Mode remounts effects once in dev — a second run was logging the user
      // in then immediately calling end-eservices-session (looks like automatic logout).
      const callbackLockKey = [
        searchParams.get('code'),
        searchParams.get('pendingPlatformAccessToken'),
        searchParams.get('accessToken'),
        searchParams.get('success'),
        searchParams.get('socialAccessToken'),
        searchParams.get('error'),
      ]
        .filter(Boolean)
        .join('|') || searchParams.toString();

      if (callbackLockKey) {
        try {
          lockStorageKey = `oauthCallbackLock:${callbackLockKey.slice(0, 180)}`;
          if (sessionStorage.getItem(lockStorageKey) === '1') {
            return;
          }
          sessionStorage.setItem(lockStorageKey, '1');
        } catch {
          // private mode — continue once
        }
      }

      const success = searchParams.get('success');
      const code = searchParams.get('code');
      const accessToken = searchParams.get('accessToken');
      const errorParam = searchParams.get('error');

      if (errorParam || success === 'false') {
        const rawError = String(searchParams.get('error') || errorParam || '').trim();
        const lower = rawError.toLowerCase();
        let friendly = rawError || 'SSO sign-in failed. Please try again.';
        if (lower.includes('oauth_app_access_denied') || lower.includes('not admin approved')) {
          friendly =
            'Salesforce denied access to this app (OAUTH_APP_ACCESS_DENIED). Your user is not approved for the AI-Nexus Connected App. Ask a Salesforce admin to allow your profile/permission set on the Connected App, then try Sign in with SSO again.';
        }
        if (lockStorageKey) {
          try {
            sessionStorage.removeItem(lockStorageKey);
          } catch {
            // ignore
          }
        }
        setError(friendly);
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
          const socialTokenFromExchange = String(
            exchangeResult.socialAccessToken
            || searchParams.get('socialAccessToken')
            || user?.socialAccessToken
            || ''
          ).trim();

          if (
            await redirectCitizenshipGapForNonEligibleLogin(
              router,
              checkUserSession,
              searchParams,
              socialTokenFromExchange
            )
          ) {
            return;
          }

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
                socialToken: resolveOAuthSocialToken(searchParams, exchangeResult),
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

          const socialTokenFromCallback = String(searchParams.get('socialAccessToken') || '').trim();
          if (
            await redirectCitizenshipGapForNonEligibleLogin(
              router,
              checkUserSession,
              searchParams,
              socialTokenFromCallback
            )
          ) {
            return;
          }

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

        if (!isIscaMemberSsoCheckPending(searchParams)) {
          const socialToken = searchParams.get('socialAccessToken') || '';
          if (
            await redirectCitizenshipGapForNonEligibleLogin(
              router,
              checkUserSession,
              searchParams,
              socialToken
            )
          ) {
            return;
          }

          await ensureOAuthPlatformSession({
            searchParams,
            sf: sfBeforeSession,
            pendingPlatformAccessToken:
              searchParams.get('pendingPlatformAccessToken') || accessToken || '',
            accessToken,
          });

          await checkUserSession?.();
        }

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
          const memberOrNricLogin = await tryCompleteIscaMemberSsoLogin({
            socialToken: searchParams.get('socialAccessToken') || '',
            pendingPlatformAccessToken:
              searchParams.get('pendingPlatformAccessToken') || accessToken || '',
            searchParams,
          });
          if (memberOrNricLogin.loggedIn) {
            return;
          }

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

        const socialToken = searchParams.get('socialAccessToken') || '';
        if (
          await redirectCitizenshipGapForNonEligibleLogin(
            router,
            checkUserSession,
            searchParams,
            socialToken
          )
        ) {
          return;
        }

        clearMembershipApplicationPending();
        clearMembershipEligibilitySessionStorage();

        // Hard navigate once — avoids AuthGuard splash ↔ dashboard flip after SSO.
        const go = (path) => {
          const base = (window.location.origin || '').replace(/\/$/, '');
          window.location.replace(`${base}${path.startsWith('/') ? path : `/${path}`}`);
        };

        if (userRole === 'admin') {
          go(`${paths.admin.root}/dashboard`);
        } else if (userRole === 'corporate') {
          const corporatePath =
            nextPath && String(nextPath).startsWith('/corporate')
              ? nextPath
              : paths.corporate.overview;
          go(corporatePath);
        } else {
          // Individual / ISCA: never land on /corporate (Org Portal SSO returnTo).
          const individualPath =
            nextPath && !String(nextPath).startsWith('/corporate')
              ? nextPath
              : '/home';
          go(individualPath);
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
        if (lockStorageKey) {
          try {
            sessionStorage.removeItem(lockStorageKey);
          } catch {
            // ignore
          }
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [searchParams, router, checkUserSession]);

  const pageShellSx = {
    minHeight: '100dvh',
    width: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: { xs: 2, sm: 3 },
    py: { xs: 4, sm: 6 },
    bgcolor: alpha(theme.palette.grey[500], 0.04),
    backgroundImage: `radial-gradient(ellipse at 50% 0%, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 55%)`,
  };

  const cardSx = {
    width: 1,
    maxWidth: 480,
    p: { xs: 3, sm: 4 },
    borderRadius: 3,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
    boxShadow: `0 18px 48px ${alpha(theme.palette.grey[500], 0.12)}`,
    bgcolor: 'background.paper',
    textAlign: 'center',
  };

  if (loading && !error) {
    return (
      <Box sx={pageShellSx}>
        <Card sx={cardSx}>
          <Stack spacing={2.5} alignItems="center">
            <CircularProgress size={40} thickness={4} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Completing sign-in
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we finish connecting your account…
              </Typography>
            </Box>
          </Stack>
        </Card>
      </Box>
    );
  }

  if (error) {
    const studentLoginPending = isStudentMemberLoginPending();
    return (
      <Box sx={pageShellSx}>
        <Card sx={cardSx}>
          <Stack spacing={2.5} alignItems="center">
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: 'error.main',
              }}
            >
              <Iconify icon="solar:danger-triangle-bold" width={36} />
            </Box>

            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
                Sign-in could not be completed
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                Something went wrong while signing you in. You can return to the sign-in page and try again.
              </Typography>
            </Box>

            <Alert
              severity="error"
              variant="outlined"
              sx={{
                width: 1,
                textAlign: 'left',
                borderRadius: 2,
                alignItems: 'flex-start',
              }}
            >
              {error}
            </Alert>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ width: 1, pt: 0.5 }}
              justifyContent="center"
            >
              {studentLoginPending && (
                <Button
                  component={RouterLink}
                  href={paths.auth.membership.studentApplication}
                  variant="contained"
                  size="large"
                  fullWidth
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  Back to student application
                </Button>
              )}
              <Button
                component={RouterLink}
                href={paths.auth.simple.signIn}
                variant={studentLoginPending ? 'outlined' : 'contained'}
                size="large"
                fullWidth
                startIcon={<Iconify icon="solar:login-3-bold" width={20} />}
                sx={{ fontWeight: 700, borderRadius: 2 }}
              >
                Go to sign in page
              </Button>
            </Stack>
          </Stack>
        </Card>
      </Box>
    );
  }

  return null;
}
