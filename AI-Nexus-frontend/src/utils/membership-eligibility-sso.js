// ----------------------------------------------------------------------
// Merge Salesforce nexus user info (post-SSO) into the membership eligibility
// draft stored in sessionStorage so the SCAQ candidate flow can auto-verify.
// ----------------------------------------------------------------------

export const MEMBERSHIP_ELIGIBILITY_FLOW_KEY = 'membershipEligibilityFlow';

/** Where to send the user after SSO when returnTo was lost on the IdP redirect. */
export const POST_OAUTH_RETURN_TO_KEY = 'postOAuthReturnTo';

/** Set when user chose SCAQ associate opt-in Yes and was sent to Salesforce SSO. */
export const SCAQ_SSO_VERIFICATION_PENDING_KEY = 'scaqSsoVerificationPending';

/** Paid signup form draft (used by simple-sign-up-view). */
export const MEMBERSHIP_SIGNUP_DRAFT_FORM_KEY = 'membershipSignupDraftForm';

function suggestUsernameFromEmail(email) {
  const local = String(email || '').split('@')[0] || '';
  const sanitized = local.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20);
  if (!sanitized) return 'user1';
  return /[a-z]/.test(sanitized) && /\d/.test(sanitized) ? sanitized : `${sanitized}1`;
}

/**
 * Build signup form values from Salesforce / OAuth profile (no password).
 * @param {Record<string, unknown>} profile
 */
export function buildSignupPrefillFromOAuthProfile(profile = {}) {
  const salesforce = profile.salesforce && typeof profile.salesforce === 'object' ? profile.salesforce : null;
  const salesforceUsername = String(salesforce?.username || '').trim();
  const emailFromSalesforce =
    salesforceUsername.includes('@') ? salesforceUsername : '';
  const email = String(profile.email || emailFromSalesforce).trim();
  const firstName = String(
    profile.firstName || profile.firstname || profile.given_name || ''
  ).trim();
  const lastName = String(
    profile.lastName || profile.lastname || profile.family_name || ''
  ).trim();

  return {
    username: String(profile.username || '').trim() || suggestUsernameFromEmail(email),
    firstName: firstName || 'User',
    lastName: lastName || (email ? email.split('@')[0] : 'Member'),
    email,
    contactNumber: String(profile.contactNumber || profile.phoneNumber || '').trim(),
    password: '',
  };
}

/**
 * Before SCAQ reject logout: save SSO profile + membership flow for paid signup autofill.
 * @param {Record<string, unknown>} profile
 */
export function persistPaidSignupPrefillAfterScaqReject(profile = {}) {
  const values = buildSignupPrefillFromOAuthProfile(profile);
  let membershipFlow = null;

  try {
    const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      membershipFlow = parsed?.flow || null;
    }
  } catch {
    // ignore
  }

  try {
    sessionStorage.setItem(
      MEMBERSHIP_SIGNUP_DRAFT_FORM_KEY,
      JSON.stringify({
        membershipOutcome: 'paid-signup',
        values,
        flow: membershipFlow,
        salesforce: profile.salesforce || null,
        prefillSource: 'scaq-sso-rejected',
      }),
    );
  } catch {
    // ignore
  }
}

/** Remove membership eligibility draft + post-SSO return path from sessionStorage. */
export function clearMembershipEligibilitySessionStorage() {
  try {
    sessionStorage.removeItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    sessionStorage.removeItem(POST_OAUTH_RETURN_TO_KEY);
    sessionStorage.removeItem(SCAQ_SSO_VERIFICATION_PENDING_KEY);
  } catch {
    // ignore quota / private mode errors
  }
}

/**
 * Modal closed — clear draft but keep SCAQ SSO flag until callback finishes
 * (user may already be on Salesforce after choosing Associate opt-in Yes).
 */
export function clearMembershipEligibilityDraftOnModalClose() {
  try {
    sessionStorage.removeItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    sessionStorage.removeItem(POST_OAUTH_RETURN_TO_KEY);
  } catch {
    // ignore
  }
}

export function setScaqSsoVerificationPending() {
  try {
    sessionStorage.setItem(SCAQ_SSO_VERIFICATION_PENDING_KEY, 'true');
  } catch {
    // ignore
  }
}

