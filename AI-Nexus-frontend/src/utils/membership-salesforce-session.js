import axios from 'src/utils/axios';
import { fetchCurrentUser } from 'src/auth/context/jwt/session';

// ----------------------------------------------------------------------
// Salesforce session for membership application (accountId + IdP social token)
// ----------------------------------------------------------------------

export const MEMBERSHIP_SALESFORCE_SESSION_KEY = 'membershipSalesforceSession';

export const MEMBERSHIP_APPLICATION_OUTCOME = 'membership-application';

export const STUDENT_MEMBERSHIP_APPLICATION_OUTCOME = 'student-membership-application';

/** After student application submit — SSO login to verify Student member class. */
export const STUDENT_MEMBER_LOGIN_OUTCOME = 'student-member-login';

const STUDENT_MEMBER_LOGIN_PENDING_KEY = 'studentMemberLoginPending';

/** postMessage type when a child tab finishes Salesforce create/login */
export const MEMBERSHIP_SALESFORCE_SESSION_READY = 'MEMBERSHIP_SALESFORCE_SESSION_READY';

export const MEMBERSHIP_APPLICATION_FORM_DRAFT_KEY = 'membershipApplicationFormDraft';

/** Set when recognition-path user starts Salesforce login/create (not general Eservices login). */
export const MEMBERSHIP_APPLICATION_PENDING_KEY = 'membershipApplicationPending';

/** Course/learning URL to return after recognition application is finished. */
export const MEMBERSHIP_APPLICATION_COURSE_RETURN_KEY = 'membershipApplicationCourseReturn';

/**
 * @returns {{
 *   accountId: string,
 *   socialToken: string,
 *   memberClass?: string,
 *   pendingPlatformAccessToken?: string,
 *   platformAccessToken?: string,
 *   savedAt: string,
 * } | null}
 */
export function readMembershipSalesforceSession() {
  try {
    const raw = localStorage.getItem(MEMBERSHIP_SALESFORCE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const accountId = String(parsed.accountId || '').trim();
    if (!accountId) return null;
    const pendingPlatformAccessToken =
      String(parsed.pendingPlatformAccessToken || parsed.platformAccessToken || '').trim() || undefined;
    return {
      accountId,
      applicationId: String(parsed.applicationId || '').trim() || undefined,
      socialToken: String(parsed.socialToken || '').trim(),
      firstName: String(parsed.firstName || '').trim() || undefined,
      lastName: String(parsed.lastName || '').trim() || undefined,
      email: String(parsed.email || '').trim() || undefined,
      memberClass: String(parsed.memberClass || '').trim() || undefined,
      pendingPlatformAccessToken,
      platformAccessToken: pendingPlatformAccessToken,
      savedAt: String(parsed.savedAt || ''),
    };
  } catch {
    return null;
  }
}

/**
 * Save Salesforce credentials for the recognition application tab only.
 * Does NOT log the user into the main website — use applyDeferredPlatformLoginAfterApplication later.
 * @param {{ accountId: string, socialToken?: string, pendingPlatformAccessToken?: string }} payload
 */
export function persistMembershipSalesforceSession(payload) {
  const accountId = String(payload?.accountId || '').trim();
  if (!accountId) return false;
  const record = {
    accountId,
    ...(payload?.applicationId
      ? { applicationId: String(payload.applicationId).trim() }
      : {}),
    ...(payload?.memberClass
      ? { memberClass: String(payload.memberClass).trim() }
      : {}),
    ...(payload?.firstName ? { firstName: String(payload.firstName).trim() } : {}),
    ...(payload?.lastName ? { lastName: String(payload.lastName).trim() } : {}),
    ...(payload?.email ? { email: String(payload.email).trim() } : {}),
    socialToken: String(payload?.socialToken || '').trim(),
    pendingPlatformAccessToken: String(payload?.pendingPlatformAccessToken || '').trim() || undefined,
    savedAt: new Date().toISOString(),
  };
  try {
    const existing = localStorage.getItem(MEMBERSHIP_SALESFORCE_SESSION_KEY);
    if (existing) {
      const prev = JSON.parse(existing);
      if (!record.applicationId && prev?.applicationId) {
        record.applicationId = prev.applicationId;
      }
    }
  } catch {
    // ignore
  }
  try {
    localStorage.setItem(MEMBERSHIP_SALESFORCE_SESSION_KEY, JSON.stringify(record));
    window.dispatchEvent(new StorageEvent('storage', { key: MEMBERSHIP_SALESFORCE_SESSION_KEY }));
    return true;
  } catch {
    return false;
  }
}

export function clearMembershipSalesforceSession() {
  try {
    localStorage.removeItem(MEMBERSHIP_SALESFORCE_SESSION_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: MEMBERSHIP_SALESFORCE_SESSION_KEY }));
  } catch {
    // ignore
  }
}

