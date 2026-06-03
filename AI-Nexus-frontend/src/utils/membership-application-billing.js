export const MEMBERSHIP_BILLING_PAYMENT_METHOD = 'Wooshpay';

/** WooshPay replaces this token on redirect (same pattern as membership signup). */
export const WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';

const MEMBERSHIP_APPLICATION_PENDING_PAYMENT_SESSION_KEY =
  'membershipApplicationPendingPaymentSession';

export const EMPTY_BILLING_FORM = {
  paymentCompleted: false,
};

function normalizeSessionId(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER) {
    return '';
  }
  return trimmed;
}

export function readPendingMembershipApplicationPaymentSession() {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeSessionId(
      sessionStorage.getItem(MEMBERSHIP_APPLICATION_PENDING_PAYMENT_SESSION_KEY)
    );
  } catch {
    return '';
  }
}

export function persistPendingMembershipApplicationPayment({ sessionId }) {
  if (typeof window === 'undefined') return;
  try {
    const normalizedSession = normalizeSessionId(sessionId);
    if (normalizedSession) {
      sessionStorage.setItem(
        MEMBERSHIP_APPLICATION_PENDING_PAYMENT_SESSION_KEY,
        normalizedSession
      );
    }
  } catch {
    // ignore
  }
}

export function clearPendingMembershipApplicationPayment() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(MEMBERSHIP_APPLICATION_PENDING_PAYMENT_SESSION_KEY);
  } catch {
    // ignore
  }
}
