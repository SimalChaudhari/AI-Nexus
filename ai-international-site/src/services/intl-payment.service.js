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
  const res = await axios.get('/intl-payments/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return {
    latest: res.data?.latest || null,
    payments: Array.isArray(res.data?.payments) ? res.data.payments : [],
  };
}

export async function getIntlMembershipPricing({ countryOfResidence, promoApplied = false }) {
  const res = await axios.get('/intl-payments/pricing', {
    params: {
      countryOfResidence,
      promoApplied: promoApplied ? 'true' : 'false',
    },
  });
  return res.data;
}

/** Validate affiliate/voucher code and get international FX pricing (same idea as /affiliate/validate). */
export async function validateIntlPromoCode({ code, countryOfResidence } = {}) {
  const res = await axios.post('/intl-payments/validate-promo', {
    code: code || undefined,
    countryOfResidence: countryOfResidence || undefined,
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
  paymentConsent,
}) {
  const res = await axios.post('/intl-payments/create-checkout', {
    draftUserId,
    signupAccessToken,
    successUrl,
    cancelUrl,
    promoCode: promoCode || undefined,
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
