import {
  readMembershipSalesforceSession,
  clearMembershipSalesforceSession,
  clearMembershipApplicationPending,
  clearStudentMemberLoginPending,
  clearStudentMembershipApplicationPending,
  clearMembershipApplicationCourseReturn,
} from 'src/utils/membership-salesforce-session';
import { clearMembershipEligibilitySessionStorage } from 'src/utils/membership-eligibility-sso';

const AUTH_SESSION_STORAGE_KEYS = [
  'user',
  'jwt_access_token',
  'membershipDraftUserId',
  'salesforceNexusUsername',
  'pendingNexusPasswordSetup',
  'postOAuthReturnTo',
  'membershipEligibilityFlow',
  'scaqSsoVerificationPending',
  'iscaMemberSsoCheckPending',
  'membershipApplicationPending',
  'studentMemberLoginPending',
  'studentMembershipApplicationPending',
  'membershipApplicationCourseReturn',
  'membershipApplicationPathway',
];

const AUTH_LOCAL_STORAGE_KEYS = [
  'jwt_access_token',
  'access-token',
  'membershipSalesforceSession',
];

/** Optional Salesforce token from membership flow (when not yet stored on the user row). */
export function buildLogoutPayload() {
  const membershipSf = readMembershipSalesforceSession();
  const socialAccessToken = String(
    membershipSf?.socialToken || membershipSf?.pendingPlatformAccessToken || ''
  ).trim();
  return socialAccessToken ? { socialAccessToken } : {};
}

function removeStorageKeys(storage, keys) {
  if (!storage) return;
  keys.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      // ignore
    }
  });
}

/**
 * Wipe auth/SSO-related browser storage so logout cannot leave a stale session
 * that causes silent re-login.
 */
export function clearClientSalesforceSessions() {
  clearMembershipSalesforceSession();
  clearMembershipApplicationPending();
  clearStudentMemberLoginPending();
  clearStudentMembershipApplicationPending();
  clearMembershipApplicationCourseReturn();
  clearMembershipEligibilitySessionStorage();

  if (typeof window === 'undefined') return;

  removeStorageKeys(window.sessionStorage, AUTH_SESSION_STORAGE_KEYS);
  removeStorageKeys(window.localStorage, AUTH_LOCAL_STORAGE_KEYS);

  try {
    const sessionKeys = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key) continue;
      const lower = key.toLowerCase();
      // Keep requireIdpLogin — set after wipe so next SSO forces Salesforce re-auth.
      if (key === 'requireIdpLogin') continue;
      if (
        lower.includes('oauth')
        || lower.includes('salesforce')
        || lower.includes('sso')
        || lower.includes('membership')
        || lower === 'user'
        || lower.includes('jwt')
        || lower.includes('access-token')
        || lower.includes('accesstoken')
      ) {
        sessionKeys.push(key);
      }
    }
    removeStorageKeys(window.sessionStorage, sessionKeys);
  } catch {
    // ignore
  }
}
