import { paths } from 'src/routes/paths';

import { submitMembershipApplicationBilling } from 'src/api/membership-application';
import {
  WOOSHPAY_CHECKOUT_SESSION_PLACEHOLDER,
  clearPendingMembershipApplicationPayment,
  readPendingMembershipApplicationPaymentSession,
} from './membership-application-billing';
import { ensureMembershipSalesforceSession } from './membership-salesforce-auth';
import {
  MEMBERSHIP_APPLICATION_ALREADY_SUBMITTED_MESSAGE,
  MEMBERSHIP_APPLICATION_CA_PENDING_MESSAGE,
  redirectCaMemberToPlatform,
  tryCompleteCaMemberPlatformLogin,
} from './membership-application-ca';

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
      || error?.response?.data?.errorDetails
      || error?.message
      || ''
  ).toLowerCase();

  if (!message) return false;

  return (
    (message.includes('billing') && message.includes('already'))
    || (message.includes('billing') && message.includes('submitted'))
    || (message.includes('already') && message.includes('submitted'))
    || (message.includes('already') && message.includes('exist'))
    || message.includes('duplicate')
    || (message.includes('draft or created') && message.includes('submitted'))
  );
}

/**
 * After WooshPay success: record billing in Salesforce, re-check userinfonexus for CA,
 * then sign in on the website or return to the application with a status message.
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

  let billingAlreadySubmitted = false;

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
    billingAlreadySubmitted = true;
  }

  clearPendingMembershipApplicationPayment();

  const caLogin = await tryCompleteCaMemberPlatformLogin({
    socialAccessToken: socialToken,
    redirectTo: paths.learning,
  });

  if (caLogin.loggedIn && caLogin.redirectTo) {
    redirectCaMemberToPlatform(caLogin.redirectTo);
    return {
      redirectTo: caLogin.redirectTo,
      message: caLogin.message,
      isCaMember: true,
      navigated: true,
    };
  }

  const statusMessage = billingAlreadySubmitted
    ? MEMBERSHIP_APPLICATION_ALREADY_SUBMITTED_MESSAGE
    : MEMBERSHIP_APPLICATION_CA_PENDING_MESSAGE;

  const params = new URLSearchParams({
    billing: '1',
    billingComplete: '1',
    membershipStatus: billingAlreadySubmitted ? 'submitted' : 'pending',
  });
  params.set('statusMessage', statusMessage);

  return {
    redirectTo: `${paths.auth.membership.application}?${params.toString()}`,
    message: caLogin.message || statusMessage,
    isCaMember: false,
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
