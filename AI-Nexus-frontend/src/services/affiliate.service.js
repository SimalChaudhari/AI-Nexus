import axios from 'src/utils/axios';

export async function validateAffiliateCodes({
  code,
  affiliateCode,
  voucherCode,
  countryOfResidence,
  billingCountryCode,
} = {}) {
  const response = await axios.post('/affiliate/validate', {
    code: code || undefined,
    affiliateCode: affiliateCode || undefined,
    voucherCode: voucherCode || undefined,
    site: 'payment',
    countryOfResidence: countryOfResidence || undefined,
    billingCountryCode: billingCountryCode || undefined,
  });
  return response.data;
}

/** Validate a single code field (tried as affiliate code first, then voucher code by the backend). */
export async function validateCode(code, options = {}) {
  const response = await axios.post('/affiliate/validate', {
    code: code || undefined,
    site: 'payment',
    countryOfResidence: options.countryOfResidence || undefined,
    billingCountryCode: options.billingCountryCode || undefined,
  });
  return response.data;
}

/** Admin: create/reactivate any promo code so it works on signup with configured promo amount. */
export async function ensureVoucherCode(code) {
  const response = await axios.post('/affiliate/ensure-voucher', {
    code: String(code || '').trim().toUpperCase(),
    site: 'payment',
  });
  return response.data;
}

export async function listVoucherCodes(site = 'payment') {
  const response = await axios.get('/affiliate/vouchers', {
    params: { site },
  });
  return response.data?.data || response.data || [];
}

export async function createVoucherCode(payload) {
  const response = await axios.post('/affiliate/vouchers', {
    ...(payload || {}),
    site: payload?.site || 'payment',
  });
  return response.data?.data || response.data;
}

export async function updateVoucherCode(id, payload) {
  const response = await axios.put(`/affiliate/vouchers/${id}`, payload || {});
  return response.data?.data || response.data;
}

export async function deleteVoucherCode(id) {
  const response = await axios.delete(`/affiliate/vouchers/${id}`);
  return response.data?.data || response.data;
}

export async function trackAffiliateClick({ affiliateCode, landingPath }) {
  const response = await axios.post('/affiliate/track-click', {
    affiliateCode,
    landingPath,
  });
  return response.data;
}

export async function createAffiliateSignupCheckout(payload) {
  const response = await axios.post('/affiliate/signup-checkout', payload);
  return response.data;
}

export async function confirmAffiliatePayment({ ref, sessionId }) {
  const response = await axios.post('/affiliate/confirm-payment', {
    ref,
    sessionId,
  });
  return response.data;
}

export async function getAffiliateDashboard(code) {
  const response = await axios.get('/affiliate/dashboard', {
    params: { code },
  });
  return response.data;
}
