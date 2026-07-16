import axios from 'src/utils/axios';
import { fetchCurrentUser } from 'src/auth/context/jwt/session';
import { paths } from 'src/routes/paths';

import { handleMembershipSalesforceAuthError } from './membership-salesforce-auth';
import {
  STUDENT_MEMBER_LOGIN_OUTCOME,
  clearStudentMemberLoginPending,
  clearStudentMembershipApplicationPending,
  readMembershipApplicationCourseReturn,
  clearMembershipApplicationCourseReturn,
  setStudentMemberLoginPending,
} from './membership-salesforce-session';
import { POST_OAUTH_RETURN_TO_KEY } from './membership-eligibility-sso';

// ----------------------------------------------------------------------

export const STUDENT_MEMBERSHIP_PENDING_LOGIN_MESSAGE =
  'Your application has been submitted. ISCA Student Membership is not active in eServices yet — please sign in again once your membership is approved.';

export const STUDENT_MEMBERSHIP_PASSWORD_RESET_INSTRUCTIONS =
  'A password reset email has been sent to your registered email address. Please check your inbox (and spam folder), set your eServices password using the link in that email, then use the Sign in button below.';

export const STUDENT_MEMBERSHIP_SSO_LOGIN_INSTRUCTIONS =
  'If your eServices account is already active with Student Member status, sign in with eServices below to access AI Nexus.';

export function isSalesforceStudentMemberClass(memberClass) {
  const normalized = String(memberClass || '').trim().toUpperCase();
  if (!normalized || normalized.includes('NON')) return false;
  return normalized === 'STUDENT MEMBER' || normalized.includes('STUDENT');
}

export function isSalesforceMembershipStatusApproved(membershipStatus) {
  return String(membershipStatus || '').trim().toLowerCase() === 'approved';
}

export function isApprovedSalesforceStudentMember(salesforce = {}) {
  if (!salesforce || typeof salesforce !== 'object') return false;
  const memberClass = String(salesforce.memberClass || '').trim();
  const membershipStatus = String(salesforce.membershipStatus || '').trim();
  return (
    isSalesforceStudentMemberClass(memberClass)
    && isSalesforceMembershipStatusApproved(membershipStatus)
  );
}

export function parseStudentMembershipUserCheckResult(data) {
  const salesforce = data?.salesforce && typeof data.salesforce === 'object' ? data.salesforce : {};
  const status = String(salesforce.status ?? data?.status ?? '').trim().toUpperCase();
  const message = String(salesforce.message ?? data?.message ?? '').trim();
  const userExists =
    status === 'EXISTS'
    || status === 'EXIST'
    || status === 'ALREADY_EXISTS'
    || /already exists|user exists/i.test(message);

  return {
    userExists,
    message:
      message
      || (userExists
        ? 'A user with this email, mobile number, or matriculation number already exists.'
        : 'User check completed.'),
  };
}

export function parseStudentMembershipCreateResult(data) {
  const salesforce = data?.salesforce && typeof data.salesforce === 'object' ? data.salesforce : {};
  return {
    success: data?.success !== false,
    message: String(data?.message ?? salesforce.message ?? 'Application processed successfully.').trim(),
    applicationName: String(
      data?.applicationName
        ?? salesforce.applicationName
        ?? salesforce['application name']
        ?? ''
    ).trim(),
    applicationId: String(
      data?.applicationId
        ?? salesforce.applicationId
        ?? salesforce.ApplicationId
        ?? ''
    ).trim(),
  };
}

export function parseStudentMembershipSubmitResult(data) {
  const salesforce = data?.salesforce && typeof data.salesforce === 'object' ? data.salesforce : {};
  const applicationName = String(
    data?.applicationName
      ?? salesforce['application name']
      ?? salesforce.applicationName
      ?? ''
  ).trim();
  const applicationStatus = String(
    data?.applicationStatus
      ?? salesforce['application status']
      ?? salesforce.applicationStatus
      ?? ''
  ).trim();
  const applicationId = String(data?.applicationId ?? salesforce.applicationId ?? '').trim();
  const message = String(data?.message ?? salesforce.message ?? '').trim();
  const status = String(data?.status ?? salesforce.status ?? '').trim();
  const normalizedStatus = status.toLowerCase();
  const normalizedApplicationStatus = applicationStatus.toLowerCase();

  return {
    applicationName,
    applicationStatus,
    applicationId,
    message: message || 'Student membership application submitted.',
    status: status || (normalizedApplicationStatus === 'approved' ? 'Success' : ''),
    isApproved:
      data?.isApproved === true
      || normalizedStatus === 'success'
      || normalizedApplicationStatus === 'approved',
  };
}

