import { paths } from 'src/routes/paths';

import { submitMembershipApplicationBilling } from 'src/api/membership-application';
import {
  WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER,
  clearPendingMembershipApplicationPayment,
  readPendingMembershipApplicationPaymentSession,
} from './membership-application-billing';
import { ensureMembershipSalesforceSession } from './membership-salesforce-auth';
import { MEMBERSHIP_APPLICATION_OUTCOME } from './membership-salesforce-session';

// ----------------------------------------------------------------------

export function formatMembershipCurrency(amount, currency = 'SGD') {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function normalizeCheckoutDetailsResponse(response) {
  const checkout = response?.checkout;
  if (checkout && typeof checkout === 'object') {
    return checkout;
  }
  const salesforceData = response?.salesforce?.data;
  if (salesforceData && typeof salesforceData === 'object' && !Array.isArray(salesforceData)) {
    return salesforceData;
  }
  return null;
}

export function buildMembershipApplicationPaymentUrls() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const success = new URL(`${origin}${paths.home}`);
  success.searchParams.set('membershipAppPayment', 'success');
  success.searchParams.set('session_id', WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER);

  const cancel = new URL(`${origin}${paths.auth.membership.application}`);
  cancel.searchParams.set('billing', '1');
  cancel.searchParams.set('payment', 'canceled');

  return {
    successUrl: success.toString(),
    cancelUrl: cancel.toString(),
  };
}

export function parseMembershipApplicationPaymentReturn(search) {
  const params = new URLSearchParams(search || '');
  const membershipAppPayment = params.get('membershipAppPayment');
  const rawSessionId =
    params.get('session_id')?.trim() || params.get('sessionId')?.trim() || '';
  const sessionId =
    rawSessionId && rawSessionId !== WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER
      ? rawSessionId
      : readPendingMembershipApplicationPaymentSession();
  const applicationId = params.get('applicationId')?.trim() || '';
  const ref = params.get('ref')?.trim() || '';
  const paymentCanceled = params.get('payment') === 'canceled';
  const isSuccessReturn = membershipAppPayment === 'success';

  return {
    isSuccessReturn,
    paymentCanceled,
    sessionId: sessionId || readPendingMembershipApplicationPaymentSession(),
    applicationId,
    ref,
  };
}

function isBillingAlreadySubmittedError(error) {
  const message = String(
    error?.response?.data?.message
      || error?.message
      || ''
  ).toLowerCase();

  if (!message) return false;

  return (
    (message.includes('billing') && message.includes('already'))
    || (message.includes('already') && message.includes('submitted'))
    || (message.includes('already') && message.includes('exist'))
    || message.includes('duplicate')
  );
}

function buildPostPaymentOAuthStartUrl(returnToPath) {
  const params = new URLSearchParams({
    returnTo: returnToPath,
    membershipOutcome: MEMBERSHIP_APPLICATION_OUTCOME,
    eligibilityType: 'recognition',
  });
  return `${paths.auth.oauth.start}?${params.toString()}`;
}

/**
 * After WooshPay success: record billing in Salesforce, then start eServices SSO.
 */
export async function completeMembershipApplicationPaymentReturn({
  sessionId,
  applicationId: applicationIdFromUrl,
}) {
  const session = ensureMembershipSalesforceSession();
  const socialToken = session.socialToken.trim();
  const accountId = session.accountId.trim();
  const applicationId =
    applicationIdFromUrl?.trim() || session.applicationId?.trim() || '';

  if (!applicationId) {
    throw new Error('Application information is missing.');
  }
  if (!sessionId?.trim()) {
    throw new Error('Payment reference was not found.');
  }

  try {
    await submitMembershipApplicationBilling({
      socialAccessToken: socialToken,
      applicationId,
      accountId,
      paymentMethod: 'Wooshpay',
      wooshPayReferenceNo: sessionId.trim(),
    });
  } catch (error) {
    if (!isBillingAlreadySubmittedError(error)) {
      throw error;
    }
  }

  clearPendingMembershipApplicationPayment();

  return {
    redirectTo: buildPostPaymentOAuthStartUrl(paths.learning),
  };
}

export function stripMembershipApplicationPaymentParams(search) {
  const params = new URLSearchParams(search || '');
  [
    'membershipAppPayment',
    'payment',
    'session_id',
    'sessionId',
    'ref',
    'applicationId',
    'billing',
  ].forEach((key) => params.delete(key));
  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : '';
}
