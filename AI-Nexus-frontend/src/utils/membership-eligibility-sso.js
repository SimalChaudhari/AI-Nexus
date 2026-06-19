// ----------------------------------------------------------------------
// Merge Salesforce nexus user info (post-SSO) into the membership eligibility
// draft stored in sessionStorage so the SCAQ candidate flow can auto-verify.
// ----------------------------------------------------------------------

import {
  persistMembershipApplicationPathway,
  MEMBERSHIP_APPLICATION_PATHWAY,
} from 'src/utils/membership-application-pathway';
import {
  clearMembershipApplicationPending,
  saveMembershipApplicationCourseReturn,
  setStudentMembershipApplicationPending,
} from 'src/utils/membership-salesforce-session';
import { applyStudentMembershipEmailPrefillFromEligibilityFlow } from 'src/utils/student-membership-application-form';
import { paths } from 'src/routes/paths';

export const MEMBERSHIP_ELIGIBILITY_FLOW_KEY = 'membershipEligibilityFlow';
export const ISCA_MEMBER_SSO_CHECK_PENDING_KEY = 'iscaMemberSsoCheckPending';
export const RESUME_MEMBERSHIP_SIGNUP_QUERY = 'resumeMembershipSignup';

/** Where to send the user after SSO when returnTo was lost on the IdP redirect. */
export const POST_OAUTH_RETURN_TO_KEY = 'postOAuthReturnTo';

/** Set when user chose SCAQ associate opt-in Yes and was sent to Salesforce SSO. */
export const SCAQ_SSO_VERIFICATION_PENDING_KEY = 'scaqSsoVerificationPending';

/** Paid signup form draft (used by simple-sign-up-view). */
export const MEMBERSHIP_SIGNUP_DRAFT_FORM_KEY = 'membershipSignupDraftForm';

/** Outcomes that reopen the fee-waiver result from Sign in → Sign up only. */
export const FEE_WAIVER_RESUME_MEMBERSHIP_OUTCOMES = [
  'corporate-fee-waiver-signup',
  'fee-waiver-signup',
  'student-fee-waiver',
  'verified-nric-signup',
];

/** Modal outcomes that open the free individual sign-up form (not paid checkout). */
export const FEE_WAIVER_FREE_SIGNUP_OUTCOMES = [
  'fee-waiver-signup',
  'corporate-fee-waiver-signup',
  'verified-nric-signup',
];

export function isFeeWaiverResumeMembershipOutcome(outcome = '') {
  return FEE_WAIVER_RESUME_MEMBERSHIP_OUTCOMES.includes(String(outcome || '').trim());
}

export function isFeeWaiverFreeSignupOutcome(outcome = '') {
  return FEE_WAIVER_FREE_SIGNUP_OUTCOMES.includes(String(outcome || '').trim());
}

/** Map dialog outcomes to the signup page `membershipOutcome` query value. */
export function resolveSignupPageMembershipOutcome(outcome = '') {
  const normalized = String(outcome || '').trim();
  if (normalized === 'working-paid-signup') return 'paid-signup';
  if (isFeeWaiverFreeSignupOutcome(normalized)) return 'fee-waiver-signup';
  return normalized;
}

function buildFeeWaiverResumeFlow(flow = {}) {
  return {
    ...flow,
    feeWaiverApplicationChoice: true,
    initialQuestionnaireSubmitted: flow.initialQuestionnaireSubmitted ?? true,
    signupEntrySource: flow.signupEntrySource || 'auth-sign-up',
  };
}

/** Read fee-waiver result stored for Sign up resume (auth sign-in entry only). */
export function readStoredFeeWaiverSignupFlow() {
  try {
    const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isFeeWaiverResumeMembershipOutcome(parsed?.membershipOutcome)) return null;
    if (parsed?.resumeMembershipSignup !== true) return null;
    const storedFlow = parsed?.flow;
    if (!storedFlow || typeof storedFlow !== 'object') return null;
    return {
      parsed,
      flow: buildFeeWaiverResumeFlow(storedFlow),
    };
  } catch {
    return null;
  }
}

