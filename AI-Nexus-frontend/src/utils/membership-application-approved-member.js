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

export const MEMBERSHIP_APPLICATION_MEMBER_PENDING_MESSAGE =
  'Your payment has been received and your application is on file. ISCA Member status is not active in eServices yet — please sign in again once your membership is approved.';

export function isSalesforceMembershipStatusApproved(membershipStatus) {
  return String(membershipStatus || '').trim().toLowerCase() === 'approved';
}

export function isSalesforceCaMemberClass(memberClass) {
  const normalized = String(memberClass || '').trim().toUpperCase();
  return normalized === 'CA' || normalized === 'CHARTERED ACCOUNTANT';
}

export function isSalesforceStudentMemberClass(memberClass) {
  const normalized = String(memberClass || '').trim().toUpperCase();
  if (!normalized || normalized.includes('NON')) return false;
  return normalized === 'STUDENT MEMBER' || normalized.includes('STUDENT');
}

export function isSalesforceIscaMemberClass(memberClass) {
  const normalized = String(memberClass || '').trim().toUpperCase();
  if (!normalized || normalized.includes('NON')) return false;
  if (isSalesforceCaMemberClass(memberClass)) return false;
  if (isSalesforceStudentMemberClass(memberClass)) return false;
  return normalized === 'MEMBER';
}

export function isApprovedSalesforceMember(salesforce = {}) {
  if (!salesforce || typeof salesforce !== 'object') return false;
  const memberClass = String(salesforce.memberClass || '').trim();
  const membershipStatus = String(salesforce.membershipStatus || '').trim();
  return (
    isSalesforceIscaMemberClass(memberClass)
    && isSalesforceMembershipStatusApproved(membershipStatus)
  );
}

export function resolveApprovedMemberFromApiPayload(data) {
  if (!data || typeof data !== 'object') {
    return { isApprovedMember: false, memberClass: '', membershipStatus: '' };
  }
  const nexusUser = data.nexusUser && typeof data.nexusUser === 'object' ? data.nexusUser : {};
  const memberClass = String(data.memberClass ?? nexusUser.memberClass ?? '').trim();
  const membershipStatus = String(
    data.membershipStatus ?? nexusUser.membershipStatus ?? ''
  ).trim();
  const isApprovedMember =
    data.isApprovedMember === true || isApprovedSalesforceMember({ memberClass, membershipStatus });
  return { isApprovedMember, memberClass, membershipStatus };
}

async function callMembershipMemberApi(request) {
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

export async function loginApprovedMemberIfEligible(socialAccessToken) {
  return callMembershipMemberApi(async () => {
    const res = await axios.post('/auth/membership-application/member-login', {
      socialAccessToken,
    });
    return res.data;
  });
}

/**
 * When Salesforce memberClass is Member and membershipStatus is Approved,
 * establish platform session and return redirect path.
 */
export async function tryCompleteApprovedMemberPlatformLogin(options = {}) {
  const session = readMembershipSalesforceSession();
  const socialAccessToken = String(
    options.socialAccessToken || session?.socialToken || ''
  ).trim();

  if (!socialAccessToken) {
    return { loggedIn: false, message: 'eServices session is missing.' };
  }

  const data = await loginApprovedMemberIfEligible(socialAccessToken);
  const { isApprovedMember, memberClass, membershipStatus } =
    resolveApprovedMemberFromApiPayload(data);

  if (!isApprovedMember) {
    return {
      loggedIn: false,
      memberClass: memberClass || undefined,
      membershipStatus: membershipStatus || undefined,
      message: data?.message || MEMBERSHIP_APPLICATION_MEMBER_PENDING_MESSAGE,
    };
  }

  const platformToken =
    String(data?.accessToken || '').trim()
    || String(session?.pendingPlatformAccessToken || '').trim();

  if (!platformToken) {
    return {
      loggedIn: false,
      memberClass: memberClass || 'Member',
      message:
        'ISCA membership was confirmed but sign-in could not be completed. Please sign in with eServices again.',
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
    memberClass: memberClass || 'Member',
    membershipStatus: membershipStatus || 'Approved',
    redirectTo,
    message: data?.message || 'Signed in with your ISCA membership.',
  };
}
