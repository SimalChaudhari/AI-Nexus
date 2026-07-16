import axios from 'src/utils/axios';
import { fetchCurrentUser } from 'src/auth/context/jwt/session';
import { paths } from 'src/routes/paths';

import { handleMembershipSalesforceAuthError } from './membership-salesforce-auth';
import {
  clearMembershipApplicationPending,
  clearMembershipSalesforceSession,
  readMembershipApplicationCourseReturn,
  clearMembershipApplicationCourseReturn,
  readMembershipSalesforceSession,
} from './membership-salesforce-session';

// ----------------------------------------------------------------------

export const MEMBERSHIP_APPLICATION_CA_PENDING_MESSAGE =
  'Your payment has been received and your application is on file. Chartered Accountant (CA) status is not active in eServices yet — please sign in again once ISCA confirms your CA membership.';

export const MEMBERSHIP_APPLICATION_ALREADY_SUBMITTED_MESSAGE =
  'This application has already been submitted to ISCA. Billing was recorded previously. If your CA membership is not active yet, please wait for processing or contact ISCA eServices.';

export function isSalesforceCaMemberClass(memberClass) {
  const normalized = String(memberClass || '').trim().toUpperCase();
  return normalized === 'CA' || normalized === 'CHARTERED ACCOUNTANT';
}

export function resolveCaMemberFromApiPayload(data) {
  if (!data || typeof data !== 'object') {
    return { isCaMember: false, memberClass: '' };
  }
  const memberClass = String(
    data.memberClass ?? data.nexusUser?.memberClass ?? ''
  ).trim();
  const isCaMember =
    data.isCaMember === true || isSalesforceCaMemberClass(memberClass);
  return { isCaMember, memberClass };
}

/** Hard navigation so the application page cannot flash after CA login. */
export function redirectCaMemberToPlatform(redirectTo) {
  const target = String(redirectTo || '').trim() || paths.learning;
  if (typeof window !== 'undefined') {
    window.location.assign(target.startsWith('http') ? target : `${window.location.origin}${target}`);
  }
}

async function callMembershipCaApi(request) {
  try {
    return await request();
  } catch (error) {
    if (handleMembershipSalesforceAuthError(error)) {
      const redirectError = new Error(
        'Your eServices session has expired. Redirecting to sign in…'
      );
      redirectError.code = 'SALESFORCE_SOCIAL_TOKEN_EXPIRED';
      throw redirectError;
    }
    throw error;
  }
}

/** Load userinfonexus via backend (Bearer = eServices social token). */
export async function fetchMembershipNexusUserInfo(socialAccessToken) {
  return callMembershipCaApi(async () => {
    const res = await axios.post('/auth/membership-application/user-info', {
      socialAccessToken,
    });
    return res.data;
  });
}

/**
 * If Salesforce memberClass is CA, establish platform session and return redirect path.
 * @returns {{ loggedIn: boolean, memberClass?: string, redirectTo?: string, message?: string }}
 */
export async function tryCompleteCaMemberPlatformLogin(options = {}) {
  const session = readMembershipSalesforceSession();
  const socialAccessToken = String(
    options.socialAccessToken || session?.socialToken || ''
  ).trim();

  if (!socialAccessToken) {
    return { loggedIn: false, message: 'eServices session is missing.' };
  }

  const data = await callMembershipCaApi(async () => {
    const res = await axios.post('/auth/membership-application/ca-login', {
      socialAccessToken,
    });
    return res.data;
  });

  const { isCaMember, memberClass } = resolveCaMemberFromApiPayload(data);
  if (!isCaMember) {
    return {
      loggedIn: false,
      memberClass: memberClass || undefined,
      message: data?.message || MEMBERSHIP_APPLICATION_CA_PENDING_MESSAGE,
    };
  }

  const platformToken =
    String(data?.accessToken || '').trim()
    || String(session?.pendingPlatformAccessToken || '').trim();

  if (!platformToken) {
    return {
      loggedIn: false,
      memberClass: String(memberClass || 'CA'),
      message: 'CA membership was confirmed but sign-in could not be completed. Please sign in with eServices again.',
    };
  }

  await axios.post('/auth/establish-session', { token: platformToken }, { skipAuthRefresh: true });
  await fetchCurrentUser();

  clearMembershipApplicationPending();
  clearMembershipSalesforceSession();

  const courseReturn = readMembershipApplicationCourseReturn();
  clearMembershipApplicationCourseReturn();

  const redirectTo =
    options.redirectTo
    || courseReturn
    || paths.learning;

  return {
    loggedIn: true,
    memberClass: String(memberClass || 'CA'),
    redirectTo,
    message: data?.message || 'Signed in with your CA membership.',
  };
}

/**
 * When userinfonexus has NRIC_Number, establish platform session (same pattern as member login).
 */
export async function tryCompleteNricNumberPlatformLogin(options = {}) {
  const session = readMembershipSalesforceSession();
  const socialAccessToken = String(
    options.socialAccessToken || session?.socialToken || ''
  ).trim();

  if (!socialAccessToken) {
    return { loggedIn: false, message: 'eServices session is missing.' };
  }

  const data = await callMembershipCaApi(async () => {
    const res = await axios.post('/auth/membership-application/nric-login', {
      socialAccessToken,
    });
    return res.data;
  });

  if (data?.hasNricNumber !== true) {
    return { loggedIn: false, message: data?.message || 'NRIC_Number was not found in eServices.' };
  }

  if (data?.loginAllowed === false) {
    return {
      loggedIn: false,
      message: data?.message || 'Sign-in is not available for this eServices account.',
    };
  }

  const platformToken =
    String(data?.accessToken || '').trim()
    || String(session?.pendingPlatformAccessToken || '').trim()
    || String(options.pendingPlatformAccessToken || '').trim();

  if (!platformToken) {
    return {
      loggedIn: false,
      message: 'NRIC account was confirmed but sign-in could not be completed.',
    };
  }

  await axios.post('/auth/establish-session', { token: platformToken }, { skipAuthRefresh: true });
  await fetchCurrentUser();

  clearMembershipApplicationPending();
  clearMembershipSalesforceSession();

  const courseReturn = readMembershipApplicationCourseReturn();
  clearMembershipApplicationCourseReturn();

  const redirectTo = options.redirectTo || courseReturn || paths.learning;

  return {
    loggedIn: true,
    nricNumber: data?.nricNumber || undefined,
    redirectTo,
    message: data?.message || 'Signed in with your NRIC account.',
  };
}
