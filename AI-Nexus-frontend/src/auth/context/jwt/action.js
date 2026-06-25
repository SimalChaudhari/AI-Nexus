import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import { resolveFlowisePublicBaseUrl } from 'src/utils/flowise-public-url';
import { clearAuthSession } from './utils';
import { fetchCurrentUser, writeCachedUser } from './session';
import { clearClientSalesforceSessions } from './logout-payload';
import { postLogoutWithIdpBrowserClear, finishLogoutWithIdpBrowserClear, getAppSignInUrl } from './idp-browser-logout';
import { normalizeUserForSession } from 'src/auth/utils/normalize-user-session';
import { mapNricFinUserErrorMessage } from 'src/utils/nric-id-type';

const MEMBERSHIP_DRAFT_USER_ID_KEY = 'membershipDraftUserId';

export const getMembershipSignupDraftUserId = () => {
  try {
    return sessionStorage.getItem(MEMBERSHIP_DRAFT_USER_ID_KEY) || '';
  } catch {
    return '';
  }
};

export const setMembershipSignupDraftUserId = (userId) => {
  const nextUserId = String(userId || '').trim();
  if (!nextUserId) return;
  try {
    sessionStorage.setItem(MEMBERSHIP_DRAFT_USER_ID_KEY, nextUserId);
  } catch {
    // ignore storage errors
  }
};

export const clearMembershipSignupDraftUserId = () => {
  try {
    sessionStorage.removeItem(MEMBERSHIP_DRAFT_USER_ID_KEY);
  } catch {
    // ignore storage errors
  }
};

/** **************************************
 * Sign in with backend API (supports email or username)
 *************************************** */
