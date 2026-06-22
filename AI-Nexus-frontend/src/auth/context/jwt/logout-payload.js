import {
  readMembershipSalesforceSession,
  clearMembershipSalesforceSession,
} from 'src/utils/membership-salesforce-session';

/** Optional Salesforce token from membership flow (when not yet stored on the user row). */
export function buildLogoutPayload() {
  const membershipSf = readMembershipSalesforceSession();
  const socialAccessToken = String(
    membershipSf?.socialToken || membershipSf?.pendingPlatformAccessToken || ''
  ).trim();
  return socialAccessToken ? { socialAccessToken } : {};
}

export function clearClientSalesforceSessions() {
  clearMembershipSalesforceSession();
}