export function isScaqSsoVerificationPending() {
  try {
    return sessionStorage.getItem(SCAQ_SSO_VERIFICATION_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * True when this SSO round-trip is for SCAQ associate opt-in verification
 * (not a generic Salesforce login from the sign-in page).
 * @param {URLSearchParams | null | undefined} [searchParams]
 */
export function isScaqMembershipSsoFlow(searchParams) {
  if (isScaqSsoVerificationPending()) return true;
  const outcome = searchParams?.get?.('membershipOutcome');
  if (outcome === 'scaq-sso-verify') return true;
  try {
    const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.flow?.eligibilityType === 'scaq-candidate';
  } catch {
    return false;
  }
}

/**
 * After SCAQ associate opt-in SSO, decide what to do with the login session.
 * In SCAQ flow: login is allowed ONLY when Salesforce confirms isSCAQCandidate === true.
 * @param {boolean | null} isSCAQCandidate
 * @param {boolean | null} isAssociateMember
 * @param {URLSearchParams | null | undefined} [searchParams]
 * @returns {'allow-login' | 'promote-associate' | 'reject-paid-signup' | null}
 */
export function resolveScaqPostLoginDecision(isSCAQCandidate, isAssociateMember, searchParams) {
  if (!isScaqMembershipSsoFlow(searchParams)) return null;

  // Not a verified SCAQ candidate → no platform login; paid signup (SGD 900) only.
  if (isSCAQCandidate !== true) {
    return 'reject-paid-signup';
  }

  if (isAssociateMember === true) return 'allow-login';
  if (isAssociateMember === false) return 'promote-associate';

  // SCAQ confirmed but associate flag missing — treat as needs promotion.
  return 'promote-associate';
}

/**
 * @param {URLSearchParams} searchParams
 */
export function readSalesforceFlagsFromCallbackParams(searchParams) {
  return {
    isSCAQCandidate: parseOAuthBoolParam(searchParams.get('isSCAQCandidate')),
    isAssociateMember: parseOAuthBoolParam(searchParams.get('isAssociateMember')),
    accountId: (searchParams.get('salesforceAccountId') || '').trim(),
    accountType: (searchParams.get('salesforceAccountType') || '').trim(),
    memberClass: (searchParams.get('salesforceMemberClass') || '').trim(),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} user
 */
/**
 * Save SCAQ draft + return OAuth start URL (with returnTo) for associate opt-in SSO.
 * @param {Record<string, unknown>} flow
 * @param {string} returnPath — pathname + search, e.g. /learning/courses
 * @param {string} oauthStartPath — e.g. paths.auth.oauth.start
 */
export function buildScaqAssociateOptInOAuthStartUrl(flow, returnPath, oauthStartPath) {
  setScaqSsoVerificationPending();
  sessionStorage.setItem(
    MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
    JSON.stringify({
      membershipOutcome: 'scaq-sso-verify',
      flow,
      savedAt: new Date().toISOString(),
    }),
  );
  sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, returnPath);
  const returnTo = encodeURIComponent(returnPath);
  return `${oauthStartPath}?returnTo=${returnTo}&membershipOutcome=${encodeURIComponent('scaq-sso-verify')}`;
}

export function readSalesforceFlagsFromSessionUser(user) {
  const nested = user?.salesforce;
  if (!nested || typeof nested !== 'object') {
    return {
      isSCAQCandidate: null,
      isAssociateMember: null,
      accountId: '',
      accountType: '',
      memberClass: '',
    };
  }
  return {
    isSCAQCandidate:
      typeof nested.isSCAQCandidate === 'boolean'
        ? nested.isSCAQCandidate
        : parseOAuthBoolParam(nested.isSCAQCandidate),
    isAssociateMember:
      typeof nested.isAssociateMember === 'boolean'
        ? nested.isAssociateMember
        : parseOAuthBoolParam(nested.isAssociateMember),
    accountId: nested.accountId != null ? String(nested.accountId) : '',
    accountType: nested.accountType != null ? String(nested.accountType) : '',
    memberClass: nested.memberClass != null ? String(nested.memberClass) : '',
  };
}

/**
 * @param {string | null | undefined} value
 * @returns {boolean | null}
 */
export function parseOAuthBoolParam(value) {
  if (value === null || value === undefined || value === '') return null;
  const v = String(value).toLowerCase().trim();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} sf
 * @returns {{ merged: boolean, reason?: string }}
 */
export function mergeSalesforceIntoMembershipEligibilityDraft(sf) {
  if (!sf || typeof sf !== 'object') {
    return { merged: false, reason: 'no salesforce payload' };
  }

  const isSCAQCandidate =
    typeof sf.isSCAQCandidate === 'boolean' ? sf.isSCAQCandidate : parseOAuthBoolParam(sf.isSCAQCandidate);
  const isAssociateMember =
    typeof sf.isAssociateMember === 'boolean'
      ? sf.isAssociateMember
      : parseOAuthBoolParam(sf.isAssociateMember);

  const accountType = sf.accountType != null ? String(sf.accountType).trim() : '';
  const accountId =
    sf.accountId != null ? String(sf.accountId).trim() : sf.accountID != null ? String(sf.accountID).trim() : '';
  const memberClass = sf.memberClass != null ? String(sf.memberClass).trim() : '';
  const username = sf.username != null ? String(sf.username).trim() : '';

  const hasAnySignal =
    isSCAQCandidate !== null
    || isAssociateMember !== null
    || Boolean(accountType)
    || Boolean(accountId)
    || Boolean(memberClass)
    || Boolean(username);

  if (!hasAnySignal) {
    return { merged: false, reason: 'empty salesforce sync payload' };
  }

  try {
    const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    if (!raw) {
      return { merged: false, reason: 'no membership draft in session' };
    }

    const parsed = JSON.parse(raw);
    const flow = parsed?.flow;
    if (!flow || typeof flow !== 'object') {
      return { merged: false, reason: 'invalid draft shape' };
    }
    if (flow.eligibilityType !== 'scaq-candidate') {
      return { merged: false, reason: 'draft is not SCAQ candidate pathway' };
    }

    const salesforceMembership = {
      ...(typeof flow.salesforceMembership === 'object' && flow.salesforceMembership !== null
        ? flow.salesforceMembership
        : {}),
      ...(accountType ? { accountType } : {}),
      ...(accountId ? { accountId } : {}),
      ...(memberClass ? { memberClass } : {}),
      ...(username ? { username } : {}),
      ...(isSCAQCandidate !== null ? { isSCAQCandidate } : {}),
      ...(isAssociateMember !== null ? { isAssociateMember } : {}),
      syncedAt: new Date().toISOString(),
    };

    const nextFlow = { ...flow, salesforceMembership };

    if (isSCAQCandidate === true) {
      nextFlow.scaqAssociateOptIn = true;
      nextFlow.scaqCandidateVerified = true;
      if (isAssociateMember === false) {
        nextFlow.associateMemberAlready = false;
      }
    } else if (isSCAQCandidate === false) {
      nextFlow.scaqAssociateOptIn = true;
      nextFlow.scaqCandidateVerified = false;
    }

    if (isAssociateMember === true) {
      nextFlow.scaqAssociateOptIn = true;
      nextFlow.associateMemberAlready = true;
    } else if (isAssociateMember === false && isSCAQCandidate !== true) {
      nextFlow.associateMemberAlready = false;
    }

    sessionStorage.setItem(
      MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
      JSON.stringify({
        ...parsed,
        flow: nextFlow,
        membershipOutcome: parsed.membershipOutcome || 'scaq-salesforce-sync',
        savedAt: new Date().toISOString(),
      }),
    );

    return { merged: true };
  } catch (e) {
    return { merged: false, reason: e instanceof Error ? e.message : 'parse error' };
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} user — session user from /auth/oauth/exchange
 * @returns {{ merged: boolean, reason?: string }}
 */
export function mergeSalesforceFromExchangeUser(user) {
  if (!user || typeof user !== 'object') return { merged: false, reason: 'no user' };
  const nested = user.salesforce;
  if (!nested || typeof nested !== 'object') return { merged: false, reason: 'no user.salesforce' };
  return mergeSalesforceIntoMembershipEligibilityDraft({
    isSCAQCandidate: nested.isSCAQCandidate,
    isAssociateMember: nested.isAssociateMember,
    accountType: nested.accountType,
    accountId: nested.accountId,
    memberClass: nested.memberClass,
    username: nested.username,
  });
}

/**
 * Read Salesforce fields from the SPA OAuth callback query string and merge into the draft.
 * @param {URLSearchParams} searchParams
 * @returns {{ merged: boolean, reason?: string }}
 */
export function mergeSalesforceFromOAuthCallbackSearchParams(searchParams) {
  const isSCAQCandidate = parseOAuthBoolParam(searchParams.get('isSCAQCandidate'));
  const isAssociateMember = parseOAuthBoolParam(searchParams.get('isAssociateMember'));
  const accountType = (searchParams.get('salesforceAccountType') || '').trim();
  const accountId = (searchParams.get('salesforceAccountId') || '').trim();
  const memberClass = (searchParams.get('salesforceMemberClass') || '').trim();

  const hasAnySignal =
    isSCAQCandidate !== null
    || isAssociateMember !== null
    || Boolean(accountType)
    || Boolean(accountId)
    || Boolean(memberClass);

  if (!hasAnySignal) {
    return { merged: false, reason: 'no salesforce fields in callback URL' };
  }

  return mergeSalesforceIntoMembershipEligibilityDraft({
    isSCAQCandidate,
    isAssociateMember,
    accountType: accountType || undefined,
    accountId: accountId || undefined,
    memberClass: memberClass || undefined,
    username: undefined,
  });
}
