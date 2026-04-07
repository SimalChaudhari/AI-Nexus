import { deleteCookie } from 'src/utils/cookie';
import axios from 'src/utils/axios';

import { setSession } from './utils';

const normalizeUserForSession = (user) => {
  if (!user || typeof user !== 'object') return user;

  return {
    ...user,
    firstname: user.firstname ?? user.firstName ?? '',
    lastname: user.lastname ?? user.lastName ?? '',
    isVerified: user.isVerified ?? user.isVerify ?? false,
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
export const signUp = async ({ email, password, firstName, lastName, username }) => {
  try {
    const params = {
      username: username || email.split('@')[0], // Use email prefix as username if not provided
      firstname: firstName,
      lastname: lastName,
      email,
      password,
    };
    const res = await axios.post('/auth/register', params);
    const { user, message } = res.data;

    // Store user data in sessionStorage
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(normalizeUserForSession(user)));
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
    await setSession(null);
    sessionStorage.removeItem('user');
    deleteCookie('access-token');
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
};
