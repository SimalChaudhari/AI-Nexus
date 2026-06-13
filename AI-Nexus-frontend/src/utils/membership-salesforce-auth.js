import { paths } from 'src/routes/paths';

import {
  buildMembershipApplicationOAuthStartUrl,
  persistMembershipSalesforceSession,
  readMembershipSalesforceSession,
  setMembershipApplicationPending,
  setStudentMembershipApplicationPending,
} from './membership-salesforce-session';

// ----------------------------------------------------------------------

export const SALESFORCE_SOCIAL_TOKEN_EXPIRED_PREFIX = 'SALESFORCE_SOCIAL_TOKEN_EXPIRED';

export const MEMBERSHIP_APPLICATION_SSO_REDIRECT_REASON_KEY =
  'membershipApplicationSsoRedirectReason';

const REDIRECT_GUARD_KEY = 'membershipApplicationSsoRedirectAt';

/** @param {unknown} error */
export function isSalesforceSocialTokenExpiredError(error) {
  const status = error?.response?.status ?? error?.status;
  const data = error?.response?.data;
  const messages = [
    error?.message,
    data?.message,
    typeof data?.message === 'object' ? data?.message?.message : null,
    data?.code,
    data?.error,
    data?.error_description,
    data?.errorDetails,
  ]
    .filter(Boolean)
    .map((value) => String(value));

  if (status === 401) return true;

  const combined = messages.join(' ').toLowerCase();
  if (combined.includes(SALESFORCE_SOCIAL_TOKEN_EXPIRED_PREFIX.toLowerCase())) {
    return true;
  }

  return (
    /expired/.test(combined)
    && (/token|session|eservices|idp|salesforce|social/.test(combined)
      || /sign in again/.test(combined))
  );
}

/**
 * Redirect to ISCA eServices SSO and return to the membership application after login.
 */
export function redirectToMembershipApplicationSsoLogin(options = {}) {
  if (typeof window === 'undefined') return false;

  const now = Date.now();
  try {
    const last = Number(sessionStorage.getItem(REDIRECT_GUARD_KEY) || 0);
    if (now - last < 3000) return false;
    sessionStorage.setItem(REDIRECT_GUARD_KEY, String(now));
    sessionStorage.setItem(
      MEMBERSHIP_APPLICATION_SSO_REDIRECT_REASON_KEY,
      options.reason || 'session_expired'
    );
  } catch {
    // ignore
  }

  const session = readMembershipSalesforceSession();
  if (session?.accountId) {
    persistMembershipSalesforceSession({
      accountId: session.accountId,
      applicationId: session.applicationId,
      socialToken: '',
      pendingPlatformAccessToken: session.pendingPlatformAccessToken,
    });
  }

  if (options.membershipOutcome === 'student-membership-application') {
    setStudentMembershipApplicationPending();
  } else {
    setMembershipApplicationPending();
  }

  const oauthUrl = buildMembershipApplicationOAuthStartUrl(
    paths.auth.oauth.start,
    paths.auth.membership.salesforceBridge,
    {
      membershipOutcome: options.membershipOutcome,
      eligibilityType: options.eligibilityType,
    }
  );

  window.location.assign(oauthUrl);
  return true;
}

/** @param {unknown} error */
export function handleMembershipSalesforceAuthError(error) {
  if (!isSalesforceSocialTokenExpiredError(error)) {
    return false;
  }
  redirectToMembershipApplicationSsoLogin({ reason: 'session_expired' });
  return true;
}

export function readMembershipApplicationSsoRedirectNotice() {
  if (typeof window === 'undefined') return '';
  try {
    const reason = sessionStorage.getItem(MEMBERSHIP_APPLICATION_SSO_REDIRECT_REASON_KEY);
    if (!reason) return '';
    sessionStorage.removeItem(MEMBERSHIP_APPLICATION_SSO_REDIRECT_REASON_KEY);
    if (reason === 'session_expired') {
      return 'Your eServices session expired. Please sign in again to continue your application.';
    }
    return 'Please sign in with eServices to continue your application.';
  } catch {
    return '';
  }
}

/**
 * @returns {string | null} Error message when session cannot be used; null when OK.
 */
export function getMembershipSalesforceSessionError() {
  const session = readMembershipSalesforceSession();
  if (!session?.accountId) {
    return 'Salesforce account is not linked. Please sign in with eServices.';
  }
  if (!session?.socialToken?.trim()) {
    return 'Your eServices session has expired. Redirecting to sign in…';
  }
  return null;
}

export function ensureMembershipSalesforceSession() {
  const sessionError = getMembershipSalesforceSessionError();
  if (!sessionError) {
    return readMembershipSalesforceSession();
  }

  if (sessionError.includes('expired') || sessionError.includes('Redirecting')) {
    redirectToMembershipApplicationSsoLogin({ reason: 'session_expired' });
    throw new Error('Your eServices session has expired. Redirecting to sign in…');
  }

  redirectToMembershipApplicationSsoLogin({ reason: 'missing_session' });
  throw new Error(sessionError);
}

export function clearMembershipApplicationDraftOnSsoReturn() {
  // Draft is preserved in localStorage — only clear redirect guard.
  try {
    sessionStorage.removeItem(REDIRECT_GUARD_KEY);
  } catch {
    // ignore
  }
}