/**
 * Persist fee-waiver result so Sign in → Sign up reopens this step (not home eligibility).
 * @param {Record<string, unknown>} flow
 * @param {string} membershipOutcome
 */
export function persistFeeWaiverResultForResume(flow = {}, membershipOutcome = 'corporate-fee-waiver-signup') {
  const resumeFlow = buildFeeWaiverResumeFlow(flow);
  const outcome = String(membershipOutcome || 'corporate-fee-waiver-signup').trim();

  if (isFeeWaiverFreeSignupOutcome(outcome)) {
    persistFeeWaiverSignupPrefill(resumeFlow, '', outcome);
  }
  if (outcome === 'student-fee-waiver') {
    try {
      applyStudentMembershipEmailPrefillFromEligibilityFlow(resumeFlow);
    } catch {
      // ignore
    }
  }

  try {
    sessionStorage.setItem(
      MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
      JSON.stringify({
        membershipOutcome: outcome,
        flow: resumeFlow,
        resumeMembershipSignup: true,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // ignore
  }

  return resumeFlow;
}

/** Build URL for the paid programme sign-up page. */
export function buildPaidMembershipSignupUrl(returnPath = '') {
  const safeReturnPath = String(returnPath || paths.home).trim() || paths.home;
  const returnTo = encodeURIComponent(safeReturnPath);
  return `${paths.auth.simple.signUp}?returnTo=${returnTo}&membershipOutcome=paid-signup`;
}

/** Build URL for the free fee-waiver individual sign-up page. */
export function buildFreeFeeWaiverSignupUrl(returnPath = '') {
  const safeReturnPath = String(returnPath || paths.home).trim() || paths.home;
  const returnTo = encodeURIComponent(safeReturnPath);
  return `${paths.auth.simple.signUp}?returnTo=${returnTo}&membershipOutcome=fee-waiver-signup`;
}

/** Navigate directly to paid sign-up (fee waiver declined). */
export function navigateToPaidMembershipSignup(navigate, returnPath = '') {
  navigate(buildPaidMembershipSignupUrl(returnPath));
}

/** Navigate directly to free fee-waiver sign-up. */
export function navigateToFreeFeeWaiverSignup(navigate, returnPath = '') {
  navigate(buildFreeFeeWaiverSignupUrl(returnPath));
}

/**
 * Persist fee-waiver signup context after NRIC / company-reference eligibility.
 * @param {Record<string, unknown>} flow
 * @param {string} [signupAccessToken]
 */
export function persistFeeWaiverSignupPrefill(
  flow = {},
  signupAccessToken = '',
  membershipOutcome = 'fee-waiver-signup'
) {
  const resolvedOutcome = resolveSignupPageMembershipOutcome(membershipOutcome);
  const isCorporate = flow.companyRegistrationUnderCompany === true;
  const isSgPrIndividualNric =
    flow.isIscaMember === false
    && flow.isSingaporePr === true
    && flow.companyRegistrationUnderCompany === false;
  const educationalBackground = String(flow.workingEducationalBackground || '').trim();
  const educationalBackgroundLabel =
    educationalBackground === 'accounting'
      ? 'Accounting graduate'
      : educationalBackground === 'non-accounting'
        ? 'Non-accounting graduate'
        : educationalBackground;

  try {
    sessionStorage.setItem(
      MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
      JSON.stringify({
        membershipOutcome: resolvedOutcome,
        flow,
        savedAt: new Date().toISOString(),
      })
    );
    sessionStorage.setItem(
      MEMBERSHIP_SIGNUP_DRAFT_FORM_KEY,
      JSON.stringify({
        membershipOutcome: resolvedOutcome,
        prefillSource: isCorporate
          ? 'corporate-reference'
          : isSgPrIndividualNric
            ? 'sg-pr-individual-nric'
            : 'sg-pr-nric',
        signupAccessToken: String(signupAccessToken || '').trim(),
        flow,
        values: {
          companyName: isCorporate ? String(flow.companyVerifiedName || '').trim() : '',
          company: isCorporate ? String(flow.companyVerifiedName || '').trim() : '',
          industry: isCorporate ? String(flow.companyVerifiedIndustry || '').trim() : '',
          companyReferenceId: isCorporate ? String(flow.companyReferenceId || '').trim() : '',
          designation: '',
          educationalBackground: educationalBackgroundLabel,
          nricFin: String(flow.verifiedNricFin || '').trim(),
        },
      })
    );
  } catch {
    // ignore
  }
}

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
    sessionStorage.removeItem(ISCA_MEMBER_SSO_CHECK_PENDING_KEY);
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
    sessionStorage.removeItem(ISCA_MEMBER_SSO_CHECK_PENDING_KEY);
    clearMembershipApplicationPending();
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
    membershipStatus: (searchParams.get('salesforceMembershipStatus') || '').trim(),
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

/**
 * After promote-associate API, merge refreshed Salesforce flags into session user.
 * @param {Record<string, unknown>} salesforce
 */
export function mergeSalesforceFlagsIntoSessionUser(salesforce) {
  if (!salesforce || typeof salesforce !== 'object') return;
  try {
    const raw = sessionStorage.getItem('user');
    if (!raw) return;
    const user = JSON.parse(raw);
    user.salesforce = {
      ...(user.salesforce && typeof user.salesforce === 'object' ? user.salesforce : {}),
      ...salesforce,
    };
    sessionStorage.setItem('user', JSON.stringify(user));
  } catch {
    // ignore
  }
}

/**
 * Read SCAQ flags from OAuth callback URL and/or session user (after SSO).
 * @param {URLSearchParams} searchParams
 */
export function readScaqFlagsFromOAuthCallback(searchParams) {
  const fromQuery = readSalesforceFlagsFromCallbackParams(searchParams);
  if (fromQuery.isSCAQCandidate !== null || fromQuery.isAssociateMember !== null) {
    return fromQuery;
  }
  try {
    const raw = sessionStorage.getItem('user');
    if (!raw) return fromQuery;
    return readSalesforceFlagsFromSessionUser(JSON.parse(raw));
  } catch {
    return fromQuery;
  }
}

/** Paid signup only when Salesforce did not confirm SCAQ candidate. */
export function shouldScaqRejectToPaidSignup(isSCAQCandidate) {
  return isSCAQCandidate !== true;
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
      membershipStatus: '',
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
    membershipStatus: nested.membershipStatus != null ? String(nested.membershipStatus) : '',
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

/** Send guests to sign-in (membership modal is only opened from home Get Started). */
export function navigateGuestToSignIn(navigate, returnPath) {
  const safeReturnPath = String(returnPath || paths.home).trim() || paths.home;
  const returnTo = encodeURIComponent(safeReturnPath);
  navigate(`${paths.auth.simple.signIn}?returnTo=${returnTo}`);
}

/**
 * Navigate after the membership eligibility dialog completes (home Get Started CTA).
 */
export function continueMembershipSignupDialog({ navigate, returnPath, authenticated, payload }) {
  const rawOutcome = payload?.result?.outcome || '';
  const outcome = resolveSignupPageMembershipOutcome(rawOutcome);
  const actionTarget = payload?.result?.actionTarget || '';
  const applicationPathway =
    payload?.result?.applicationPathway
    || payload?.flow?.applicationPathway
    || (payload?.flow?.homeSelectedPathway === 'experienced' || payload?.flow?.eligibilityType === 'experienced'
      ? MEMBERSHIP_APPLICATION_PATHWAY.EXPERIENCED
      : '');
  const signupAccessToken = payload?.signupAccessToken || '';
  const isScaqCandidateFlow = payload?.flow?.eligibilityType === 'scaq-candidate';
  const safeReturnPath = String(returnPath || paths.home).trim() || paths.home;

  if (actionTarget === 'close') {
    return;
  }

  if (actionTarget === 'student-application') {
    try {
      saveMembershipApplicationCourseReturn(safeReturnPath);
      if (payload?.resumeFeeWaiverOnSignUp && payload?.flow) {
        persistFeeWaiverResultForResume(payload.flow, outcome || 'student-fee-waiver');
      } else {
        applyStudentMembershipEmailPrefillFromEligibilityFlow(payload?.flow || {});
      }
    } catch {
      // ignore
    }
    navigate(paths.auth.membership.studentApplication);
    return;
  }

  if (actionTarget === 'scaq-salesforce-auto' && payload?.flow) {
    navigate(buildScaqAssociateOptInOAuthStartUrl(payload.flow, safeReturnPath, paths.auth.oauth.start));
    return;
  }

  if (actionTarget === 'signUp' && isFeeWaiverFreeSignupOutcome(rawOutcome) && payload?.flow) {
    try {
      if (payload?.resumeFeeWaiverOnSignUp) {
        persistFeeWaiverResultForResume(payload.flow, rawOutcome);
      } else {
        persistFeeWaiverSignupPrefill(payload.flow, signupAccessToken, rawOutcome);
      }
    } catch {
      // ignore
    }
  }

  if ((actionTarget === 'signUp' || isScaqCandidateFlow) && payload?.flow) {
    try {
      const keepFeeWaiverResume = Boolean(payload?.resumeFeeWaiverOnSignUp)
        && isFeeWaiverResumeMembershipOutcome(rawOutcome);
      sessionStorage.setItem(
        MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
        JSON.stringify({
          membershipOutcome: outcome,
          flow: keepFeeWaiverResume ? buildFeeWaiverResumeFlow(payload.flow) : payload.flow,
          ...(keepFeeWaiverResume ? { resumeMembershipSignup: true } : {}),
          savedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }
  }

  if (outcome === 'membership-application' && applicationPathway) {
    persistMembershipApplicationPathway(applicationPathway);
  }

  if (actionTarget === 'salesforce' || actionTarget === 'student-salesforce') {
    try {
      sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, safeReturnPath);
      if (outcome === 'isca-member-sso-check') {
        sessionStorage.setItem(ISCA_MEMBER_SSO_CHECK_PENDING_KEY, 'true');
      } else {
        sessionStorage.removeItem(ISCA_MEMBER_SSO_CHECK_PENDING_KEY);
      }
      if (actionTarget === 'student-salesforce') {
        setStudentMembershipApplicationPending();
        saveMembershipApplicationCourseReturn(safeReturnPath);
      } else if (outcome === 'membership-application') {
        setMembershipApplicationPending();
        saveMembershipApplicationCourseReturn(safeReturnPath);
      } else if (payload?.flow?.eligibilityType !== 'recognition') {
        clearMembershipApplicationPending();
      }
    } catch {
      // ignore
    }
  }

  if (isScaqCandidateFlow && authenticated) {
    navigate(safeReturnPath);
    return;
  }

  const returnTo = encodeURIComponent(safeReturnPath);
  const membershipOutcome = encodeURIComponent(outcome);
  const targetPath =
    actionTarget === 'signUp'
      ? paths.auth.simple.signUp
      : actionTarget === 'salesforce' || actionTarget === 'student-salesforce'
        ? paths.auth.oauth.start
        : paths.auth.simple.signIn;
  const eligibilityType =
    actionTarget === 'student-salesforce'
      ? '&eligibilityType=student'
      : outcome === 'membership-application' && applicationPathway === MEMBERSHIP_APPLICATION_PATHWAY.EXPERIENCED
        ? '&eligibilityType=experienced'
        : outcome === 'membership-application'
          ? '&eligibilityType=recognition'
          : '';
  const extra = `${actionTarget === 'scaq' ? '&membershipAction=scaq' : ''}${signupAccessToken ? `&signupAccessToken=${encodeURIComponent(signupAccessToken)}` : ''}${eligibilityType}`;
  navigate(`${targetPath}?returnTo=${returnTo}&membershipOutcome=${membershipOutcome}${extra}`);
}

function isYesYesYesQuestionnaireFlow(flow = {}) {
  return (
    flow.isIscaMember === true
    && flow.isSingaporePr === true
    && flow.companyRegistrationUnderCompany === true
  );
}

function isYesYesNoQuestionnaireFlow(flow = {}) {
  return (
    flow.isIscaMember === true
    && flow.isSingaporePr === true
    && flow.companyRegistrationUnderCompany === false
  );
}

function isYesNoNoQuestionnaireFlow(flow = {}) {
  return (
    flow.isIscaMember === true
    && flow.isSingaporePr === false
    && flow.companyRegistrationUnderCompany === false
  );
}

function isYesNoYesQuestionnaireFlow(flow = {}) {
  return (
    flow.isIscaMember === true
    && flow.isSingaporePr === false
    && flow.companyRegistrationUnderCompany === true
  );
}

/** Yes/Yes/Yes + eServices SSO succeeded as ISCA member — do not reopen modal. */
export function isYesYesYesEservicesMemberVerified(flow = {}) {
  return (
    flow.isIscaMember === true
    && flow.isSingaporePr === true
    && flow.companyRegistrationUnderCompany === true
    && flow.eServicesLoginCompleted === true
    && flow.iscaMemberVerificationPassed === true
  );
}

/** Yes/Yes/Yes + eServices SSO but not ISCA member — reopen No/Yes/Yes NRIC modal. */
export function isYesYesYesEservicesMemberFallback(flow = {}) {
  if (flow.iscaMemberEservicesFallback === true) return true;
  return (
    flow.initialQuestionnaireSubmitted === true
    && flow.isSingaporePr === true
    && flow.companyRegistrationUnderCompany === true
    && flow.eServicesLoginCompleted === true
    && flow.isIscaMember === false
    && flow.iscaMemberVerificationPassed === false
  );
}

/** Yes/Yes/No or Yes/No/No + eServices SSO but not ISCA member — reopen the matching No-path modal. */
export function isQuestionnaireEservicesMemberFallback(flow = {}) {
  if (isYesYesYesEservicesMemberFallback(flow)) return true;
  if (flow.iscaMemberEservicesFallback === true) {
    return (
      (flow.isSingaporePr === true && flow.companyRegistrationUnderCompany === false)
      || (flow.isSingaporePr === false && flow.companyRegistrationUnderCompany === false)
      || (flow.isSingaporePr === true && flow.companyRegistrationUnderCompany === true)
      || (flow.isSingaporePr === false && flow.companyRegistrationUnderCompany === true)
    );
  }
  return (
    flow.initialQuestionnaireSubmitted === true
    && flow.eServicesLoginCompleted === true
    && flow.isIscaMember === false
    && flow.iscaMemberVerificationPassed === false
    && (
      (flow.isSingaporePr === true && flow.companyRegistrationUnderCompany === false)
      || (flow.isSingaporePr === false && flow.companyRegistrationUnderCompany === false)
      || (flow.isSingaporePr === false && flow.companyRegistrationUnderCompany === true)
    )
  );
}

export function buildResumeMembershipSignupReturnUrl(path = '') {
  const base = String(path || paths.home).trim() || paths.home;
  if (typeof window !== 'undefined') {
    try {
      const url = new URL(base, window.location.origin);
      url.searchParams.set(RESUME_MEMBERSHIP_SIGNUP_QUERY, '1');
      url.searchParams.set('membershipNotEligible', '1');
      const search = url.searchParams.toString();
      return `${url.pathname}${search ? `?${search}` : ''}`;
    } catch {
      // fall through
    }
  }
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${RESUME_MEMBERSHIP_SIGNUP_QUERY}=1&membershipNotEligible=1`;
}

export function isQuestionnaireEservicesResumeOutcome(outcome = '') {
  const normalized = String(outcome || '').trim();
  return normalized === 'isca-member-eservices-login' || normalized === 'isca-member-sso-check';
}

/** Load questionnaire flow resumed after eServices member check (success fallback or retry). */
export function readQuestionnaireEservicesResumeFlow() {
  const resumed = readResumedMembershipEligibilityFlow();
  if (!resumed?.flow) return null;
  if (
    isQuestionnaireEservicesMemberFallback(resumed.flow)
    || isYesYesYesEservicesMemberFallback(resumed.flow)
    || isQuestionnaireEservicesResumeOutcome(resumed.parsed?.membershipOutcome)
  ) {
    return resumed;
  }
  return null;
}

/** Remove resume query params so the eligibility modal does not auto-reopen. */
export function stripResumeMembershipSignupFromPath(path = '') {
  const raw = String(path || paths.home).trim() || paths.home;
  if (typeof window === 'undefined') {
    return raw.split('?')[0] || paths.home;
  }
  try {
    const url = new URL(raw, window.location.origin);
    url.searchParams.delete(RESUME_MEMBERSHIP_SIGNUP_QUERY);
    url.searchParams.delete('membershipNotEligible');
    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ''}`;
  } catch {
    return raw.split('?')[0] || paths.home;
  }
}

export function shouldOpenResumedMembershipSignupModal() {
  const resumed = readResumedMembershipEligibilityFlow() || readStoredFeeWaiverSignupFlow();
  if (!resumed?.flow) return false;
  if (isYesYesYesEservicesMemberVerified(resumed.flow)) return false;
  if (isQuestionnaireEservicesMemberFallback(resumed.flow)) return true;
  return true;
}

export function readResumedMembershipEligibilityFlow() {
  try {
    const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.resumeMembershipSignup !== true) return null;
    const storedFlow = parsed?.flow;
    if (!storedFlow || typeof storedFlow !== 'object') return null;
    return {
      parsed,
      flow: storedFlow,
    };
  } catch {
    return null;
  }
}

export function clearResumeMembershipSignupFlag() {
  try {
    const resumed = readResumedMembershipEligibilityFlow();
    if (!resumed) return;
    sessionStorage.setItem(
      MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
      JSON.stringify({
        ...resumed.parsed,
        resumeMembershipSignup: false,
      })
    );
  } catch {
    // ignore
  }
}

export function persistMembershipEligibilityFlowForResume(flow, membershipOutcome = '') {
  try {
    sessionStorage.setItem(
      MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
      JSON.stringify({
        membershipOutcome,
        flow,
        resumeMembershipSignup: true,
        savedAt: new Date().toISOString(),
      })
    );
  } catch {
    // ignore
  }
}

/** After eServices SSO, ISCA member verified — continue Yes/* questionnaire to result. */
export function applyIscaMemberQuestionnaireSuccessToStoredFlow() {
  try {
    const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const flow = parsed?.flow;
    if (!flow || typeof flow !== 'object') return null;

    const updatedFlow = {
      ...flow,
      eServicesLoginCompleted: true,
      iscaMemberVerificationPassed: true,
    };

    sessionStorage.setItem(
      MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
      JSON.stringify({
        ...parsed,
        flow: updatedFlow,
        resumeMembershipSignup: true,
        savedAt: new Date().toISOString(),
      })
    );
    return updatedFlow;
  } catch {
    return null;
  }
}

/**
 * Yes / Yes / Yes questionnaire: ISCA member not verified after eServices SSO.
 * Fall through to the No / Yes / Yes (SG-PR under company) NRIC flow.
 */
function canResumeEservicesMemberFallback(flow = {}) {
  if (isYesYesYesQuestionnaireFlow(flow)) return true;
  if (isYesYesYesEservicesMemberFallback(flow)) return true;
  return (
    flow.initialQuestionnaireSubmitted === true
    && flow.isSingaporePr === true
    && flow.companyRegistrationUnderCompany === true
  );
}

function buildNoYesYesFallbackFlow(sourceFlow = {}) {
  const companyWasVerified =
    sourceFlow.companyReferenceVerified === true
    && sourceFlow.companyReferenceConfirmed === true;

  return {
    ...sourceFlow,
    initialQuestionnaireSubmitted: true,
    feeWaiverApplicationChoice: sourceFlow.feeWaiverApplicationChoice ?? true,
    isIscaMember: false,
    isSingaporePr: true,
    companyRegistrationUnderCompany: true,
    eServicesLoginCompleted: true,
    iscaMemberVerificationPassed: false,
    iscaMemberEservicesFallback: true,
    companyReferenceRouteAbandoned: false,
    homeGetStartedFlow: false,
    companyReferenceId: String(sourceFlow.companyReferenceId || '').trim(),
    spPrVerified: null,
    nricUploadAcknowledged: false,
    nricSgPrCheckFailed: false,
    feeWaiverViaCompanyReference: false,
    ...(companyWasVerified
      ? {
          companyReferenceVerified: true,
          companyVerifiedName: sourceFlow.companyVerifiedName || '',
          companyVerifiedIndustry: sourceFlow.companyVerifiedIndustry || '',
          companyReferenceConfirmed: true,
        }
      : {
          companyReferenceVerified: null,
          companyVerifiedName: '',
          companyVerifiedIndustry: '',
          companyReferenceConfirmed: null,
        }),
  };
}

function buildNoYesNoEservicesFallbackFlow(sourceFlow = {}) {
  return {
    ...sourceFlow,
    initialQuestionnaireSubmitted: true,
    feeWaiverApplicationChoice: sourceFlow.feeWaiverApplicationChoice ?? true,
    isIscaMember: false,
    isSingaporePr: true,
    companyRegistrationUnderCompany: false,
    eServicesLoginCompleted: true,
    iscaMemberVerificationPassed: false,
    iscaMemberEservicesFallback: true,
    spPrVerified: null,
    nricUploadAcknowledged: false,
    nricSgPrCheckFailed: false,
    homeGetStartedFlow: false,
  };
}

function buildNoNoNoEservicesFallbackFlow(sourceFlow = {}) {
  return {
    ...sourceFlow,
    initialQuestionnaireSubmitted: true,
    feeWaiverApplicationChoice: sourceFlow.feeWaiverApplicationChoice ?? true,
    isIscaMember: false,
    isSingaporePr: false,
    companyRegistrationUnderCompany: false,
    eServicesLoginCompleted: true,
    iscaMemberVerificationPassed: false,
    iscaMemberEservicesFallback: true,
    registrationPersona: '',
    studentMemberOrAssociate: null,
    studentFinalYearLocal: null,
    studentNonFinalInterested: null,
    workingEducationalBackground: '',
    workingMembershipInterested: null,
    workingNotEligibleChoice: null,
    homeGetStartedFlow: false,
  };
}

function buildNoNoYesEservicesFallbackFlow(sourceFlow = {}) {
  const companyWasVerified =
    sourceFlow.companyReferenceVerified === true
    && sourceFlow.companyReferenceConfirmed === true;

  return {
    ...sourceFlow,
    initialQuestionnaireSubmitted: true,
    feeWaiverApplicationChoice: sourceFlow.feeWaiverApplicationChoice ?? true,
    isIscaMember: false,
    isSingaporePr: false,
    companyRegistrationUnderCompany: true,
    eServicesLoginCompleted: true,
    iscaMemberVerificationPassed: false,
    iscaMemberEservicesFallback: true,
    companyReferenceRouteAbandoned: false,
    homeGetStartedFlow: false,
    companyReferenceId: String(sourceFlow.companyReferenceId || '').trim(),
    ...(companyWasVerified
      ? {
          companyReferenceVerified: true,
          companyVerifiedName: sourceFlow.companyVerifiedName || '',
          companyVerifiedIndustry: sourceFlow.companyVerifiedIndustry || '',
          companyReferenceConfirmed: true,
        }
      : {
          companyReferenceVerified: null,
          companyVerifiedName: '',
          companyVerifiedIndustry: '',
          companyReferenceConfirmed: null,
        }),
  };
}

function buildEservicesMemberFailureFlow(sourceFlow = {}) {
  return resolveQuestionnaireEservicesFailureFlow(sourceFlow);
}

/** Map Yes/* ISCA-member questionnaire answers to the matching No-path flow after non-member verification. */
export function resolveQuestionnaireEservicesFailureFlow(sourceFlow = {}) {
  const flow = sourceFlow && typeof sourceFlow === 'object' ? sourceFlow : {};

  if (
    flow.eServicesLoginCompleted === true
    && flow.iscaMemberVerificationPassed === false
    && flow.isIscaMember === false
  ) {
    if (flow.isSingaporePr === true && flow.companyRegistrationUnderCompany === false) {
      return buildNoYesNoEservicesFallbackFlow(flow);
    }
    if (flow.isSingaporePr === false && flow.companyRegistrationUnderCompany === false) {
      return buildNoNoNoEservicesFallbackFlow(flow);
    }
    if (flow.isSingaporePr === true && flow.companyRegistrationUnderCompany === true) {
      return buildNoYesYesFallbackFlow(flow);
    }
    if (flow.isSingaporePr === false && flow.companyRegistrationUnderCompany === true) {
      return buildNoNoYesEservicesFallbackFlow(flow);
    }
  }

  if (isYesYesYesQuestionnaireFlow(flow) || canResumeEservicesMemberFallback(flow)) {
    return buildNoYesYesFallbackFlow(flow);
  }
  if (isYesYesNoQuestionnaireFlow(flow)) {
    return buildNoYesNoEservicesFallbackFlow(flow);
  }
  if (isYesNoNoQuestionnaireFlow(flow)) {
    return buildNoNoNoEservicesFallbackFlow(flow);
  }
  if (isYesNoYesQuestionnaireFlow(flow)) {
    return buildNoNoYesEservicesFallbackFlow(flow);
  }

  if (flow.isSingaporePr === true && flow.companyRegistrationUnderCompany === false) {
    return buildNoYesNoEservicesFallbackFlow(flow);
  }
  if (flow.isSingaporePr === false && flow.companyRegistrationUnderCompany === false) {
    return buildNoNoNoEservicesFallbackFlow(flow);
  }
  if (flow.isSingaporePr === false && flow.companyRegistrationUnderCompany === true) {
    return buildNoNoYesEservicesFallbackFlow(flow);
  }
  if (flow.isSingaporePr === true && flow.companyRegistrationUnderCompany === true) {
    return buildNoYesYesFallbackFlow(flow);
  }

  return buildNoYesYesFallbackFlow(flow);
}

export function applyQuestionnaireIscaNonMemberFallback(sourceFlow = {}) {
  return resolveQuestionnaireEservicesFailureFlow(sourceFlow);
}

/** Always resume No/Yes/Yes NRIC modal after eServices ISCA-member check fails. */
export function ensureNoYesYesFlowAfterEservicesFailure() {
  try {
    let parsed = {};
    let sourceFlow = {};
    const raw = sessionStorage.getItem(MEMBERSHIP_ELIGIBILITY_FLOW_KEY);
    if (raw) {
      parsed = JSON.parse(raw);
      if (parsed?.flow && typeof parsed.flow === 'object') {
        sourceFlow = parsed.flow;
      }
    }

    if (
      !canResumeEservicesMemberFallback(sourceFlow)
      && !isYesYesNoQuestionnaireFlow(sourceFlow)
      && !isYesNoNoQuestionnaireFlow(sourceFlow)
      && !isYesNoYesQuestionnaireFlow(sourceFlow)
    ) {
      sourceFlow = {
        ...sourceFlow,
        feeWaiverApplicationChoice: sourceFlow.feeWaiverApplicationChoice ?? true,
        isSingaporePr: sourceFlow.isSingaporePr ?? true,
        companyRegistrationUnderCompany: sourceFlow.companyRegistrationUnderCompany ?? true,
        initialQuestionnaireSubmitted: true,
      };
    }

    const updatedFlow = buildEservicesMemberFailureFlow(sourceFlow);

    sessionStorage.setItem(
      MEMBERSHIP_ELIGIBILITY_FLOW_KEY,
      JSON.stringify({
        ...parsed,
        membershipOutcome: parsed.membershipOutcome || 'isca-member-eservices-login',
        flow: updatedFlow,
        resumeMembershipSignup: true,
        savedAt: new Date().toISOString(),
      })
    );
    return updatedFlow;
  } catch {
    return null;
  }
}

export function applyYesYesYesIscaMemberFailureToStoredFlow() {
  return ensureNoYesYesFlowAfterEservicesFailure();
}

export function isIscaMemberSsoCheckPending(searchParams) {
  const outcome = String(searchParams?.get?.('membershipOutcome') || '').trim();
  if (outcome === 'isca-member-sso-check' || outcome === 'isca-member-eservices-login') return true;
  try {
    return sessionStorage.getItem(ISCA_MEMBER_SSO_CHECK_PENDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function clearIscaMemberSsoCheckPending() {
  try {
    sessionStorage.removeItem(ISCA_MEMBER_SSO_CHECK_PENDING_KEY);
  } catch {
    // ignore
  }
}
