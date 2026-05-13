import { deleteCookie } from 'src/utils/cookie';
import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import { resolveFlowisePublicBaseUrl } from 'src/utils/flowise-public-url';
import { resolveAssetUrl } from 'src/utils/asset-url';

import { setSession } from './utils';

const normalizeUserForSession = (user) => {
  if (!user || typeof user !== 'object') return user;

  return {
    ...user,
    firstname: user.firstname ?? user.firstName ?? '',
    lastname: user.lastname ?? user.lastName ?? '',
    isVerified: user.isVerified ?? user.isVerify ?? false,
    avatarUrl: resolveAssetUrl(user.avatarUrl ?? user.photoURL ?? ''),
  };
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
    const { access_token, user } = res.data;

    if (!access_token) {
      throw new Error('Please check your email/username and password');
    }

    // Store user data in sessionStorage
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(normalizeUserForSession(user)));
    }

    setSession(access_token);
    return { access_token, user };
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
export const signUp = async ({ email, password, firstName, lastName, username, signupAccessToken, eligibilityData }) => {
  try {
    const params = {
      username: username || email.split('@')[0], // Use email prefix as username if not provided
      firstname: firstName,
      lastname: lastName,
      email,
      password,
      signupAccessToken: signupAccessToken || undefined,
      eligibilityIsSingaporePr: typeof eligibilityData?.isSingaporePr === 'boolean' ? eligibilityData.isSingaporePr : undefined,
      eligibilityIsIscaMember: typeof eligibilityData?.isIscaMember === 'boolean' ? eligibilityData.isIscaMember : undefined,
      eligibilityWantsMembership:
        typeof eligibilityData?.wantsIscaMembership === 'boolean' ? eligibilityData.wantsIscaMembership : undefined,
      eligibilityType: eligibilityData?.eligibilityType || undefined,
      eligibilitySnapshot: eligibilityData?.snapshot || undefined,
    };
    const res = await axios.post('/auth/register', params);
    const { user, message } = res.data;

    // Store user data in sessionStorage
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(normalizeUserForSession(user)));
    }
    if (signupAccessToken) {
      sessionStorage.removeItem('membershipDraftUserId');
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
  signupAccessToken,
  draftUserId,
  eligibilityData,
}) => {
  try {
    const params = {
      username: username || email.split('@')[0],
      firstname: firstName,
      lastname: lastName,
      email,
      password,
      signupAccessToken: signupAccessToken || undefined,
      draftUserId: draftUserId || undefined,
      eligibilityIsSingaporePr: typeof eligibilityData?.isSingaporePr === 'boolean' ? eligibilityData.isSingaporePr : undefined,
      eligibilityIsIscaMember: typeof eligibilityData?.isIscaMember === 'boolean' ? eligibilityData.isIscaMember : undefined,
      eligibilityWantsMembership:
        typeof eligibilityData?.wantsIscaMembership === 'boolean' ? eligibilityData.wantsIscaMembership : undefined,
      eligibilityType: eligibilityData?.eligibilityType || undefined,
      eligibilitySnapshot: eligibilityData?.snapshot || undefined,
    };
    const res = await axios.post('/auth/membership-signup-draft', params);
    const nextDraftUserId = res?.data?.draftUserId || res?.data?.user?.id || '';

    if (nextDraftUserId) {
      sessionStorage.setItem('membershipDraftUserId', nextDraftUserId);
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
    let currentUser = null;
    let draftUserId = '';
    try {
      currentUser = JSON.parse(sessionStorage.getItem('user') || 'null');
    } catch {
      currentUser = null;
    }
    draftUserId = sessionStorage.getItem('membershipDraftUserId') || '';
    if (currentUser?.id) {
      formData.append('userId', currentUser.id);
    } else if (draftUserId) {
      formData.append('userId', draftUserId);
    }
    formData.append('frontImage', frontImage);
    formData.append('backImage', backImage);

    const res = await axios.post('/auth/verify-nric', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (!currentUser?.id && res?.data?.userId) {
      sessionStorage.setItem('membershipDraftUserId', res.data.userId);
    }

    return res.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'NRIC verification failed. Please try again.');
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
 * OAuth: get auth URL and redirect to IdP
 *************************************** */
export const getOAuthAuthUrl = async () => {
  const res = await axios.get('/auth/oauth/auth-url');
  const { authUrl, state } = res.data || {};
  if (!authUrl) throw new Error('Failed to get SSO login URL.');
  return { authUrl, state };
};

/** **************************************
 * OAuth: exchange code for our tokens (e.g. when app receives code via callback)
 *************************************** */
export const exchangeOAuthCode = async ({ code, state }) => {
  const res = await axios.post('/auth/oauth/exchange', { code, state });
  const data = res.data || {};
  if (!data.accessToken) throw new Error(data.message || 'SSO login failed.');
  const { user, accessToken, isNewUser } = data;
  const normalizedUser = normalizeUserForSession(user);
  if (normalizedUser) sessionStorage.setItem('user', JSON.stringify(normalizedUser));
  setSession(accessToken);
  return { user: normalizedUser, accessToken, isNewUser };
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
    const accessToken = sessionStorage.getItem('jwt_access_token');
    if (accessToken) {
      try {
        await axios.post('/auth/logout', {}, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (err) {
        console.warn('Backend logout failed (non-fatal):', err);
      }
    }
    await triggerFlowiseLogout();
    await setSession(null);
    localStorage.removeItem('jwt_access_token');
    localStorage.removeItem('access-token');
    sessionStorage.removeItem('user');
    deleteCookie('access-token');
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
