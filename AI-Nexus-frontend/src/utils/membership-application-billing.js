export const MEMBERSHIP_BILLING_PAYMENT_METHOD = 'Wooshpay';

/** WooshPay replaces this token on redirect (same pattern as membership signup). */
export const WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';

export const MEMBERSHIP_APPLICATION_PENDING_PAYMENT_SESSION_KEY =
  'membershipApplicationPendingPaymentSession';

export const MEMBERSHIP_APPLICATION_PENDING_PAYMENT_REF_KEY =
  'membershipApplicationPendingPaymentRef';

export const EMPTY_BILLING_FORM = {
  wooshPayReferenceNo: '',
  paymentCompleted: false,
};

function normalizeSessionId(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed === WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER) {
    return '';
  }
  return trimmed;
}

export function parseWooshPayReturnParams(search) {
  const params = new URLSearchParams(search || '');
  const sessionId = normalizeSessionId(
    params.get('session_id')
      || params.get('sessionId')
      || params.get('wooshPayReferenceNo')
  );
  const ref = params.get('ref') || '';
  const paymentCanceled = params.get('payment') === 'canceled';
  const paymentSuccess = params.get('payment') === 'success';
  return {
    sessionId,
    ref: ref.trim(),
    paymentCanceled,
    paymentSuccess,
  };
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

export function persistPendingMembershipApplicationPayment({ sessionId, refId }) {
  if (typeof window === 'undefined') return;
  try {
    const normalizedSession = normalizeSessionId(sessionId);
    if (normalizedSession) {
      sessionStorage.setItem(
        MEMBERSHIP_APPLICATION_PENDING_PAYMENT_SESSION_KEY,
        normalizedSession
      );
    }
    if (refId) {
      sessionStorage.setItem(MEMBERSHIP_APPLICATION_PENDING_PAYMENT_REF_KEY, String(refId).trim());
    }
  } catch {
    // ignore
  }
}

export function clearPendingMembershipApplicationPayment() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(MEMBERSHIP_APPLICATION_PENDING_PAYMENT_SESSION_KEY);
    sessionStorage.removeItem(MEMBERSHIP_APPLICATION_PENDING_PAYMENT_REF_KEY);
  } catch {
    // ignore
  }
}

export function resolveWooshPayReferenceAfterReturn(search) {
  const parsed = parseWooshPayReturnParams(search);
  if (parsed.sessionId) {
    return { ...parsed, sessionId: parsed.sessionId };
  }

  if (parsed.paymentSuccess) {
    const stored = readPendingMembershipApplicationPaymentSession();
    if (stored) {
      return { ...parsed, sessionId: stored };
    }
  }

  return parsed;
}

export function buildMembershipBillingApiPayload({
  applicationId,
  accountId,
  wooshPayReferenceNo,
  paymentMethod = MEMBERSHIP_BILLING_PAYMENT_METHOD,
}) {
  return {
    applicationId,
    accountId,
    paymentMethod,
    wooshPayReferenceNo,
  };
}

export function validateBillingBeforeSubmit({
  documentsSubmitted,
  wooshPayReferenceNo,
}) {
  if (!documentsSubmitted) {
    return 'Submit the Document Upload section before billing.';
  }
  if (!wooshPayReferenceNo?.trim()) {
    return 'Complete WooshPay payment first, or enter the payment reference from WooshPay.';
  }
  return null;
}

export function buildMembershipApplicationCheckoutUrls(applicationPath) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const success = new URL(`${origin}${applicationPath}`);
  success.searchParams.set('billing', '1');
  success.searchParams.set('payment', 'success');
  success.searchParams.set('session_id', WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER);

  const cancel = new URL(`${origin}${applicationPath}`);
  cancel.searchParams.set('billing', '1');
  cancel.searchParams.set('payment', 'canceled');

  return {
    successUrl: success.toString(),
    cancelUrl: cancel.toString(),
  };
}
