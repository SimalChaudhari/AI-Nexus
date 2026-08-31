import {
  isQualificationTabComplete,
  QUALIFICATION_SUBMIT_KEYS,
} from 'src/utils/membership-application-qualification';
import {
  isExperiencedMembershipApplicationPathway,
  readMembershipApplicationPathway,
} from 'src/utils/membership-application-pathway';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export function readPaymentReturnFromSearch(search = '') {
  const params = new URLSearchParams(search || '');
  return {
    openBilling: params.get('billing') === '1',
    billingComplete: params.get('billingComplete') === '1',
    paymentCanceled: params.get('payment') === 'canceled',
    paymentError: params.get('paymentError') || '',
    statusMessage: params.get('statusMessage') || '',
    membershipStatus: params.get('membershipStatus') || '',
    isPaymentReturn:
      params.get('billing') === '1'
      || params.get('billingComplete') === '1'
      || params.get('payment') === 'canceled'
      || Boolean(params.get('paymentError')),
    paymentRecorded: params.get('billingComplete') === '1',
  };
}

/** When billing was recorded in Salesforce, restore tab locks if draft progress was lost. */
export function reconcileSubmittedTabsAfterPaymentRecorded(submittedTabs, tabsList, pathway) {
  const billingIdx = tabsList.findIndex((t) => t.id === 'billing');
  if (billingIdx <= 0) return { ...(submittedTabs || {}) };

  const next = { ...(submittedTabs || {}) };
  const stamp = new Date().toISOString();
  const isExperienced = isExperiencedMembershipApplicationPathway(pathway);

  for (let i = 0; i < billingIdx; i += 1) {
    const tabId = tabsList[i].id;

    if (tabId === 'qualification') {
      if (!isQualificationTabComplete(next, pathway)) {
        if (isExperienced) {
          next[QUALIFICATION_SUBMIT_KEYS.academic] = stamp;
          next[QUALIFICATION_SUBMIT_KEYS.professional] = stamp;
          next[QUALIFICATION_SUBMIT_KEYS.opb] = stamp;
        } else {
          next[QUALIFICATION_SUBMIT_KEYS.professional] = stamp;
          next[QUALIFICATION_SUBMIT_KEYS.ato] = stamp;
        }
        next.qualification = stamp;
      }
      continue;
    }

    if (!next[tabId]) {
      next[tabId] = stamp;
    }
  }

  return next;
}

export function buildMembershipPaymentErrorReturnUrl(message) {
  const pathway = readMembershipApplicationPathway();
  const params = new URLSearchParams({
    billing: '1',
    tab: 'billing',
    paymentError: message,
  });
  if (isExperiencedMembershipApplicationPathway(pathway)) {
    params.set('pathway', pathway);
  }
  return `${paths.auth.membership.application}?${params.toString()}`;
}