export function resolveStudentMemberFromApiPayload(data) {
  if (!data || typeof data !== 'object') {
    return { isStudentMember: false, memberClass: '' };
  }
  const memberClass = String(data.memberClass ?? data.nexusUser?.memberClass ?? '').trim();
  const membershipStatus = String(
    data.membershipStatus ?? data.nexusUser?.membershipStatus ?? ''
  ).trim();
  const isStudentMember =
    data.isStudentMember === true
    || isApprovedSalesforceStudentMember({ memberClass, membershipStatus });
  return { isStudentMember, memberClass, membershipStatus };
}

export function redirectStudentMemberToPlatform(redirectTo) {
  const target = String(redirectTo || '').trim() || paths.learning;
  if (typeof window !== 'undefined') {
    window.location.assign(target.startsWith('http') ? target : `${window.location.origin}${target}`);
  }
}

async function callStudentMembershipLoginApi(request) {
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

export async function loginStudentMembershipIfStudent(socialAccessToken) {
  return callStudentMembershipLoginApi(async () => {
    const res = await axios.post('/auth/student-membership-application/student-login', {
      socialAccessToken,
    });
    return res.data;
  });
}

/**
 * If Salesforce memberClass is Student, establish platform session and return redirect path.
 */
export async function tryCompleteStudentMemberPlatformLogin(options = {}) {
  const socialAccessToken = String(options.socialAccessToken || '').trim();
  if (!socialAccessToken) {
    return { loggedIn: false, message: 'eServices session is missing.' };
  }

  const data = await loginStudentMembershipIfStudent(socialAccessToken);
  const { isStudentMember, memberClass } = resolveStudentMemberFromApiPayload(data);

  if (!isStudentMember) {
    return {
      loggedIn: false,
      memberClass: memberClass || undefined,
      message: data?.message || STUDENT_MEMBERSHIP_PENDING_LOGIN_MESSAGE,
    };
  }

  const platformToken = String(data?.accessToken || options.platformAccessToken || '').trim();
  if (!platformToken) {
    return {
      loggedIn: false,
      memberClass: memberClass || 'Student',
      message:
        'Student membership was confirmed but sign-in could not be completed. Please sign in with eServices again.',
    };
  }

  await axios.post('/auth/establish-session', { token: platformToken }, { skipAuthRefresh: true });
  await fetchCurrentUser();

  clearStudentMembershipApplicationPending();
  clearStudentMemberLoginPending();

  const courseReturn = readMembershipApplicationCourseReturn();
  clearMembershipApplicationCourseReturn();

  const redirectTo = options.redirectTo || courseReturn || paths.learning;

  return {
    loggedIn: true,
    memberClass: memberClass || 'Student',
    redirectTo,
    message: data?.message || 'Signed in with your ISCA Student Membership.',
  };
}

export function buildStudentMemberSsoLoginUrl(returnPath) {
  const safeReturn = String(returnPath || paths.learning).trim() || paths.learning;
  try {
    sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, safeReturn);
  } catch {
    // ignore
  }
  const returnTo = encodeURIComponent(safeReturn);
  const outcome = encodeURIComponent(STUDENT_MEMBER_LOGIN_OUTCOME);
  return `${paths.auth.oauth.start}?returnTo=${returnTo}&membershipOutcome=${outcome}`;
}

export function startStudentMemberSsoLogin(returnPath) {
  if (typeof window === 'undefined') return;
  setStudentMemberLoginPending();
  window.location.assign(buildStudentMemberSsoLoginUrl(returnPath));
}
