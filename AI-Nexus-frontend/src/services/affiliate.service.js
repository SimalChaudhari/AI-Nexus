import axios from 'src/utils/axios';

export async function validateAffiliateCodes({ code, affiliateCode, voucherCode } = {}) {
  const response = await axios.post('/affiliate/validate', {
    code: code || undefined,
    affiliateCode: affiliateCode || undefined,
    voucherCode: voucherCode || undefined,
  });
  return response.data;
}

/** Validate a single code field (tried as affiliate code first, then voucher code by the backend). */
export async function validateCode(code) {
  const response = await axios.post('/affiliate/validate', { code: code || undefined });
  return response.data;
}

/** Admin: create/reactivate any promo code so it works on signup with configured promo amount. */
export async function ensureVoucherCode(code) {
  const response = await axios.post('/affiliate/ensure-voucher', {
    code: String(code || '').trim().toUpperCase(),
  });
  return response.data;
}

export async function listVoucherCodes() {
  const response = await axios.get('/affiliate/vouchers');
  return response.data?.data || response.data || [];
}

export async function createVoucherCode(payload) {
  const response = await axios.post('/affiliate/vouchers', payload || {});
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
