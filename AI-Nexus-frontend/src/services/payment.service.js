import axios from 'src/utils/axios';

const trimPaymentLogValue = (value, keep = 18) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '(none)';
  return normalized.length > keep ? `${normalized.slice(0, keep)}...` : normalized;
};

/**
 * Create a WooshPay checkout session (card-only). Returns URL to redirect the user to pay.
 * Backend uses PAYMENT_SECRET_KEY; this call is authenticated as the current user.
 */
export async function createCheckoutSession({ items, successUrl, cancelUrl, currency = 'sgd' }) {
  const response = await axios.post('/payments/create-checkout-cards', {
    items: items.map((item) => ({
      id: item.id,
      name: item.name || 'Course',
      price: Number(item.price) || 0,
      quantity: Number(item.quantity) || 1,
    })),
    successUrl,
    cancelUrl,
    currency,
  });
  return response.data;
}

export async function createMembershipCheckoutSession({
  draftUserId,
  signupAccessToken,
  source,
  successUrl,
  cancelUrl,
  currency = 'sgd',
}) {
  try {
    console.info('[MembershipPaymentService] Create checkout request', {
      draftUserId: trimPaymentLogValue(draftUserId),
      source: source || 'membership-paid-signup',
      currency: String(currency || 'sgd').toUpperCase(),
    });
    const response = await axios.post('/payments/create-membership-checkout', {
      draftUserId,
      signupAccessToken,
      source,
      successUrl,
      cancelUrl,
      currency,
    });
    console.info('[MembershipPaymentService] Create checkout success', {
      refId: trimPaymentLogValue(response?.data?.refId),
      sessionId: trimPaymentLogValue(response?.data?.sessionId),
    });
    return response.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Could not start membership payment.';
    console.error('[MembershipPaymentService] Create checkout failed', {
      draftUserId: trimPaymentLogValue(draftUserId),
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }
}

/**
 * WooshPay checkout for ISCA membership application (recognition application form).
 * Returns sessionId to pass as wooshPayReferenceNo to createBillingNexus.
 */
export async function createMembershipApplicationCheckout({
  applicationId,
  accountId,
  successUrl,
  cancelUrl,
  customerEmail,
  customerName,
  customerPhone,
  currency = 'sgd',
  totalAmount,
  description,
}) {
  const response = await axios.post('/payments/create-membership-application-checkout', {
    applicationId,
    accountId,
    successUrl,
    cancelUrl,
    customerEmail,
    customerName,
    customerPhone,
    currency,
    totalAmount,
    description,
  });
  return response.data;
}

export async function confirmMembershipPayment({ ref, sessionId }) {
  try {
    console.info('[MembershipPaymentService] Confirm payment request', {
      refId: trimPaymentLogValue(ref),
      sessionId: trimPaymentLogValue(sessionId),
    });
    const response = await axios.post('/payments/confirm-membership-payment', {
      ref,
      sessionId,
    });
    console.info('[MembershipPaymentService] Confirm payment success', {
      refId: trimPaymentLogValue(ref),
      userId: trimPaymentLogValue(response?.data?.userId),
    });
    return response.data;
  } catch (error) {
    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Could not confirm membership payment.';
    console.error('[MembershipPaymentService] Confirm payment failed', {
      refId: trimPaymentLogValue(ref),
      sessionId: trimPaymentLogValue(sessionId),
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }
}

/**
 * Confirm payment after redirect. Backend will enroll user and create order if not already done by webhook.
 * Call this on the checkout success page with session_id from URL.
 */
export async function confirmPayment(sessionId) {
  const response = await axios.post('/payments/confirm-payment', { sessionId });
  return response.data;
}

/**
 * Mark payment as failed when user returns from WooshPay without completing.
 * Creates/updates order status to Failed. Call when user lands on cancel_url with ref.
 */
export async function markPaymentFailed(ref) {
  const response = await axios.post('/payments/mark-failed', { ref });
  return response.data;
}

export async function getPaymentStatus(ref) {
  const response = await axios.get('/payments/status', { params: { ref } });
  return response.data;
}