export const signInWithPassword = async ({ email, username, password }) => {
  try {
    // Use email if provided, otherwise use username
    const identifier = email || username;
    const params = { identifier, password };
    const res = await axios.post('/auth/login', params);
    const { user } = res.data;

    if (!user) {
      throw new Error('Please check your email/username and password');
    }

    const normalizedUser = writeCachedUser(user);
    return { user: normalizedUser };
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Login failed. Please check your credentials.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Sign up with backend API
 *************************************** */
export const signUp = async ({
  email,
  password,
  firstName,
  lastName,
  username,
  companyCode,
  contactNumber,
  signupAccessToken,
  eligibilityData,
}) => {
  try {
    const trimmedContact =
      typeof contactNumber === 'string' && contactNumber.trim() ? contactNumber.trim() : undefined;
    const params = {
      username: username || email.split('@')[0], // Use email prefix as username if not provided
      firstname: firstName,
      lastname: lastName,
      email,
      password,
      companyCode: typeof companyCode === 'string' && companyCode.trim() ? companyCode.trim() : undefined,
      signupAccessToken: signupAccessToken || undefined,
      eligibilityIsSingaporePr: typeof eligibilityData?.isSingaporePr === 'boolean' ? eligibilityData.isSingaporePr : undefined,
      eligibilityIsIscaMember: typeof eligibilityData?.isIscaMember === 'boolean' ? eligibilityData.isIscaMember : undefined,
      eligibilityWantsMembership:
        typeof eligibilityData?.wantsIscaMembership === 'boolean' ? eligibilityData.wantsIscaMembership : undefined,
      eligibilityType: eligibilityData?.eligibilityType || undefined,
      eligibilitySnapshot: eligibilityData?.snapshot || undefined,
      ...(trimmedContact ? { contactNumber: trimmedContact } : {}),
    };
    const res = await axios.post('/auth/register', params);
    const { user, message } = res.data;

    // Store user data in sessionStorage
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(normalizeUserForSession(user)));
    }
    if (signupAccessToken) {
      clearMembershipSignupDraftUserId();
    }

    // Note: Backend register doesn't return access_token, user needs to login after registration
    return { user, message };
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Registration failed. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Save membership signup details as a draft before payment
 *************************************** */
export const saveMembershipSignupDraft = async ({
  email,
  password,
  firstName,
  lastName,
  username,
  companyCode,
  contactNumber,
  signupAccessToken,
  draftUserId,
  eligibilityData,
}) => {
  try {
    const trimmedContact =
      typeof contactNumber === 'string' && contactNumber.trim() ? contactNumber.trim() : undefined;
    const params = {
      username: username || email.split('@')[0],
      firstname: firstName,
      lastname: lastName,
      email,
      password,
      companyCode: typeof companyCode === 'string' && companyCode.trim() ? companyCode.trim() : undefined,
      signupAccessToken: signupAccessToken || undefined,
      draftUserId: draftUserId || undefined,
      eligibilityIsSingaporePr: typeof eligibilityData?.isSingaporePr === 'boolean' ? eligibilityData.isSingaporePr : undefined,
      eligibilityIsIscaMember: typeof eligibilityData?.isIscaMember === 'boolean' ? eligibilityData.isIscaMember : undefined,
      eligibilityWantsMembership:
        typeof eligibilityData?.wantsIscaMembership === 'boolean' ? eligibilityData.wantsIscaMembership : undefined,
      eligibilityType: eligibilityData?.eligibilityType || undefined,
      eligibilitySnapshot: eligibilityData?.snapshot || undefined,
      ...(trimmedContact ? { contactNumber: trimmedContact } : {}),
    };
    const res = await axios.post('/auth/membership-signup-draft', params);
    const nextDraftUserId = res?.data?.draftUserId || res?.data?.user?.id || '';

    if (nextDraftUserId) {
      setMembershipSignupDraftUserId(nextDraftUserId);
    }

    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Could not save membership signup draft.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Validate verified NRIC signup access token
 *************************************** */
export const getVerifiedSignupAccess = async ({ token }) => {
  try {
    const res = await axios.post('/auth/verified-signup-access', { token });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Verified signup access is invalid or expired.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Forgot password - send reset link to email
 *************************************** */
export const forgotPassword = async ({ email }) => {
  try {
    const params = { email };
    const res = await axios.post('/auth/forgot-password', params);
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to send password reset email. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Reset password with token
 *************************************** */
export const resetPassword = async ({ token, password }) => {
  try {
    const params = { token, password };
    const res = await axios.post('/auth/reset-password', params);
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to reset password. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Verify email with token
 *************************************** */
export const verifyEmail = async ({ token }) => {
  try {
    const params = { token };
    const res = await axios.post('/auth/verify-email', params);
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to verify email. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Resend verification email
 *************************************** */
export const resendVerification = async ({ email }) => {
  try {
    const params = { email };
    const res = await axios.post('/auth/resend-verification', params);
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to resend verification email. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Verify NRIC front/back images (membership pre-check)
 *************************************** */
export const verifyNricImages = async ({ frontImage, backImage }) => {
  try {
    const formData = new FormData();
    const draftUserId = getMembershipSignupDraftUserId();
    if (draftUserId) {
      formData.append('userId', draftUserId);
    }
    formData.append('frontImage', frontImage);
    formData.append('backImage', backImage);

    const res = await axios.post('/auth/verify-nric', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (res?.data?.userId) {
      setMembershipSignupDraftUserId(res.data.userId);
    }

    console.log('[NRIC Scan] API response:', res.data);

    return res.data;
  } catch (error) {
    console.log('[NRIC Scan] API error:', error?.response?.data || error?.message || error);
    const apiMessage = error?.response?.data?.message;
    const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage;
    const errorMessage =
      normalizedMessage ||
      error?.message ||
      (typeof error === 'string' ? error : 'NRIC verification failed. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Validate NRIC/FIN checksum only (live field validation)
 *************************************** */
export const validateNricIdentifier = async ({ identifier }) => {
  try {
    const res = await axios.post('/auth/validate-nric', {
      identifier: String(identifier || '').trim(),
    });
    return res.data;
  } catch (error) {
    const rawMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Invalid NRIC/FIN number.');
    throw new Error(mapNricFinUserErrorMessage(rawMessage));
  }
};

/** **************************************
 * Verify NRIC manually via checksum (no image / AI)
 *************************************** */
export const verifyNricManual = async ({
  identifier,
  fullName,
  nameAsPerId,
  firstName,
  lastName,
  nationality,
  idType,
  dateOfBirth,
}) => {
  try {
    const draftUserId = getMembershipSignupDraftUserId();

    const res = await axios.post('/auth/verify-nric-manual', {
      identifier: String(identifier || '').trim(),
      fullName: String(fullName || nameAsPerId || '').trim(),
      nameAsPerId: String(nameAsPerId || fullName || '').trim(),
      firstName: String(firstName || '').trim(),
      lastName: String(lastName || '').trim(),
      nationality: String(nationality || '').trim(),
      idType: String(idType || '').trim(),
      dateOfBirth: String(dateOfBirth || '').trim(),
      userId: draftUserId || undefined,
    });

    if (res?.data?.userId) {
      setMembershipSignupDraftUserId(res.data.userId);
    }

    console.log('[NRIC Manual] API response:', res.data);

    return res.data;
  } catch (error) {
    console.log('[NRIC Manual] API error:', error?.response?.data || error?.message || error);
    const apiMessage = error?.response?.data?.message;
    const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage;
    const errorMessage =
      normalizedMessage ||
      error?.message ||
      (typeof error === 'string' ? error : 'Manual NRIC verification failed. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Verify student academic email + ID card (questionnaire student path)
 *************************************** */
export const verifyStudentAcademicDetails = async ({
  academicEmail,
  personalEmail,
  studentCardImage,
}) => {
  try {
    const formData = new FormData();
    const draftUserId = getMembershipSignupDraftUserId();
    if (draftUserId) {
      formData.append('userId', draftUserId);
    }
    formData.append('academicEmail', String(academicEmail || '').trim());
    if (personalEmail?.trim()) {
      formData.append('personalEmail', String(personalEmail).trim());
    }
    formData.append('studentCardImage', studentCardImage);

    const res = await axios.post('/auth/student-verification/verify-academic-details', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Student verification failed. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Send student verification PIN
 *************************************** */
export const sendStudentVerificationPin = async ({ schoolName, graduationDate, schoolEmail }) => {
  try {
    const res = await axios.post('/auth/student-verification/send-pin', {
      schoolName,
      graduationDate,
      schoolEmail,
    });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to send verification PIN. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Verify student verification PIN
 *************************************** */
export const verifyStudentVerificationPin = async ({ verificationToken, pin, schoolEmail }) => {
  try {
    const res = await axios.post('/auth/student-verification/verify-pin', {
      verificationToken,
      pin,
      schoolEmail,
    });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to verify PIN. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Run student AI eligibility check
 *************************************** */
export const verifyStudentEligibility = async ({ schoolName, graduationDate, schoolEmail }) => {
  try {
    const res = await axios.post('/auth/student-verification/eligibility-check', {
      schoolName,
      graduationDate,
      schoolEmail,
    });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to verify student eligibility. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Experienced pathway: verify resume/CV (PDF or Word) and ATS-style score
 *************************************** */
export const verifyExperiencedResume = async ({ resume }) => {
  try {
    const formData = new FormData();
    formData.append('resume', resume);
    const res = await axios.post('/auth/experienced-pathway/verify-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to verify resume. Please try again.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Fee-waiver audit: HR email verification after free signup
 *************************************** */
export const submitFeeWaiverAuditHrEmail = async ({
  userId,
  learnerEmail,
  learnerName,
  hrEmail,
}) => {
  try {
    const res = await axios.post('/auth/fee-waiver-audit/hr-email', {
      userId: userId || undefined,
      learnerEmail,
      learnerName,
      hrEmail,
    });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Could not send HR verification email.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Fee-waiver audit: verify education certificate after free signup
 *************************************** */
export const submitFeeWaiverAuditCertificate = async ({
  userId,
  learnerEmail,
  certificate,
}) => {
  try {
    const formData = new FormData();
    formData.append('certificate', certificate);
    if (userId) formData.append('userId', userId);
    formData.append('learnerEmail', learnerEmail);
    const res = await axios.post('/auth/fee-waiver-audit/verify-certificate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Could not verify education certificate.');
    throw new Error(errorMessage);
  }
};

/** Complete HR fee-waiver job role verification from email link. */
export const verifyFeeWaiverHrToken = async ({ token }) => {
  try {
    const res = await axios.get('/auth/fee-waiver-audit/verify-hr', {
      params: { token },
    });
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Could not complete HR verification.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * OAuth: get auth URL and redirect to IdP
 *************************************** */
export const getOAuthAuthUrl = async ({ scaqVerify = false, deferredAuth = false } = {}) => {
  const res = await axios.get('/auth/oauth/auth-url', {
    params: {
      ...(scaqVerify ? { scaqVerify: '1' } : {}),
      ...(deferredAuth ? { deferredAuth: '1' } : {}),
    },
  });
  const { authUrl, state } = res.data || {};
  if (!authUrl) throw new Error('Failed to get SSO login URL.');
  return { authUrl, state };
};

/** **************************************
 * Set HttpOnly auth cookies from a deferred OAuth access token.
 *************************************** */
export const establishPlatformSessionFromToken = async (token) => {
  const trimmed = String(token || '').trim();
  if (!trimmed) return false;

  try {
    const res = await axios.post('/auth/establish-session', { token: trimmed }, { skipAuthRefresh: true });
    const user = res.data?.user;
    if (user) {
      writeCachedUser(user);
    } else {
      await fetchCurrentUser();
    }
    return true;
  } catch {
    return false;
  }
};

/** **************************************
 * OAuth: exchange code for our tokens (e.g. when app receives code via callback)
 *************************************** */
export const exchangeOAuthCode = async ({ code, state }) => {
  const res = await axios.post('/auth/oauth/exchange', { code, state });
  const data = res.data || {};
  if (data.scaqProfileOnly) {
    return {
      scaqProfileOnly: true,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      salesforce: data.salesforce,
    };
  }
  const { user, accessToken, isNewUser, socialAccessToken, requiresCitizenshipGap } = data;
  const normalizedUser = normalizeUserForSession(user);
  if (!normalizedUser && !data.scaqProfileOnly) {
    throw new Error(data.message || 'SSO login failed.');
  }
  return {
    user: normalizedUser,
    accessToken,
    isNewUser,
    socialAccessToken,
    requiresCitizenshipGap: requiresCitizenshipGap === true,
  };
};

/** **************************************
 * Membership flow: create Salesforce account before SSO login
 *************************************** */
export const createSalesforceNexusUser = async (payload) => {
  try {
    const res = await axios.post('/auth/oauth/create-nexus-user', payload);
    return res.data;
  } catch (error) {
    const apiMessage = error?.response?.data?.message;
    const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage;
    const rawMessage = normalizedMessage || error?.message || '';
    const errorMessage =
      mapNricFinUserErrorMessage(rawMessage)
      || (typeof error === 'string' ? error : 'Failed to create Salesforce membership account.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Membership flow: check if NRIC already exists in Salesforce eServices
 *************************************** */
export const checkSalesforceUserByNric = async (nricNumber) => {
  try {
    const res = await axios.post('/auth/oauth/salesforce-user-check-nric', { nricNumber });
    return res.data;
  } catch (error) {
    const apiMessage = error?.response?.data?.message;
    const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage;
    const errorMessage =
      normalizedMessage
      || error?.message
      || (typeof error === 'string' ? error : 'Failed to check NRIC against eServices.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Membership flow: check if email already exists in Salesforce eServices
 *************************************** */
export const checkSalesforceUserByEmail = async (email) => {
  try {
    const res = await axios.post('/auth/oauth/salesforce-user-check-email', { email });
    return res.data;
  } catch (error) {
    const apiMessage = error?.response?.data?.message;
    const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage;
    const errorMessage =
      normalizedMessage
      || error?.message
      || (typeof error === 'string' ? error : 'Failed to check email against eServices.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Membership flow: update existing Salesforce account with NRIC/citizenship
 *************************************** */
export const updateSalesforceNexusUser = async (payload) => {
  try {
    const res = await axios.post('/auth/oauth/update-nexus-user', payload);
    return res.data;
  } catch (error) {
    const apiMessage = error?.response?.data?.message;
    const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage;
    const errorMessage =
      normalizedMessage
      || error?.message
      || (typeof error === 'string' ? error : 'Failed to update Salesforce account.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Membership flow: set Salesforce password after account creation
 *************************************** */
export const setSalesforceNexusPassword = async (payload) => {
  try {
    const res = await axios.post('/auth/oauth/set-nexus-password', payload);
    return res.data;
  } catch (error) {
    const apiMessage = error?.response?.data?.message;
    const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage;
    const rawMessage = normalizedMessage || error?.message || '';
    const lower = String(rawMessage).toLowerCase();

    if (lower.includes('invalid repeated password') || lower.includes('repeated password')) {
      throw new Error('This password was used before. Please choose a different password.');
    }

    const errorMessage =
      normalizedMessage ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to set Salesforce password.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Save student/membership record to DB after Salesforce setup
 *************************************** */
export const saveSalesforceMembershipRecord = async (payload) => {
  try {
    const res = await axios.post('/auth/salesforce-membership-record', payload);
    clearMembershipSignupDraftUserId();
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to save membership record.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * SCAQ flow: promote Salesforce account to Associate after SSO
 *************************************** */
export const promoteSalesforceAssociateMember = async () => {
  try {
    const res = await axios.post('/auth/oauth/promote-associate');
    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to update Associate member status in Salesforce.');
    throw new Error(errorMessage);
  }
};

/** **************************************
 * Sign out (SSO-aware: calls backend logout to revoke IdP token if SSO user)
 *************************************** */
export const signOut = async () => {
  const triggerFlowiseLogout = async () => {
    const flowiseBase = resolveFlowisePublicBaseUrl();
    if (!flowiseBase) return;

    // Use hidden iframe + POST form to avoid CORS issues while still sending HttpOnly cookies.
    await new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      const targetName = `flowise-logout-${Date.now()}`;
      iframe.name = targetName;
      iframe.style.display = 'none';

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = `${flowiseBase}/api/v1/account/logout`;
      form.target = targetName;
      form.style.display = 'none';

      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();

      window.setTimeout(() => {
        form.remove();
        iframe.remove();
        resolve();
      }, 800);
    });
  };

  try {
    const { browserLogoutUrl } = await postLogoutWithIdpBrowserClear();
    await triggerFlowiseLogout();
    clearClientSalesforceSessions();
    await clearAuthSession();

    if (browserLogoutUrl) {
      finishLogoutWithIdpBrowserClear(browserLogoutUrl, getAppSignInUrl());
      return;
    }
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
