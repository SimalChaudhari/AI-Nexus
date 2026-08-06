import axios from 'src/utils/axios';

import { setIntlSession } from 'src/auth/intl-session';

export async function getIntlCountries() {
  const res = await axios.get('/intl-payments/countries');
  return res.data?.countries || [];
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