/** Notify opener window that Salesforce session is ready (same-origin). */
export function notifyMembershipSalesforceSessionReady() {
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: MEMBERSHIP_SALESFORCE_SESSION_READY },
        window.location.origin
      );
    }
  } catch {
    // ignore cross-origin
  }
}

export function setMembershipApplicationPending() {
  try {
    sessionStorage.setItem(MEMBERSHIP_APPLICATION_PENDING_KEY, 'true');
  } catch {
    // ignore
  }
}

export function clearMembershipApplicationPending() {
  try {
    sessionStorage.removeItem(MEMBERSHIP_APPLICATION_PENDING_KEY);
  } catch {
    // ignore
  }
}

export function isMembershipApplicationPending() {
  try {
    return sessionStorage.getItem(MEMBERSHIP_APPLICATION_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isRecognitionMembershipApplicationFlow(searchParams) {
  if (isMembershipApplicationOAuthOutcome(searchParams)) return true;
  return isMembershipApplicationPending();
}

export function isMembershipApplicationOAuthOutcome(searchParams) {
  const outcome = searchParams?.get?.('membershipOutcome');
  return outcome === MEMBERSHIP_APPLICATION_OUTCOME;
}

export function isStudentMembershipApplicationOAuthOutcome(searchParams) {
  const outcome = searchParams?.get?.('membershipOutcome');
  return outcome === STUDENT_MEMBERSHIP_APPLICATION_OUTCOME;
}

export function setStudentMemberLoginPending() {
  try {
    sessionStorage.setItem(STUDENT_MEMBER_LOGIN_PENDING_KEY, 'true');
  } catch {
    // ignore
  }
}

export function clearStudentMemberLoginPending() {
  try {
    sessionStorage.removeItem(STUDENT_MEMBER_LOGIN_PENDING_KEY);
  } catch {
    // ignore
  }
}

export function isStudentMemberLoginPending() {
  try {
    return sessionStorage.getItem(STUDENT_MEMBER_LOGIN_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isStudentMemberLoginOAuthOutcome(searchParams) {
  const outcome = searchParams?.get?.('membershipOutcome');
  if (outcome === STUDENT_MEMBER_LOGIN_OUTCOME) return true;
  return isStudentMemberLoginPending();
}

export function isStudentMembershipApplicationFlow(searchParams) {
  if (isStudentMembershipApplicationOAuthOutcome(searchParams)) return true;
  try {
    return sessionStorage.getItem('studentMembershipApplicationPending') === 'true';
  } catch {
    return false;
  }
}

export function setStudentMembershipApplicationPending() {
  try {
    sessionStorage.setItem('studentMembershipApplicationPending', 'true');
  } catch {
    // ignore
  }
}

export function clearStudentMembershipApplicationPending() {
  try {
    sessionStorage.removeItem('studentMembershipApplicationPending');
  } catch {
    // ignore
  }
}

/**
 * Remember where to send the user after the recognition application form is done.
 * @param {string} returnPath — e.g. /learning/course/123/learn
 */
export function saveMembershipApplicationCourseReturn(returnPath) {
  if (!returnPath?.trim()) return;
  try {
    sessionStorage.setItem(MEMBERSHIP_APPLICATION_COURSE_RETURN_KEY, returnPath.trim());
  } catch {
    // ignore
  }
}

export function readMembershipApplicationCourseReturn() {
  try {
    return sessionStorage.getItem(MEMBERSHIP_APPLICATION_COURSE_RETURN_KEY) || '';
  } catch {
    return '';
  }
}

export function clearMembershipApplicationCourseReturn() {
  try {
    sessionStorage.removeItem(MEMBERSHIP_APPLICATION_COURSE_RETURN_KEY);
  } catch {
    // ignore
  }
}

/**
 * Build OAuth start URL for membership application login (new tab).
 * @param {string} oauthStartPath
 * @param {string} bridgePath — page that receives OAuth redirect and saves session
 */
export function buildMembershipApplicationOAuthStartUrl(
  oauthStartPath,
  bridgePath,
  options = {},
) {
  const returnTo = encodeURIComponent(bridgePath);
  const membershipOutcome = encodeURIComponent(
    options.membershipOutcome || MEMBERSHIP_APPLICATION_OUTCOME
  );
  const eligibilityType = encodeURIComponent(options.eligibilityType || 'recognition');
  return `${oauthStartPath}?returnTo=${returnTo}&membershipOutcome=${membershipOutcome}&eligibilityType=${eligibilityType}`;
}

export function buildStudentMembershipApplicationOAuthStartUrl(oauthStartPath, bridgePath) {
  return buildMembershipApplicationOAuthStartUrl(oauthStartPath, bridgePath, {
    membershipOutcome: STUDENT_MEMBERSHIP_APPLICATION_OUTCOME,
    eligibilityType: 'student',
  });
}

/**
 * OAuth start URL when SSO succeeded but Salesforce account id is missing.
 * @param {string} oauthStartPath
 */
export function buildMembershipApplicationOAuthRetryUrl(oauthStartPath) {
  return `${oauthStartPath}?membershipOutcome=${encodeURIComponent(MEMBERSHIP_APPLICATION_OUTCOME)}&eligibilityType=recognition`;
}

/**
 * @param {string} createPagePath
 */
/**
 * Log into the main website after the recognition application form is complete.
 * @returns {boolean} whether a platform session was applied
 */
export function mergeApplicationIdIntoSession(applicationId) {
  if (!applicationId?.trim()) return;
  const session = readMembershipSalesforceSession();
  if (!session?.accountId) return;
  persistMembershipSalesforceSession({
    accountId: session.accountId,
    applicationId: applicationId.trim(),
    socialToken: session.socialToken,
    pendingPlatformAccessToken: session.pendingPlatformAccessToken,
  });
}

export async function applyDeferredPlatformLoginAfterApplication() {
  const session = readMembershipSalesforceSession();
  const token = session?.pendingPlatformAccessToken;
  if (!token) return false;

  try {
    await axios.post('/auth/establish-session', { token }, { skipAuthRefresh: true });
    await fetchCurrentUser();
    return true;
  } catch {
    return false;
  }
}

export function buildMembershipSalesforceCreateUrl(createPagePath) {
  const bridgePath = '/auth/membership/salesforce-bridge';
  const params = new URLSearchParams({
    returnTo: bridgePath,
    membershipOutcome: MEMBERSHIP_APPLICATION_OUTCOME,
  });
  return `${createPagePath}?${params.toString()}`;
}

export function buildStudentMembershipSalesforceCreateUrl(createPagePath) {
  const bridgePath = '/auth/membership/salesforce-bridge';
  const params = new URLSearchParams({
    returnTo: bridgePath,
    membershipOutcome: STUDENT_MEMBERSHIP_APPLICATION_OUTCOME,
    eligibilityType: 'student',
  });
  return `${createPagePath}?${params.toString()}`;
}

/**
 * Navigate to the full-page membership application (recognition path) in the current tab.
 */
export function openRecognitionMembershipApplicationPage(applicationPath) {
  if (typeof window === 'undefined' || !applicationPath) return null;

  const path = applicationPath.startsWith('/') ? applicationPath : `/${applicationPath}`;
  const url = applicationPath.startsWith('http')
    ? applicationPath
    : `${window.location.origin}${path}`;

  if (window.location.pathname.includes(path)) {
    return window;
  }

  window.location.assign(url);
  return window;
}

export function openStudentMembershipApplicationPage(applicationPath) {
  return openRecognitionMembershipApplicationPage(applicationPath);
}
