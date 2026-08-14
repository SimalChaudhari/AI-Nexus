import axios from 'src/utils/axios';

import { getIntlAccessToken, setIntlSession } from 'src/auth/intl-session';

export async function getIntlCountries() {
  const res = await axios.get('/intl-payments/countries');
  return res.data?.countries || [];
}

/** Latest + recent membership payments for the signed-in international user. */
export async function getIntlMyPayments() {
  const token = getIntlAccessToken();
  if (!token) return { latest: null, payments: [] };

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await axios.get('/intl-payments/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return {
        latest: res.data?.latest || null,
        payments: Array.isArray(res.data?.payments) ? res.data.payments : [],
      };
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }
    }
  }
  if (lastError) throw lastError;
  return { latest: null, payments: [] };
}

export async function getIntlMembershipPricing({
  countryOfResidence,
  promoApplied = false,
  membershipType = 'full',
  promoCode,
}) {
  const res = await axios.get('/intl-payments/pricing', {
    params: {
      countryOfResidence,
      promoApplied: promoApplied ? 'true' : 'false',
      membershipType: membershipType === 'student' ? 'student' : 'full',
      ...(promoApplied && promoCode ? { promoCode } : {}),
    },
  });
  return res.data;
}

/** Validate affiliate/voucher code and get international FX pricing (same idea as /affiliate/validate). */
export async function validateIntlPromoCode({
  code,
  countryOfResidence,
  membershipType = 'full',
} = {}) {
  const res = await axios.post('/intl-payments/validate-promo', {
    code: code || undefined,
    countryOfResidence: countryOfResidence || undefined,
    membershipType: membershipType === 'student' ? 'student' : 'full',
  });
  return res.data;
}

export async function trackAffiliateClick({ affiliateCode, landingPath }) {
  const res = await axios.post('/affiliate/track-click', {
    affiliateCode,
    landingPath,
  });
  return res.data;
}

export async function createIntlCheckoutSession({
  draftUserId,
  signupAccessToken,
  successUrl,
  cancelUrl,
  promoCode,
  membershipType,
  paymentConsent,
}) {
  const res = await axios.post('/intl-payments/create-checkout', {
    draftUserId,
    signupAccessToken,
    successUrl,
    cancelUrl,
    promoCode: promoCode || undefined,
    membershipType: membershipType === 'student' ? 'student' : 'full',
    paymentConsent,
  });
  return res.data;
}

export async function confirmIntlPayment({ ref, sessionId }) {
  const res = await axios.post('/intl-payments/confirm', {
    ref,
    sessionId: sessionId || undefined,
  });
  const { accessToken, user, message, payment } = res.data || {};
  if (accessToken && user) {
    setIntlSession({ accessToken, user });
  }
  return { accessToken, user, message, payment };
}
