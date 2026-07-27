import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { AnimateLogo2 } from 'src/components/animate';
import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';
import {
  buildCompanyQrEnrollmentSignUpSchema,
  buildPaidIndividualSignUpSchema,
} from 'src/validations/user.validation';

import { getVerifiedSignupAccess, saveMembershipSignupDraft, createSalesforceNexusUser, signupSalesforceForNexus, setSalesforceNexusPassword, saveSalesforceMembershipRecord, verifyCompanyReference } from 'src/auth/context/jwt';
import { abandonMembershipCheckout, confirmMembershipPayment, createMembershipCheckoutSession, verifyMembershipPayment } from 'src/services/payment.service';
import { trackAffiliateClick, validateCode } from 'src/services/affiliate.service';
import { appSettingsService } from 'src/services/app-settings.service';
import { validateCompanyEnrollment } from 'src/services/company-enrollment.service';
import {
  buildSalesforceNexusUserPayloadFromSignup,
  buildSalesforceSignupForNexusPayloadFromSignup,
  resolveVerifiedNricSalesforceFields,
  resolveSalesforceNexusUsernameFromCreateResponse,
} from 'src/utils/nric-id-type';
import { assertSalesforceEmailAvailable, SALESFORCE_EMAIL_EXISTS_MESSAGE } from 'src/utils/salesforce-email-check';
import {
  isApprovedSalesforceStudentMember,
  startStudentMemberSsoLogin,
} from 'src/utils/membership-application-student';
import {
  buildIndividualSignupPrefillFromEligibility,
  INDIVIDUAL_SIGNUP_DEFAULT_VALUES,
  INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS,
  mergeSignupEligibilityData,
  resolveIndividualSignupJobFunctionLabel,
} from 'src/utils/individual-signup-form';
import { detectCountryOfResidenceFromIp } from 'src/utils/detect-country-from-ip';
import { MembershipPaymentConfirmedView } from './membership-payment-confirmed-view';
import { ISCA_PRIVACY_POLICY_URL } from 'src/constants/isca-legal-links';

const SIGNUP_FORM_GRID_SX = {
  display: 'grid',
  // Mobile / small tablet: one field per row. Side-by-side from md up.
  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
  columnGap: 2,
  rowGap: 2,
  '& .MuiFormLabel-asterisk': { color: 'error.main' },
  '& > *': { minWidth: 0 },
};

const SIGNUP_FORM_GRID_FULL_WIDTH_SX = { gridColumn: '1 / -1' };

const AFFILIATE_REF_STORAGE_KEY = 'affiliateSignupRef';
const MEMBERSHIP_DRAFT_FORM_KEY = 'membershipSignupDraftForm';
const MEMBERSHIP_PAYMENT_CONSENT_KEY = 'membershipPaymentConsent';
const MEMBERSHIP_ELIGIBILITY_KEY = 'membershipEligibilityFlow';
const PENDING_MEMBERSHIP_SESSION_KEY = 'pending_membership_session_id';
const PENDING_MEMBERSHIP_REF_KEY = 'pending_membership_ref';
const SALESFORCE_NEXUS_USERNAME_KEY = 'salesforceNexusUsername';
const MEMBERSHIP_DRAFT_USER_ID_KEY = 'membershipDraftUserId';
const MEMBERSHIP_SALESFORCE_SESSION_KEY = 'membershipSalesforceSession';

/** In-flight Salesforce sync promises keyed by payment ref (prevents React Strict Mode double-create). */
const membershipSalesforceSyncInFlight = new Map();

function getMembershipSalesforceSyncStorageKey(refId) {
  return `membershipSfSync:${String(refId || '').trim()}`;
}

/**
 * Clear all membership signup draft / payment client state after a successful paid signup.
 * Prevents the next visitor on the same browser from seeing a pre-filled form.
 */
function clearMembershipSignupClientDraftStorage(paymentRefId = '') {
  if (typeof window === 'undefined') return;

  const keysToRemove = [
    MEMBERSHIP_DRAFT_USER_ID_KEY,
    MEMBERSHIP_DRAFT_FORM_KEY,
    MEMBERSHIP_PAYMENT_CONSENT_KEY,
    MEMBERSHIP_ELIGIBILITY_KEY,
    PENDING_MEMBERSHIP_SESSION_KEY,
    PENDING_MEMBERSHIP_REF_KEY,
    SALESFORCE_NEXUS_USERNAME_KEY,
    AFFILIATE_REF_STORAGE_KEY,
  ];

  keysToRemove.forEach((key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore storage errors
    }
  });

  if (paymentRefId) {
    try {
      sessionStorage.removeItem(getMembershipSalesforceSyncStorageKey(paymentRefId));
    } catch {
      // ignore
    }
  }

  // Clear any leftover per-ref Salesforce sync markers.
  try {
    const syncPrefix = 'membershipSfSync:';
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(syncPrefix)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(MEMBERSHIP_SALESFORCE_SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Run Salesforce membership sync once per payment ref.
 * Concurrent callers share the same promise; completed syncs are remembered in sessionStorage.
 */
async function runMembershipSalesforceSyncOnce(refId, runner) {
  const key = String(refId || '').trim();
  if (!key) {
    return runner();
  }

  const storageKey = getMembershipSalesforceSyncStorageKey(key);
  if (typeof window !== 'undefined') {
    const existing = sessionStorage.getItem(storageKey);
    if (existing?.startsWith('done:')) {
      return existing.slice('done:'.length) || null;
    }
  }

  if (membershipSalesforceSyncInFlight.has(key)) {
    return membershipSalesforceSyncInFlight.get(key);
  }

  const promise = (async () => {
    try {
      const username = await runner();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(storageKey, `done:${username || ''}`);
      }
      return username;
    } catch (error) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(storageKey);
      }
      throw error;
    } finally {
      membershipSalesforceSyncInFlight.delete(key);
    }
  })();

  membershipSalesforceSyncInFlight.set(key, promise);
  return promise;
}

function buildEligibilityDataFromFlow(flow, membershipOutcome) {
  if (!flow || typeof flow !== 'object' || Array.isArray(flow)) {
    return null;
  }

  const eligibilityType = typeof flow.eligibilityType === 'string' ? flow.eligibilityType.trim() : '';

  return {
    isSingaporePr: typeof flow.isSingaporePr === 'boolean' ? flow.isSingaporePr : undefined,
    isIscaMember: typeof flow.isIscaMember === 'boolean' ? flow.isIscaMember : undefined,
    wantsIscaMembership:
      typeof flow.wantsIscaMembership === 'boolean' ? flow.wantsIscaMembership : undefined,
    eligibilityType: eligibilityType || undefined,
    snapshot: {
      ...flow,
      membershipOutcome: membershipOutcome || '',
    },
  };
}

export function SimpleSignUpView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const password = useBoolean();
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [appliedSuggestion, setAppliedSuggestion] = useState('');
  const [paymentConsentChecked, setPaymentConsentChecked] = useState(false);
  const [paymentActionLoading, setPaymentActionLoading] = useState(false);
  const [paymentConfirming, setPaymentConfirming] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);
  const [paymentCompletedState, setPaymentCompletedState] = useState(null);
  const [paymentRedirectCountdown, setPaymentRedirectCountdown] = useState(15);
  const [verifiedSignupLoading, setVerifiedSignupLoading] = useState(false);
  const [verifiedSignupAccessError, setVerifiedSignupAccessError] = useState('');
  const [verifiedSignupPrefill, setVerifiedSignupPrefill] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [scaqSsoPrefillNotice, setScaqSsoPrefillNotice] = useState(false);
  const [companyPrefilled, setCompanyPrefilled] = useState(false);
  const [companyReferenceVerifying, setCompanyReferenceVerifying] = useState(false);
  const [companyReferenceVerified, setCompanyReferenceVerified] = useState(null);
  const [companyVerifiedName, setCompanyVerifiedName] = useState('');
  const [qrEnrollmentLoading, setQrEnrollmentLoading] = useState(false);
  const [qrEnrollmentError, setQrEnrollmentError] = useState('');
  const [qrEnrollmentReady, setQrEnrollmentReady] = useState(false);
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [emailSfChecking, setEmailSfChecking] = useState(false);
  const [nricVerifiedReadOnly, setNricVerifiedReadOnly] = useState(false);
  const [affiliatePricing, setAffiliatePricing] = useState(null);
  const [affiliateValidating, setAffiliateValidating] = useState(false);
  const [membershipFeeConfig, setMembershipFeeConfig] = useState({
    currency: 'SGD',
    baseAmount: 365.14,
    verifiedBaseAmount: 300,
    gstRatePercent: 9,
    voucherDiscountAmount: 100,
  });
  const affiliateTrackedRef = useRef('');
  const appliedPromoInputRef = useRef('');
  const freeSignupPrefillRestoredRef = useRef(false);
  const qrSubmitInFlightRef = useRef(false);
  const membershipOutcome = searchParams.get('membershipOutcome');
  const returnTo = searchParams.get('returnTo') || '';
  const paymentState = searchParams.get('payment') || '';
  const paymentRef = searchParams.get('ref') || '';
  const paymentSessionId = searchParams.get('session_id') || '';
  const companyCodeFromUrl = String(searchParams.get('companyCode') || '').trim();
  const isCompanyQrSignupFlow =
    searchParams.get('viaQr') === '1' || searchParams.get('viaQr') === 'true';
  /** Company QR invite: company already paid — skip WooshPay checkout. */
  const isCompanyQrEnrollmentFlow = Boolean(isCompanyQrSignupFlow && companyCodeFromUrl);
  const isPaidMembershipFlow = membershipOutcome === 'paid-signup';
  const isVerifiedNricSignupFlow = membershipOutcome === 'verified-nric-signup';
  /** Referral/promo link (`?ref=CODE`) — lock voucher field after auto-fill. */
  const lockedReferralCode = String(paymentRef || '').trim().toUpperCase();
  const isPromoLockedFromReferral = Boolean(lockedReferralCode);
  const isMembershipFeeFlow =
    (isPaidMembershipFlow || isVerifiedNricSignupFlow) && !isCompanyQrEnrollmentFlow;
  /** Standalone free create-account is disabled — use company QR enrollment instead. */
  const isFreeIndividualSignup = false;
  const isUnsupportedStandaloneSignup =
    !isCompanyQrEnrollmentFlow && !isMembershipFeeFlow;
  const isCompanyCodeLockedFromQr = Boolean(isCompanyQrEnrollmentFlow);
  const signupAccessToken = searchParams.get('signupAccessToken') || '';
  const membershipDraftFormStorageKey = MEMBERSHIP_DRAFT_FORM_KEY;
  const membershipPaymentConsentKey = MEMBERSHIP_PAYMENT_CONSENT_KEY;
  const membershipEligibilityStorageKey = MEMBERSHIP_ELIGIBILITY_KEY;
  const pendingMembershipSessionKey = PENDING_MEMBERSHIP_SESSION_KEY;
  const pendingMembershipRefKey = PENDING_MEMBERSHIP_REF_KEY;
  const persistPaymentConsent = (checked) => {
    if (typeof window === 'undefined') return;

    sessionStorage.setItem(membershipPaymentConsentKey, checked ? '1' : '0');

    try {
      const stored = sessionStorage.getItem(membershipDraftFormStorageKey);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      sessionStorage.setItem(
        membershipDraftFormStorageKey,
        JSON.stringify({ ...parsed, paymentConsentChecked: checked })
      );
    } catch {
      // Ignore invalid cached draft payloads.
    }
  };
  const trimPaymentLogValue = (value, keep = 18) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '(none)';
    return normalized.length > keep ? `${normalized.slice(0, keep)}...` : normalized;
  };
  const membershipBaseAmount = isVerifiedNricSignupFlow
    ? membershipFeeConfig.verifiedBaseAmount
    : membershipFeeConfig.baseAmount;
  const gstRate = (membershipFeeConfig.gstRatePercent || 0) / 100;
  const standardGstAmount = membershipBaseAmount * gstRate;
  const standardTotalAmount = membershipBaseAmount + standardGstAmount;
  const affiliateDiscountApplied = affiliatePricing?.discountApplied === true;
  const gstAmount = affiliateDiscountApplied ? 0 : standardGstAmount;
  const totalAmount = affiliateDiscountApplied
    ? Number(affiliatePricing?.payableAmount ?? membershipFeeConfig.voucherDiscountAmount)
    : standardTotalAmount;
  const currencyLabel = String(membershipFeeConfig.currency || 'SGD').toUpperCase();
  const appliedPromoCodes = [
    ...new Set(
      [
        affiliatePricing?.appliedCode,
        affiliatePricing?.affiliateCode,
        affiliatePricing?.voucherCode,
      ]
        .map((code) => String(code || '').trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
  const verifiedPromoCodeLabel = appliedPromoCodes.join(', ') || '—';
  const isVerifiedSignupSignInOnlyState =
    isVerifiedNricSignupFlow
    && !!verifiedSignupAccessError
    && verifiedSignupAccessError.toLowerCase().includes('sign in');
  const signInHref = returnTo
    ? `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(returnTo)}`
    : paths.auth.simple.signIn;
  const buildPaymentCompleteSignInHref = () => paths.auth.oauth.start;
  const membershipInfoText = affiliateDiscountApplied
    ? `Promo code applied. Discounted rate: ${currencyLabel} ${totalAmount.toFixed(2)} (no separate GST).`
    : isVerifiedNricSignupFlow
      ? `Verified document membership rate applied. Base fee is ${currencyLabel} ${membershipBaseAmount.toFixed(2)} (excluding GST).`
      : `Membership paid plan selected. Base fee is ${currencyLabel} ${membershipBaseAmount.toFixed(2)} (excluding GST).`;
  const membershipSource = isVerifiedNricSignupFlow ? 'membership-verified-signup' : 'membership-paid-signup';
  const membershipBadgeLabel = affiliateDiscountApplied
    ? 'Promo applied'
    : isVerifiedNricSignupFlow ? 'Discount applied' : 'GST included';
  const isPaymentReturnProcessing = paymentConfirming;
  const membershipDraftRestoredRef = useRef(false);
  const normalizedPaymentRef =
    paymentRef || (typeof window !== 'undefined' ? sessionStorage.getItem(pendingMembershipRefKey) || '' : '');
  const normalizedPaymentSessionId =
    paymentSessionId && !paymentSessionId.includes('{CHECKOUT_SESSION_ID}') ? paymentSessionId : '';

  const resolveMembershipPaymentNotice = (error, phase = 'confirm') => {
    const fallbackMessage =
      phase === 'start'
        ? 'Could not start membership payment.'
        : 'We could not confirm your payment yet. Please try again.';
    const message = error?.message || String(error || fallbackMessage);
    const normalizedMessage = String(message || fallbackMessage).trim() || fallbackMessage;
    const lowerMessage = normalizedMessage.toLowerCase();

    if (lowerMessage.includes('still being processed') || lowerMessage.includes('not completed yet')) {
      return {
        severity: 'warning',
        message: 'Payment is still being verified. Please wait a moment and try again.',
      };
    }

    if (
      lowerMessage.includes('not completed successfully')
      || lowerMessage.includes('payment was not completed')
      || lowerMessage.includes('canceled')
      || lowerMessage.includes('cancelled')
      || lowerMessage.includes('expired')
    ) {
      return {
        severity: 'warning',
        message: normalizedMessage,
      };
    }

    return {
      severity: 'error',
      message: normalizedMessage,
    };
  };

  const defaultValues = {
    username: '',
    salutation: '',
    firstName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    password: '',
    ...INDIVIDUAL_SIGNUP_DEFAULT_VALUES,
  };

  const signUpSchema = useMemo(
    () =>
      isCompanyQrEnrollmentFlow
        ? buildCompanyQrEnrollmentSignUpSchema()
        : buildPaidIndividualSignUpSchema(),
    [isCompanyQrEnrollmentFlow]
  );

  const methods = useForm({
    resolver: zodResolver(signUpSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    getValues,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = methods;
  const usernameValue = watch('username');
  const emailValue = watch('email');
  const jobFunctionValue = watch('jobFunction');
  const companyCodeValue = watch('companyCode');
  const promoCodeValue = watch('promoCode');
  const prevCompanyCodeRef = useRef(companyCodeValue);
  const suppressCompanyCodeClearRef = useRef(false);

  const applyPromoCode = useCallback(async (codeOverride) => {
    const code = String(codeOverride ?? getValues('promoCode') ?? '').trim().toUpperCase();
    if (!code) {
      setAffiliatePricing({ discountApplied: false, error: 'Enter a code to apply.' });
      return;
    }

    setAffiliateValidating(true);
    try {
      const result = await validateCode(code);
      if (result?.valid) {
        const exactCode = String(result?.appliedCode || code).trim().toUpperCase();
        appliedPromoInputRef.current = exactCode;
        setValue('promoCode', exactCode);
        setAffiliatePricing({
          discountApplied: true,
          payableAmount: Number(result?.payableAmount ?? membershipFeeConfig.voucherDiscountAmount),
          currency: result?.currency || membershipFeeConfig.currency,
          appliedCode: exactCode,
          affiliateCode: result?.affiliateCode || undefined,
          voucherCode: result?.voucherCode || undefined,
          codeType: result?.codeType || undefined,
          message: result?.message || 'Promo code applied. Discounted rate applied below.',
        });
      } else {
        appliedPromoInputRef.current = '';
        setAffiliatePricing({
          discountApplied: false,
          error: result?.message || 'This code is invalid or expired.',
        });
      }
    } catch (error) {
      appliedPromoInputRef.current = '';
      setAffiliatePricing({
        discountApplied: false,
        error: error?.message || 'Could not validate this code. Please try again.',
      });
    } finally {
      setAffiliateValidating(false);
    }
  }, [getValues, membershipFeeConfig, setValue]);

  useEffect(() => {
    const normalized = String(promoCodeValue || '').trim().toUpperCase();
    if (appliedPromoInputRef.current && normalized !== appliedPromoInputRef.current) {
      appliedPromoInputRef.current = '';
      setAffiliatePricing(null);
    }
  }, [promoCodeValue]);

  useEffect(() => {
    let active = true;
    appSettingsService
      .getMembershipPaymentSettings()
      .then((config) => {
        if (!active || !config) return;
        setMembershipFeeConfig({
          currency: config.currency || 'SGD',
          baseAmount: Number(config.baseAmount) || 365.14,
          verifiedBaseAmount: Number(config.verifiedBaseAmount) || 300,
          gstRatePercent: Number(config.gstRatePercent) || 9,
          voucherDiscountAmount: Number(config.voucherDiscountAmount) || 100,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isMembershipFeeFlow) return;
    const isPaymentReturn = paymentState === 'success' || paymentState === 'canceled';
    if (isPaymentReturn) return;

    const refCode = lockedReferralCode;
    if (!refCode) return;

    sessionStorage.setItem(AFFILIATE_REF_STORAGE_KEY, refCode);
    setValue('promoCode', refCode);

    if (affiliateTrackedRef.current === refCode) return;
    affiliateTrackedRef.current = refCode;

    trackAffiliateClick({ affiliateCode: refCode, landingPath: window.location.pathname }).catch(() => {});
    applyPromoCode(refCode);
  }, [
    applyPromoCode,
    isMembershipFeeFlow,
    lockedReferralCode,
    paymentState,
    setValue,
  ]);

  useEffect(() => {
    const existsMessage = SALESFORCE_EMAIL_EXISTS_MESSAGE.toLowerCase();
    setErrorMsg((current) =>
      String(current || '').toLowerCase().includes(existsMessage) ? '' : current
    );
    setPaymentNotice((current) =>
      String(current?.message || '').toLowerCase().includes(existsMessage) ? null : current
    );
  }, [emailValue]);

  const showSalesforceEmailError = (message) => {
    if (isMembershipFeeFlow) {
      setPaymentNotice({ severity: 'error', message });
      setErrorMsg('');
      return;
    }
    setErrorMsg(message);
    setPaymentNotice(null);
  };

  const handleEmailBlur = async () => {
    const email = String(getValues('email') || '').trim();
    if (!email || !email.includes('@')) return;
    setEmailSfChecking(true);
    try {
      const emailCheck = await assertSalesforceEmailAvailable(email);
      if (!emailCheck.ok) {
        showSalesforceEmailError(emailCheck.message);
      }
    } finally {
      setEmailSfChecking(false);
    }
  };

  useEffect(() => {
    if (prevCompanyCodeRef.current === companyCodeValue) return;

    if (suppressCompanyCodeClearRef.current) {
      suppressCompanyCodeClearRef.current = false;
      prevCompanyCodeRef.current = companyCodeValue;
      return;
    }

    if (isCompanyCodeLockedFromQr) {
      prevCompanyCodeRef.current = companyCodeValue;
      return;
    }

    prevCompanyCodeRef.current = companyCodeValue;
    // User changed the company reference — clear auto-filled company name.
    setCompanyReferenceVerified(null);
    setCompanyVerifiedName('');
    setValue('company', '');
    setCompanyPrefilled(false);
  }, [companyCodeValue, isCompanyCodeLockedFromQr, setValue]);

  // Company QR / deep-link: validate invite (expiry / seat limit), then prefill company code.
  useEffect(() => {
    if (!isCompanyQrEnrollmentFlow) {
      setQrEnrollmentLoading(false);
      setQrEnrollmentError('');
      setQrEnrollmentReady(false);
      return undefined;
    }

    let active = true;
    const code = companyCodeFromUrl.toUpperCase();

    setQrEnrollmentLoading(true);
    setQrEnrollmentError('');
    setQrEnrollmentReady(false);

    (async () => {
      try {
        const validation = await validateCompanyEnrollment({
          companyCode: code,
          viaQr: true,
        });

        if (!active) return;

        if (!validation?.valid) {
          const reason = String(validation?.reason || '');
          const message =
            String(validation?.message || '').trim()
            || (reason === 'qr_expired'
              ? 'This QR Code has expired. Please request a new QR Code.'
              : reason === 'quota_full'
                ? 'Enrollment limit has been reached. Please contact your company administrator.'
                : 'This company enrollment invite is not available.');
          setQrEnrollmentError(message);
          setCompanyReferenceVerified(false);
          setCompanyVerifiedName('');
          return;
        }

        const companyName = String(validation?.label || '').trim() || code;
        suppressCompanyCodeClearRef.current = true;
        setValue('companyCode', code);
        prevCompanyCodeRef.current = code;
        setCompanyReferenceVerified(true);
        setCompanyVerifiedName(companyName);
        if (companyName) {
          setValue('company', companyName);
          setCompanyPrefilled(true);
        }
        setEligibilityData((prev) => ({
          ...(prev || {}),
          snapshot: {
            ...(prev?.snapshot && typeof prev.snapshot === 'object' ? prev.snapshot : {}),
            companyReferenceId: code,
            companyReferenceConfirmed: true,
            companyEnrollmentViaQr: true,
            companyVerifiedName: companyName,
          },
        }));
        setQrEnrollmentReady(true);

        // Best-effort: enrich company display name from corporate / Salesforce lookup.
        try {
          const result = await verifyCompanyReference({ companyReferenceId: code });
          if (!active || result?.verified !== true) return;
          const resolvedName = String(result?.name || '').trim();
          if (!resolvedName) return;
          setCompanyVerifiedName(resolvedName);
          setValue('company', resolvedName);
          setCompanyPrefilled(true);
          setEligibilityData((prev) => ({
            ...(prev || {}),
            snapshot: {
              ...(prev?.snapshot && typeof prev.snapshot === 'object' ? prev.snapshot : {}),
              companyVerifiedName: resolvedName,
            },
          }));
        } catch {
          // Invite already validated — keep label/code as company name.
        }
      } catch (error) {
        if (!active) return;
        const apiMessage = error?.response?.data?.message;
        const normalizedMessage = Array.isArray(apiMessage) ? apiMessage.join(', ') : apiMessage;
        const message =
          String(normalizedMessage || error?.message || '').trim()
          || 'Unable to validate this QR enrollment invite. Please try again or contact your company administrator.';
        setQrEnrollmentError(message);
        setCompanyReferenceVerified(false);
      } finally {
        if (active) setQrEnrollmentLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [companyCodeFromUrl, isCompanyQrEnrollmentFlow, setValue]);

  // Non-QR company deep-link: prefill company code when present in URL.
  useEffect(() => {
    if (isCompanyQrEnrollmentFlow || !companyCodeFromUrl) return;
    const code = companyCodeFromUrl.toUpperCase();
    suppressCompanyCodeClearRef.current = true;
    setValue('companyCode', code);
    prevCompanyCodeRef.current = code;
    setCompanyReferenceVerified(true);
    setEligibilityData((prev) => ({
      ...(prev || {}),
      snapshot: {
        ...(prev?.snapshot && typeof prev.snapshot === 'object' ? prev.snapshot : {}),
        companyReferenceId: code,
        companyReferenceConfirmed: true,
        companyEnrollmentViaQr: false,
      },
    }));
  }, [companyCodeFromUrl, isCompanyQrEnrollmentFlow, setValue]);

  useEffect(() => {
    const snapshot = eligibilityData?.snapshot;
    if (!snapshot || snapshot.companyReferenceConfirmed !== true) return;
    const code = String(snapshot.companyReferenceId || '').trim();
    if (!code) return;
    if (!getValues('companyCode')) {
      suppressCompanyCodeClearRef.current = true;
      setValue('companyCode', code);
    }
    prevCompanyCodeRef.current = code;
    setCompanyReferenceVerified(true);
    const verifiedName = String(snapshot.companyVerifiedName || '').trim();
    setCompanyVerifiedName(verifiedName);
    if (verifiedName && !String(getValues('company') || '').trim()) {
      suppressCompanyCodeClearRef.current = true;
      setValue('company', verifiedName);
      setCompanyPrefilled(true);
    }
  }, [eligibilityData, getValues, setValue]);

  useEffect(() => {
    let active = true;

    if (!isVerifiedNricSignupFlow) {
      setVerifiedSignupLoading(false);
      setVerifiedSignupAccessError('');
      setVerifiedSignupPrefill(null);
      return () => {
        active = false;
      };
    }

    if (!signupAccessToken) {
      setVerifiedSignupLoading(false);
      setVerifiedSignupAccessError('This verified signup link is invalid or missing. Please run NRIC verification again.');
      setVerifiedSignupPrefill(null);
      return () => {
        active = false;
      };
    }

    // After Stripe return, keep draft form values — do not overwrite with prefill.
    if (paymentState === 'success') {
      setVerifiedSignupLoading(false);
      setVerifiedSignupAccessError('');
      return () => {
        active = false;
      };
    }

    setVerifiedSignupLoading(true);
    setVerifiedSignupAccessError('');

    getVerifiedSignupAccess({ token: signupAccessToken })
      .then((response) => {
        if (!active) return;
        const prefill = response?.prefill || {};
        setVerifiedSignupPrefill(prefill);
        reset({
          username: prefill.username || '',
          firstName: prefill.firstName || '',
          lastName: prefill.lastName || '',
          email: prefill.email || '',
          contactNumber: prefill.contactNumber || '',
          password: '',
          ...INDIVIDUAL_SIGNUP_DEFAULT_VALUES,
          nricFin: prefill.nricFin || '',
          idType: prefill.idType || '',
        });
      })
      .catch((error) => {
        if (!active) return;
        setVerifiedSignupPrefill(null);
        setVerifiedSignupAccessError(
          error?.message || 'Verified signup access is invalid or expired. Please run NRIC verification again.'
        );
      })
      .finally(() => {
        if (!active) return;
        setVerifiedSignupLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isVerifiedNricSignupFlow, paymentState, reset, signupAccessToken]);

  useEffect(() => {
    if (!isFreeIndividualSignup || freeSignupPrefillRestoredRef.current) {
      return;
    }

    try {
      let flow = null;
      let storedValues = {};
      let membershipOutcomeFromStorage = '';

      const draftRaw = sessionStorage.getItem(membershipDraftFormStorageKey);
      if (draftRaw) {
        const parsed = JSON.parse(draftRaw);
        storedValues = parsed?.values || {};
        flow = parsed?.flow || null;
        membershipOutcomeFromStorage = parsed?.membershipOutcome || '';
      }

      const eligibilityRaw = sessionStorage.getItem(membershipEligibilityStorageKey);
      if (eligibilityRaw) {
        const parsed = JSON.parse(eligibilityRaw);
        flow = flow || parsed?.flow || null;
        membershipOutcomeFromStorage = membershipOutcomeFromStorage || parsed?.membershipOutcome || '';
        if (flow) {
          setEligibilityData(buildEligibilityDataFromFlow(flow, membershipOutcomeFromStorage));
        }
      }

      if (!flow && !storedValues.company && !storedValues.nricFin) {
        return;
      }

      const prefill = buildIndividualSignupPrefillFromEligibility(flow || {}, storedValues);
      const nextCompanyCode = prefill.companyCode || '';
      prevCompanyCodeRef.current = nextCompanyCode || prevCompanyCodeRef.current;
      setCompanyPrefilled(prefill.companyPrefilled);
      setNricVerifiedReadOnly(prefill.nricVerified);
      if (nextCompanyCode && prefill.company) {
        setCompanyReferenceVerified(true);
        setCompanyVerifiedName(prefill.company);
      }

      reset((current) => ({
        ...current,
        company: prefill.company || current.company,
        companyCode: prefill.companyCode || current.companyCode,
        jobFunction: prefill.jobFunction || current.jobFunction,
        jobFunctionOther: prefill.jobFunctionOther || current.jobFunctionOther,
        yearsOfExperience: prefill.yearsOfExperience || current.yearsOfExperience,
        countryOfResidence: prefill.countryOfResidence || current.countryOfResidence,
        nricFin: prefill.nricFin || current.nricFin,
        idType: prefill.idType || current.idType,
        citizenship: prefill.citizenship || current.citizenship,
        citizenshipOther: prefill.citizenshipOther || current.citizenshipOther,
        imdaFundingAcknowledged: prefill.imdaFundingAcknowledged || current.imdaFundingAcknowledged,
      }));
      freeSignupPrefillRestoredRef.current = true;
    } catch {
      // Ignore invalid cached signup payloads.
    }
  }, [
    isFreeIndividualSignup,
    membershipDraftFormStorageKey,
    membershipEligibilityStorageKey,
    reset,
  ]);

  useEffect(() => {
    if (!isMembershipFeeFlow) {
      return;
    }

    setEligibilityData(null);

    try {
      const stored = sessionStorage.getItem(membershipEligibilityStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.membershipOutcome !== membershipOutcome || !parsed?.flow) return;
      setEligibilityData(buildEligibilityDataFromFlow(parsed.flow, parsed.membershipOutcome));
    } catch {
      // Ignore invalid cached eligibility payloads.
    }
  }, [isMembershipFeeFlow, membershipEligibilityStorageKey, membershipOutcome]);

  useEffect(() => {
    if (!isMembershipFeeFlow || membershipDraftRestoredRef.current || !eligibilityData?.snapshot) {
      return;
    }

    const prefill = buildIndividualSignupPrefillFromEligibility(eligibilityData.snapshot, getValues());
    if (prefill.company && !getValues('company')) {
      setValue('company', prefill.company);
      setCompanyPrefilled(prefill.companyPrefilled);
    }
  }, [eligibilityData, getValues, isMembershipFeeFlow, setValue]);

  useEffect(() => {
    if (!isMembershipFeeFlow) {
      membershipDraftRestoredRef.current = false;
      setScaqSsoPrefillNotice(false);
      return;
    }

    try {
      const storedConsent = sessionStorage.getItem(membershipPaymentConsentKey);
      if (storedConsent === '1') {
        setPaymentConsentChecked(true);
      }

      if (membershipDraftRestoredRef.current) {
        return;
      }

      const stored = sessionStorage.getItem(membershipDraftFormStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.membershipOutcome !== membershipOutcome || !parsed?.values) return;

      if (isPaidMembershipFlow && isApprovedSalesforceStudentMember(parsed?.salesforce)) {
        sessionStorage.removeItem(membershipDraftFormStorageKey);
        startStudentMemberSsoLogin(returnTo || paths.learning);
        return;
      }

      if (parsed?.flow) {
        setEligibilityData(buildEligibilityDataFromFlow(parsed.flow, membershipOutcome));
      } else if (parsed?.eligibility) {
        setEligibilityData(parsed.eligibility);
      }

      if (parsed?.prefillSource === 'scaq-sso-rejected') {
        setScaqSsoPrefillNotice(true);
      }

      if (parsed?.paymentConsentChecked) {
        setPaymentConsentChecked(true);
      }

      const profilePrefill = buildIndividualSignupPrefillFromEligibility(parsed?.flow || {}, parsed.values || {});
      const restoredCompany =
        profilePrefill.company
        || parsed.values.company
        || parsed.companyVerifiedName
        || '';
      const restoredCompanyCode = profilePrefill.companyCode || parsed.values.companyCode || '';

      // Prevent companyCode watch effect from clearing company after payment return restore.
      suppressCompanyCodeClearRef.current = true;
      prevCompanyCodeRef.current = restoredCompanyCode;
      setCompanyPrefilled(Boolean(restoredCompany) && (profilePrefill.companyPrefilled || Boolean(restoredCompanyCode)));
      if (restoredCompanyCode && restoredCompany) {
        setCompanyReferenceVerified(true);
        setCompanyVerifiedName(restoredCompany);
      } else if (restoredCompany) {
        setCompanyVerifiedName(restoredCompany);
      }

      reset({
        ...INDIVIDUAL_SIGNUP_DEFAULT_VALUES,
        salutation: parsed.values.salutation || '',
        username: parsed.values.username || '',
        firstName: parsed.values.firstName || '',
        lastName: parsed.values.lastName || '',
        email: parsed.values.email || '',
        contactNumber: parsed.values.contactNumber || '',
        password: parsed.values.password || '',
        company: restoredCompany,
        companyCode: restoredCompanyCode,
        jobFunction: profilePrefill.jobFunction || parsed.values.jobFunction || '',
        jobFunctionOther: profilePrefill.jobFunctionOther || parsed.values.jobFunctionOther || '',
        yearsOfExperience:
          profilePrefill.yearsOfExperience || parsed.values.yearsOfExperience || '',
        countryOfResidence:
          profilePrefill.countryOfResidence || parsed.values.countryOfResidence || '',
        promoCode: lockedReferralCode || parsed.values.promoCode || '',
      });

      // Re-apply after reset settles — guards against race with companyCode wipe effect.
      if (restoredCompany) {
        queueMicrotask(() => {
          suppressCompanyCodeClearRef.current = true;
          prevCompanyCodeRef.current = restoredCompanyCode;
          setValue('company', restoredCompany);
          if (restoredCompanyCode) {
            setValue('companyCode', restoredCompanyCode);
          }
        });
      }

      if (parsed?.affiliatePricing?.discountApplied) {
        appliedPromoInputRef.current = String(parsed.affiliatePricing.appliedCode || '').trim().toUpperCase();
        setAffiliatePricing(parsed.affiliatePricing);
      }

      membershipDraftRestoredRef.current = true;
    } catch {
      // Ignore invalid cached draft payloads.
    }
  }, [
    isMembershipFeeFlow,
    isPaidMembershipFlow,
    lockedReferralCode,
    membershipDraftFormStorageKey,
    membershipOutcome,
    membershipPaymentConsentKey,
    returnTo,
    reset,
    setValue,
  ]);

  // IP-based default for Country of residence (skip if draft/prefill already set a value).
  useEffect(() => {
    if (!isMembershipFeeFlow && !isCompanyQrEnrollmentFlow) return undefined;
    if (verifiedSignupLoading) return undefined;

    let active = true;

    void (async () => {
      // Let draft/prefill restore effects run first.
      await Promise.resolve();
      if (!active) return;

      if (String(getValues('countryOfResidence') || '').trim()) return;

      const detected = await detectCountryOfResidenceFromIp();
      if (!active) return;

      if (String(getValues('countryOfResidence') || '').trim()) return;

      setValue('countryOfResidence', detected, {
        shouldDirty: false,
        shouldValidate: false,
      });
    })();

    return () => {
      active = false;
    };
  }, [
    getValues,
    isCompanyQrEnrollmentFlow,
    isMembershipFeeFlow,
    setValue,
    verifiedSignupLoading,
  ]);

  useEffect(() => {
    if (!isMembershipFeeFlow || paymentState !== 'canceled') return undefined;

    let active = true;
    const draftUserId =
      typeof window !== 'undefined' ? sessionStorage.getItem('membershipDraftUserId') || '' : '';
    const refId =
      typeof window !== 'undefined' ? sessionStorage.getItem(pendingMembershipRefKey) || paymentRef || '' : '';

    (async () => {
      try {
        if (draftUserId) {
          await abandonMembershipCheckout({
            draftUserId,
            ref: refId || undefined,
          });
        }
      } catch (error) {
        console.warn('[MembershipPayment] Draft abandon on cancel failed', {
          message: error?.message,
        });
      } finally {
        if (!active) return;
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('membershipDraftUserId');
          sessionStorage.removeItem(pendingMembershipSessionKey);
          sessionStorage.removeItem(pendingMembershipRefKey);
          sessionStorage.removeItem('salesforceNexusUsername');
          if (refId) {
            sessionStorage.removeItem(getMembershipSalesforceSyncStorageKey(refId));
          }
        }
        setPaymentNotice({
          severity: 'warning',
          message:
            'Payment was not completed. No account was created. Your form details are still on this page — you can pay again when ready.',
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [
    isMembershipFeeFlow,
    paymentRef,
    paymentState,
    pendingMembershipRefKey,
    pendingMembershipSessionKey,
  ]);

  useEffect(() => {
    if (!paymentCompletedState) {
      return undefined;
    }

    if (paymentRedirectCountdown <= 0) {
      clearMembershipSignupClientDraftStorage();
      router.replace(buildPaymentCompleteSignInHref());
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPaymentRedirectCountdown((current) => current - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [buildPaymentCompleteSignInHref, paymentCompletedState, paymentRedirectCountdown, router]);

  useEffect(() => {
    if (!isMembershipFeeFlow || paymentState !== 'success') {
      return undefined;
    }

    if (!normalizedPaymentRef) {
      setPaymentNotice({
        severity: 'error',
        message: 'We could not find your payment reference. Please return to the signup page and try again.',
      });
      setErrorMsg('');
      return undefined;
    }

    let active = true;
    const fallbackSessionId =
      normalizedPaymentSessionId
      || (typeof window !== 'undefined' ? sessionStorage.getItem(pendingMembershipSessionKey) || '' : '');

    setPaymentConfirming(true);
    setPaymentCompletedState(null);
    setPaymentRedirectCountdown(15);
    setPaymentNotice(null);
    setErrorMsg('');
    console.info('[MembershipPayment] Confirmation started (verify → local account → Salesforce)', {
      refId: trimPaymentLogValue(normalizedPaymentRef),
      sessionId: trimPaymentLogValue(fallbackSessionId),
    });

    (async () => {
      try {
        // Government-grade order:
        // 1) Verify charged amount with payment provider (no Salesforce before paid proof)
        // 2) Finalize local account only after payment is verified
        // 3) Salesforce sync after local success (never create SF on failed/canceled payment)
        const formValues = getValues();
        console.info('[MembershipPayment] Payment verify START');
        const verifiedPayment = await verifyMembershipPayment({
          ref: normalizedPaymentRef,
          sessionId: fallbackSessionId,
        });
        if (!active) return;

        const verifiedAmount = Number(verifiedPayment?.paidAmount);
        if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0 || !verifiedPayment?.paymentProofToken) {
          throw new Error('Payment verification did not return a valid charged amount.');
        }

        console.info('[MembershipPayment] Payment verify SUCCESS', {
          refId: trimPaymentLogValue(normalizedPaymentRef),
          paidAmount: verifiedAmount,
          currency: verifiedPayment?.currency,
        });

        const response = await confirmMembershipPayment({
          ref: normalizedPaymentRef,
          sessionId: fallbackSessionId,
        });
        if (!active) return;

        console.info('[MembershipPayment] Local confirmation success', {
          refId: trimPaymentLogValue(normalizedPaymentRef),
          userId: trimPaymentLogValue(response?.userId),
          paidAmount: response?.paidAmount,
        });

        let salesforceSyncWarning = '';
        try {
          console.info('[MembershipPayment] Salesforce sync START', {
            refId: trimPaymentLogValue(normalizedPaymentRef),
            paidAmount: verifiedAmount,
          });
          await runMembershipSalesforceSyncOnce(normalizedPaymentRef, () =>
            ensureSalesforceNexusUserForMembershipSignup(formValues, {
              isPaid: true,
              paidAmount: verifiedAmount,
              paidDate: verifiedPayment.paidDate || new Date().toISOString().slice(0, 10),
              paymentProofToken: verifiedPayment.paymentProofToken,
              forceCreate: true,
              paymentRefId: normalizedPaymentRef,
            })
          );
          console.info('[MembershipPayment] Salesforce sync SUCCESS');
        } catch (sfError) {
          salesforceSyncWarning =
            sfError?.message
            || 'Payment succeeded and your account was created, but eServices sync needs attention. Please contact support if you cannot sign in to eServices.';
          console.error('[MembershipPayment] Salesforce sync FAILED after paid local account', {
            refId: trimPaymentLogValue(normalizedPaymentRef),
            message: salesforceSyncWarning,
          });
        }
        if (!active) return;

        const successItemName = affiliateDiscountApplied
          ? 'ISCA membership (promo)'
          : isVerifiedNricSignupFlow
            ? 'ISCA membership (verified rate)'
            : 'ISCA membership';
        const successMemberName = [formValues.firstName, formValues.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();
        const successPaidAmount = Number(response?.paidAmount ?? verifiedAmount) || verifiedAmount;
        const successCurrency = verifiedPayment?.currency || currencyLabel || 'SGD';

        // Payment + account success: wipe all client draft state so the next visitor
        // does not see a pre-filled membership form on this browser.
        clearMembershipSignupClientDraftStorage(normalizedPaymentRef);
        membershipDraftRestoredRef.current = false;
        setAffiliatePricing(null);
        appliedPromoInputRef.current = '';
        setPaymentConsentChecked(false);
        setEligibilityData(null);
        reset({ ...INDIVIDUAL_SIGNUP_DEFAULT_VALUES });

        const verifiedEmail = response?.email || formValues.email || '';
        if (salesforceSyncWarning) {
          setPaymentNotice({
            severity: 'warning',
            message: salesforceSyncWarning,
          });
        } else {
          setPaymentNotice(null);
        }
        setPaymentCompletedState({
          email: verifiedEmail,
          userId: response?.userId || '',
          paidAmount: successPaidAmount,
          currency: successCurrency,
          memberName: successMemberName,
          paymentRef: normalizedPaymentRef,
          itemName: successItemName,
        });
        setPaymentRedirectCountdown(15);
      } catch (error) {
        if (!active) return;
        const lowerMessage = String(error?.message || '').toLowerCase();
        const paymentStillPending = lowerMessage.includes('still being processed');
        const paymentFailedWithoutAccount =
          !paymentStillPending
          && (
            lowerMessage.includes('not completed successfully')
            || lowerMessage.includes('payment was not completed')
            || lowerMessage.includes('payment amount validation failed')
            || lowerMessage.includes('currency validation failed')
            || lowerMessage.includes('does not match your')
            || lowerMessage.includes('could not validate')
            || lowerMessage.includes('valid charged amount')
          );

        if (paymentFailedWithoutAccount && typeof window !== 'undefined') {
          const draftUserId = sessionStorage.getItem('membershipDraftUserId') || '';
          if (draftUserId) {
            try {
              await abandonMembershipCheckout({
                draftUserId,
                ref: normalizedPaymentRef,
              });
            } catch (abandonError) {
              console.warn('[MembershipPayment] Draft abandon after failed payment skipped', {
                message: abandonError?.message,
              });
            }
            sessionStorage.removeItem('membershipDraftUserId');
            sessionStorage.removeItem(pendingMembershipSessionKey);
            sessionStorage.removeItem(pendingMembershipRefKey);
          }
        }

        const notice = paymentFailedWithoutAccount
          ? {
              severity: 'error',
              message:
                `${error?.message || 'Payment was not completed.'} No account was created.`,
            }
          : resolveMembershipPaymentNotice(error, 'confirm');
        console.error('[MembershipPayment] Confirmation failed', {
          refId: trimPaymentLogValue(normalizedPaymentRef),
          sessionId: trimPaymentLogValue(fallbackSessionId),
          phase: paymentFailedWithoutAccount ? 'payment' : 'local',
          message: notice.message,
        });
        setPaymentNotice(notice);
        setErrorMsg('');
      } finally {
        if (!active) return;
        setPaymentConfirming(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    getValues,
    isMembershipFeeFlow,
    membershipDraftFormStorageKey,
    membershipEligibilityStorageKey,
    normalizedPaymentRef,
    normalizedPaymentSessionId,
    paymentState,
    pendingMembershipRefKey,
    pendingMembershipSessionKey,
    reset,
    router,
  ]);

  const buildUsernameSuggestions = (username, count = 10) => {
    const base = String(username || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 14);

    if (!base) return [];

    const randomTwoDigits = () => Math.floor(Math.random() * 90 + 10).toString();
    const candidates = new Set();
    const targetSize = count;

    while (candidates.size < targetSize) {
      candidates.add(`${base}${randomTwoDigits()}`);
    }

    // Keep unique + valid by your current username rules.
    return [...candidates]
      .filter((name) => /^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/i.test(name))
      .slice(0, count);
  };

  const applyUsernameSuggestion = (suggestion) => {
    methods.setValue('username', suggestion, { shouldDirty: true, shouldValidate: true });
    setErrorMsg('');
    setAppliedSuggestion(suggestion);
    setUsernameSuggestions([]);
    setShowAllSuggestions(false);
  };

  const buildSubmittedEligibilityData = (data) =>
    mergeSignupEligibilityData(eligibilityData, data, isFreeIndividualSignup);

  const resolveSignupCompanyCode = () => {
    if (companyReferenceVerified === true) {
      const code = String(getValues('companyCode') || '').trim();
      if (code) return code;
    }
    if (companyCodeFromUrl) {
      return companyCodeFromUrl;
    }
    const snapshot = eligibilityData?.snapshot;
    if (!snapshot || typeof snapshot !== 'object') return undefined;
    if (snapshot.companyReferenceConfirmed !== true) return undefined;
    const code = String(snapshot.companyReferenceId || '').trim();
    return code || undefined;
  };

  const handleVerifyCompanyReference = async () => {
    const referenceId = String(companyCodeValue || '').trim();
    if (!referenceId || companyReferenceVerifying) return;

    setCompanyReferenceVerifying(true);
    try {
      const result = await verifyCompanyReference({ companyReferenceId: referenceId });
      const verified = result?.verified === true;
      const resolvedCode = String(result?.companyCode || referenceId).trim();
      const companyName = String(result?.name || '').trim();

      if (!verified) {
        setCompanyReferenceVerified(false);
        setCompanyVerifiedName('');
        setValue('company', '');
        setCompanyPrefilled(false);
        return;
      }

      setValue('companyCode', resolvedCode);
      prevCompanyCodeRef.current = resolvedCode;
      setCompanyReferenceVerified(true);
      setCompanyVerifiedName(companyName || '');
      setValue('company', companyName || '');
      setCompanyPrefilled(Boolean(companyName));
    } catch {
      setCompanyReferenceVerified(false);
      setCompanyVerifiedName('');
      setValue('company', '');
      setCompanyPrefilled(false);
    } finally {
      setCompanyReferenceVerifying(false);
    }
  };

  const ensureSalesforceNexusUserForMembershipSignup = async (data, paymentMeta = {}) => {
    // Paid membership must never create Salesforce accounts without verified payment proof.
    if (paymentMeta.isPaid === true && !String(paymentMeta.paymentProofToken || '').trim()) {
      throw new Error(
        'Salesforce account cannot be created before payment is verified. Please complete payment first.'
      );
    }

    let flow = eligibilityData?.snapshot || null;
    let storedValues = {};

    if (typeof window !== 'undefined') {
      try {
        const draftRaw = sessionStorage.getItem(membershipDraftFormStorageKey);
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw);
          flow = flow || parsed?.flow || null;
          storedValues = parsed?.values || {};
        }
      } catch {
        // ignore invalid draft payloads
      }
    }

    const { idType, idNumber } = resolveVerifiedNricSalesforceFields({
      flow,
      storedValues,
      formData: { ...storedValues, ...data },
      eligibilityData,
      verifiedPrefill: verifiedSignupPrefill,
    });

    const salesforceUsernameKey = 'salesforceNexusUsername';
    // QR enrollment must always hit signupfornexus — never reuse a stale cached SF username.
    const forceCreate = paymentMeta.forceCreate === true || isCompanyQrEnrollmentFlow;
    if (typeof window !== 'undefined') {
      const existing = sessionStorage.getItem(salesforceUsernameKey);
      if (existing && !forceCreate) {
        return existing;
      }
    }

    const formValues = {
      salutation: data?.salutation || storedValues?.salutation || '',
      firstName: data?.firstName || storedValues?.firstName || '',
      lastName: data?.lastName || storedValues?.lastName || '',
      email: data?.email || storedValues?.email || '',
      company: data?.company || storedValues?.company || companyVerifiedName || '',
      jobFunction: data?.jobFunction || storedValues?.jobFunction || '',
      jobFunctionOther: data?.jobFunctionOther || storedValues?.jobFunctionOther || '',
      countryOfResidence: data?.countryOfResidence || storedValues?.countryOfResidence || '',
      yearsOfExperience: data?.yearsOfExperience ?? storedValues?.yearsOfExperience ?? '',
      password: data?.password || storedValues?.password || '',
    };

    const resolvedJobFunction = resolveIndividualSignupJobFunctionLabel(
      formValues.jobFunction,
      formValues.jobFunctionOther
    );
    const nameAsPerId = [formValues.firstName, formValues.lastName].filter(Boolean).join(' ').trim();

    if (isCompanyQrEnrollmentFlow) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(salesforceUsernameKey);
      }
      console.info('[CompanyQrEnrollment] Creating Salesforce account via signupfornexus', {
        email: formValues.email,
        companyCode: resolveSignupCompanyCode(),
      });

      const createResult = await signupSalesforceForNexus(
        buildSalesforceSignupForNexusPayloadFromSignup({
          salutation: formValues.salutation,
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          email: formValues.email,
          company: formValues.company,
          jobFunction: resolvedJobFunction,
          countryOfResidence: formValues.countryOfResidence,
          companyCode: resolveSignupCompanyCode() || companyCodeFromUrl,
          yearsOfExperience: formValues.yearsOfExperience,
        })
      );

      const username = resolveSalesforceNexusUsernameFromCreateResponse(createResult, formValues.email);
      if (!username) {
        throw new Error(
          'Salesforce signupfornexus did not return a username. Please try again or contact support.'
        );
      }

      // Same as paid membership: set password via setpasswordfornexus after account create.
      if (formValues.password) {
        console.info('[CompanyQrEnrollment] Setting password via setpasswordfornexus', {
          email: formValues.email,
          salesforceUsername: username,
        });
        await setSalesforceNexusPassword({ username, password: formValues.password });
      }

      console.info('[CompanyQrEnrollment] signupfornexus + setpassword success', {
        email: formValues.email,
        salesforceUsername: username,
        createResult,
      });

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(salesforceUsernameKey, String(username).trim());
      }

      return username;
    }

    console.info('[MembershipPayment] Creating Salesforce account', {
      email: formValues.email,
      forceCreate,
      isPaid: paymentMeta.isPaid === true,
      paidAmount: paymentMeta.paidAmount,
      paymentRefId: paymentMeta.paymentRefId || null,
    });

    const createResult = await createSalesforceNexusUser(
      buildSalesforceNexusUserPayloadFromSignup({
        salutation: formValues.salutation,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        nameAsPerId,
        idType,
        idNumber,
        company: formValues.company,
        jobFunction: formValues.jobFunction,
        countryOfResidence: formValues.countryOfResidence,
        yearsOfExperience: formValues.yearsOfExperience,
        isPaid: paymentMeta.isPaid === true,
        paidAmount: paymentMeta.paidAmount,
        paidDate: paymentMeta.paidDate,
        paymentProofToken: paymentMeta.paymentProofToken,
      })
    );

    const username = resolveSalesforceNexusUsernameFromCreateResponse(createResult, formValues.email);

    if (formValues.password && username) {
      await setSalesforceNexusPassword({ username, password: formValues.password });
    }

    if (typeof window !== 'undefined' && username) {
      sessionStorage.setItem(salesforceUsernameKey, String(username).trim());
    }

    return username;
  };

  const handleSignupError = (error, attemptedUsername) => {
    console.error(error);
    const message = error && error.message ? error.message : String(error || 'Sign up failed.');
    setErrorMsg(message);

    if (String(message).toLowerCase().includes('username already exists')) {
      setUsernameSuggestions(buildUsernameSuggestions(attemptedUsername, 10));
      setShowAllSuggestions(false);
      setAppliedSuggestion('');
    }
  };

  const handleCreateAccount = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setPaymentNotice(null);
      setUsernameSuggestions([]);
      setShowAllSuggestions(false);
      setAppliedSuggestion('');

      // Paid membership must go through checkout — never create Salesforce/local account here.
      if (isMembershipFeeFlow) {
        setPaymentNotice({
          severity: 'warning',
          message: 'Please complete membership payment to create your account.',
        });
        return;
      }

      // Company QR enrollment follows membership form flow: Salesforce + SSO (no local auth / email verify).
      if (!isCompanyQrEnrollmentFlow) {
        setErrorMsg(
          'Account creation is only available through your company QR invite. Please scan the QR code provided by your company administrator.'
        );
        return;
      }

      if (qrSubmitInFlightRef.current || qrSubmitting) {
        return;
      }
      qrSubmitInFlightRef.current = true;
      setQrSubmitting(true);

      if (qrEnrollmentLoading) {
        setErrorMsg('Please wait while we validate your company QR invite.');
        return;
      }
      if (qrEnrollmentError || !qrEnrollmentReady) {
        setErrorMsg(
          qrEnrollmentError
          || 'This company QR invite is not available. Please request a new QR Code from your company administrator.'
        );
        return;
      }

      // Re-check just before submit to catch expiry / seat races.
      const validation = await validateCompanyEnrollment({
        companyCode: resolveSignupCompanyCode() || companyCodeFromUrl,
        viaQr: true,
      });
      if (!validation?.valid) {
        const message =
          String(validation?.message || '').trim()
          || 'This company QR invite is no longer available.';
        setQrEnrollmentError(message);
        setQrEnrollmentReady(false);
        setErrorMsg(message);
        return;
      }

      setEmailSfChecking(true);
      let emailCheck;
      try {
        emailCheck = await assertSalesforceEmailAvailable(data.email);
      } finally {
        setEmailSfChecking(false);
      }
      if (!emailCheck.ok) {
        showSalesforceEmailError(emailCheck.message);
        return;
      }

      const salesforceUsername = await ensureSalesforceNexusUserForMembershipSignup(data);
      if (!salesforceUsername) {
        throw new Error('Salesforce account was created but username was missing. Please try again or contact support.');
      }

      const eligibility = buildSubmittedEligibilityData(data);
      await saveSalesforceMembershipRecord({
        email: data.email,
        firstname: data.firstName,
        lastname: data.lastName,
        salutation: data.salutation,
        nameAsPerId: [data.firstName, data.lastName].filter(Boolean).join(' ').trim(),
        salesforceUsername: String(salesforceUsername).trim(),
        membershipOutcome: membershipOutcome || 'paid-signup',
        eligibilityIsSingaporePr: eligibility?.isSingaporePr,
        eligibilityIsIscaMember: eligibility?.isIscaMember,
        eligibilityWantsMembership: eligibility?.wantsIscaMembership,
        eligibilityType: eligibility?.eligibilityType || 'company-qr-enrollment',
        eligibilitySnapshot: {
          ...(eligibility?.snapshot && typeof eligibility.snapshot === 'object' ? eligibility.snapshot : {}),
          companyReferenceId: resolveSignupCompanyCode() || companyCodeFromUrl,
          companyReferenceConfirmed: true,
          companyEnrollmentViaQr: true,
          companyVerifiedName: companyVerifiedName || data.company || '',
          companyCode: resolveSignupCompanyCode() || companyCodeFromUrl,
        },
      });

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(membershipEligibilityStorageKey);
        sessionStorage.setItem('salesforceNexusUsername', String(salesforceUsername).trim());
      }

      // Continue with eServices SSO — same as membership form after Salesforce create.
      const returnTarget = returnTo || paths.dashboard.root;
      router.replace(
        `${paths.auth.oauth.start}?returnTo=${encodeURIComponent(returnTarget)}&membershipOutcome=${encodeURIComponent(membershipOutcome || 'paid-signup')}`
      );
    } catch (error) {
      handleSignupError(error, data.username);
    } finally {
      qrSubmitInFlightRef.current = false;
      setQrSubmitting(false);
    }
  });

  const handleMembershipPayment = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setPaymentNotice(null);
      setUsernameSuggestions([]);
      setShowAllSuggestions(false);
      setAppliedSuggestion('');
      setPaymentActionLoading(true);
      console.info('[MembershipPayment] Checkout started', {
        source: membershipSource,
        flow: membershipOutcome || 'default',
      });

      setEmailSfChecking(true);
      let emailCheck;
      try {
        emailCheck = await assertSalesforceEmailAvailable(data.email);
      } finally {
        setEmailSfChecking(false);
      }
      if (!emailCheck.ok) {
        showSalesforceEmailError(emailCheck.message);
        setPaymentActionLoading(false);
        return;
      }

      const cachedDraftUserId =
        typeof window !== 'undefined' ? sessionStorage.getItem('membershipDraftUserId') || '' : '';

      const draftResponse = await saveMembershipSignupDraft({
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: data.contactNumber,
        companyCode: resolveSignupCompanyCode(),
        signupAccessToken: isVerifiedNricSignupFlow ? signupAccessToken : undefined,
        draftUserId: cachedDraftUserId || undefined,
        eligibilityData: buildSubmittedEligibilityData(data),
      });

      if (typeof window !== 'undefined') {
        persistPaymentConsent(true);
        sessionStorage.setItem(
          membershipDraftFormStorageKey,
          JSON.stringify({
            membershipOutcome,
            eligibility: eligibilityData,
            paymentConsentChecked: true,
            affiliatePricing: affiliatePricing?.discountApplied ? affiliatePricing : null,
            companyVerifiedName: companyVerifiedName || data.company || '',
            companyReferenceVerified: companyReferenceVerified === true,
            values: {
              salutation: data.salutation,
              username: data.username,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              contactNumber: data.contactNumber,
              password: data.password,
              company: data.company || companyVerifiedName || '',
              companyCode: data.companyCode,
              jobFunction: data.jobFunction,
              jobFunctionOther: data.jobFunctionOther,
              yearsOfExperience: data.yearsOfExperience,
              countryOfResidence: data.countryOfResidence,
              promoCode: data.promoCode,
            },
          })
        );
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const nextSearch = new URLSearchParams();
      if (membershipOutcome) nextSearch.set('membershipOutcome', membershipOutcome);
      if (returnTo) nextSearch.set('returnTo', returnTo);
      if (companyCodeFromUrl) nextSearch.set('companyCode', companyCodeFromUrl);
      if (isCompanyQrSignupFlow) nextSearch.set('viaQr', '1');
      if (isVerifiedNricSignupFlow && signupAccessToken) {
        nextSearch.set('signupAccessToken', signupAccessToken);
      }

      const successSearch = new URLSearchParams(nextSearch);
      successSearch.set('payment', 'success');
      successSearch.set('session_id', '{CHECKOUT_SESSION_ID}');

      const cancelSearch = new URLSearchParams(nextSearch);
      cancelSearch.set('payment', 'canceled');

      const checkoutResponse = await createMembershipCheckoutSession({
        draftUserId: draftResponse?.draftUserId || cachedDraftUserId,
        signupAccessToken: isVerifiedNricSignupFlow ? signupAccessToken : undefined,
        source: membershipSource,
        successUrl: `${baseUrl}${paths.auth.simple.signUp}?${successSearch.toString()}`,
        cancelUrl: `${baseUrl}${paths.auth.simple.signUp}?${cancelSearch.toString()}`,
        currency: 'sgd',
        code: String(data.promoCode || '').trim().toUpperCase() || undefined,
      });

      if (!checkoutResponse?.url) {
        throw new Error('Could not start membership payment.');
      }

      if (typeof window !== 'undefined') {
        if (checkoutResponse?.sessionId) {
          sessionStorage.setItem(pendingMembershipSessionKey, checkoutResponse.sessionId);
        }
        if (checkoutResponse?.refId) {
          sessionStorage.setItem(pendingMembershipRefKey, checkoutResponse.refId);
        }
        console.info('[MembershipPayment] Checkout redirect ready', {
          refId: trimPaymentLogValue(checkoutResponse?.refId),
          sessionId: trimPaymentLogValue(checkoutResponse?.sessionId),
        });
        window.location.href = checkoutResponse.url;
      }
    } catch (error) {
      const rawMessage = String(error?.message || '').toLowerCase();
      if (rawMessage.includes('username already exists')) {
        handleSignupError(error, data.username);
      } else {
        const draftUserId =
          typeof window !== 'undefined' ? sessionStorage.getItem('membershipDraftUserId') || '' : '';
        if (draftUserId) {
          try {
            await abandonMembershipCheckout({ draftUserId });
          } catch (abandonError) {
            console.warn('[MembershipPayment] Draft abandon after checkout start failure skipped', {
              message: abandonError?.message,
            });
          }
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('membershipDraftUserId');
            sessionStorage.removeItem(pendingMembershipSessionKey);
            sessionStorage.removeItem(pendingMembershipRefKey);
          }
        }
        const notice = resolveMembershipPaymentNotice(error, 'start');
        console.error('[MembershipPayment] Checkout failed', {
          source: membershipSource,
          message: notice.message,
        });
        setPaymentNotice({
          ...notice,
          message: `${notice.message} No account was kept.`,
        });
        setErrorMsg('');
      }
    } finally {
      setPaymentActionLoading(false);
    }
  });

  const renderLogo = <AnimateLogo2 sx={{ mb: 1.5, mx: 'auto', transform: 'scale(0.88)' }} />;

  const renderHead = (
    <Stack alignItems="center" spacing={1} sx={{ mb: { xs: 2.5, md: 2 } }}>
      <Box
        sx={(theme) => ({
          px: 1.5,
          py: 0.5,
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 0.3,
          color: 'primary.main',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
        })}
      >
        {isCompanyQrEnrollmentFlow
          ? 'COMPANY ENROLLMENT'
          : isMembershipFeeFlow
            ? 'PAYMENT'
            : 'COMPANY QR REQUIRED'}
      </Box>

      <Typography variant="h5" sx={{ textAlign: 'center' }}>
        {isCompanyQrEnrollmentFlow
          ? 'Complete your company membership signup'
          : isVerifiedNricSignupFlow
            ? 'Complete your verified membership setup'
            : isPaidMembershipFlow
              ? 'Complete your payment'
              : 'Company QR enrollment'}
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {isCompanyQrEnrollmentFlow
          ? 'Your company has already covered the membership fee. We create your Salesforce eServices account here — then you sign in with eServices.'
          : isMembershipFeeFlow
            ? 'Your details stay saved as a draft. We create your account automatically after successful payment.'
            : 'Account creation on this page is only available through a company QR invite. Please scan the QR code from your company administrator.'}
      </Typography>

      <Stack direction="row" spacing={0.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Already have an account?
        </Typography>

        <Link component={RouterLink} href={signInHref} variant="subtitle2">
          Sign in
        </Link>
      </Stack>

    </Stack>
  );

  const renderAccountFields = (
    <Box sx={SIGNUP_FORM_GRID_SX}>
      {!isCompanyQrEnrollmentFlow ? (
        <>
          <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
            <Field.Text
              name="username"
              label="Username"
              required
              placeholder="Choose a username"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="solar:user-circle-bold-duotone" width={18} />
                  </InputAdornment>
                ),
                endAdornment:
                  appliedSuggestion && usernameValue === appliedSuggestion ? (
                    <InputAdornment position="end">
                      <Iconify icon="solar:verified-check-bold" width={18} sx={{ color: 'success.main' }} />
                    </InputAdornment>
                  ) : null,
              }}
            />
          </Box>

          {usernameSuggestions.length > 0 && (
            <Stack spacing={1} sx={{ ...SIGNUP_FORM_GRID_FULL_WIDTH_SX, mt: -1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Username is taken. Try one of these:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                {(showAllSuggestions ? usernameSuggestions : usernameSuggestions.slice(0, 4)).map((suggestion) => (
                  <Chip
                    key={suggestion}
                    label={suggestion}
                    size="small"
                    clickable
                    color="default"
                    variant="outlined"
                    onClick={() => applyUsernameSuggestion(suggestion)}
                  />
                ))}
              </Stack>
              {!showAllSuggestions && usernameSuggestions.length > 4 && (
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    size="small"
                    variant="contained"
                    color="inherit"
                    onClick={() => setShowAllSuggestions(true)}
                    sx={{ minWidth: 'auto' }}
                  >
                    Show more
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </>
      ) : null}
      <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
        <Field.Select
          name="salutation"
          label="Salutation"
          required
          InputLabelProps={{ shrink: true }}
        >
          {['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Field.Select>
      </Box>

      <Box
        sx={{
          ...SIGNUP_FORM_GRID_FULL_WIDTH_SX,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Field.Text
          name="firstName"
          label="First name"
          required
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:user-id-bold-duotone" width={18} />
              </InputAdornment>
            ),
          }}
        />
        <Field.Text
          name="lastName"
          label="Last name"
          required
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:user-id-bold-duotone" width={18} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
        <Field.Text
          name="email"
          label="Email address"
          required
          InputLabelProps={{ shrink: true }}
          onBlur={handleEmailBlur}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:letter-bold-duotone" width={18} />
              </InputAdornment>
            ),
            endAdornment: emailSfChecking ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      <Box>
        <Field.Phone name="contactNumber" label="Contact number (optional)" country="SG" />
      </Box>
      <Box>
        <Field.Text
          name="password"
          label="Password"
          required
          placeholder={isCompanyQrEnrollmentFlow ? '8+ characters' : '6+ characters'}
          type={password.value ? 'text' : 'password'}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:lock-password-bold-duotone" width={18} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={password.onToggle} edge="end">
                  <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
        <Stack spacing={1}>
          <Field.Text
            name="companyCode"
            label="Company reference (optional)"
            InputLabelProps={{ shrink: true }}
            helperText={
              isCompanyCodeLockedFromQr
                ? 'Pre-filled from your company QR invite.'
                : 'Optional. Verify your company reference to auto-fill company details.'
            }
            InputProps={{
              readOnly: isCompanyCodeLockedFromQr,
              endAdornment: (
                <InputAdornment position="end">
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {companyReferenceVerified === true ? (
                      <Iconify icon="solar:verified-check-bold" width={20} color="success.main" />
                    ) : null}
                    {!isCompanyCodeLockedFromQr ? (
                      <LoadingButton
                        size="small"
                        variant="contained"
                        color="inherit"
                        loading={companyReferenceVerifying}
                        disabled={!String(companyCodeValue || '').trim()}
                        onClick={handleVerifyCompanyReference}
                        sx={{
                          minWidth: 76,
                          px: 1.5,
                          height: 32,
                          textTransform: 'none',
                          fontWeight: 700,
                          boxShadow: 'none',
                          bgcolor: 'grey.800',
                          color: 'common.white',
                          '&:hover': { bgcolor: 'grey.900', boxShadow: 'none' },
                          '&.Mui-disabled': { bgcolor: 'grey.400', color: 'common.white' },
                        }}
                      >
                        Verify
                      </LoadingButton>
                    ) : null}
                  </Stack>
                </InputAdornment>
              ),
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!isCompanyCodeLockedFromQr && String(companyCodeValue || '').trim()) {
                  handleVerifyCompanyReference();
                }
              }
            }}
          />
          {companyReferenceVerified === true && companyVerifiedName ? (
            <Alert severity="success" icon={<Iconify icon="solar:verified-check-bold" width={22} />}>
              Company verified: <strong>{companyVerifiedName}</strong>
            </Alert>
          ) : null}
          {companyReferenceVerified === false ? (
            <Alert severity="warning">
              Invalid company reference. This field is optional — you may continue without it or try again.
            </Alert>
          ) : null}
        </Stack>
      </Box>

      <Box
        sx={{
          ...SIGNUP_FORM_GRID_FULL_WIDTH_SX,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Field.Text
          name="company"
          label="Company"
          required
          InputLabelProps={{ shrink: true }}
          InputProps={{
            readOnly: companyPrefilled,
          }}
          helperText={
            companyPrefilled
              ? 'Company name is auto-filled from your eligibility check.'
              : undefined
          }
        />
        <Field.Select
          name="jobFunction"
          label="Job function"
          required
          InputLabelProps={{ shrink: true }}
        >
          {INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Text
          name="yearsOfExperience"
          label="No. of years of relevant work experience in accounting and finance"
          required
          placeholder="0"
          InputLabelProps={{ shrink: true }}
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
        />
        <Field.CountrySelect
          name="countryOfResidence"
          label="Country of residence"
          placeholder="Search country"
          getValue="label"
          required
        />
      </Box>

      {jobFunctionValue === 'others' ? (
        <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
          <Field.Text
            name="jobFunctionOther"
            label="Please specify your job function"
            required
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      ) : null}

      {isCompanyQrEnrollmentFlow ? (
        <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting || emailSfChecking || qrEnrollmentLoading || qrSubmitting}
            disabled={
              qrEnrollmentLoading
              || Boolean(qrEnrollmentError)
              || !qrEnrollmentReady
              || qrSubmitting
            }
            loadingIndicator="Creating eServices account..."
            sx={{ height: 44, fontWeight: 700 }}
          >
            Create eServices account and continue
          </LoadingButton>
        </Box>
      ) : null}
    </Box>
  );

  const renderNoSeparateStepNotice = isMembershipFeeFlow ? (
    <Box
      sx={(theme) => ({
        width: 1,
        px: 1.5,
        py: 1.25,
        borderRadius: 1.5,
        border: `1px solid ${alpha(theme.palette.success.main, 0.22)}`,
        bgcolor: alpha(theme.palette.success.main, 0.08),
      })}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Iconify icon="solar:shield-check-bold" width={18} />
        <Stack spacing={0.25}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            No separate create account step
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            We save these details as a draft first. Your account is created automatically only after payment succeeds.
          </Typography>
        </Stack>
      </Stack>
    </Box>
  ) : null;

  const renderMembershipPanel = isMembershipFeeFlow ? (
    <Stack spacing={1.5} sx={{ width: 1 }}>
      {scaqSsoPrefillNotice && (
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          You signed in with Salesforce, but you are not registered as an SCAQ candidate. Your name and email are
          pre-filled below. Complete paid signup ({currencyLabel} {Number(membershipBaseAmount).toFixed(2)} excluding GST) to continue.
        </Alert>
      )}
      <Box
        sx={(theme) => ({
          width: 1,
          px: 1.5,
          py: 1.25,
          borderRadius: 1.5,
          border: `1px solid ${alpha(theme.palette.info.main, 0.24)}`,
          bgcolor: alpha(theme.palette.info.main, 0.08),
        })}
      >
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Iconify icon="solar:info-circle-bold" width={18} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {membershipInfoText}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', pl: 3.5 }}>
            Your form details are saved as a draft first. We only activate the account after payment is confirmed.
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={(theme) => ({
          width: 1,
          p: 2,
          borderRadius: 1.5,
          border: `1px solid ${
            affiliateDiscountApplied
              ? alpha(theme.palette.success.main, 0.35)
              : theme.palette.divider
          }`,
          bgcolor: affiliateDiscountApplied
            ? alpha(theme.palette.success.main, 0.04)
            : theme.palette.background.paper,
        })}
      >
        <Stack spacing={1.25}>
          <Stack spacing={0.25}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify icon="solar:ticket-bold-duotone" width={18} sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Voucher / Referral code
              </Typography>
              {affiliateDiscountApplied ? (
                <Chip
                  size="small"
                  color="success"
                  variant="soft"
                  label="Verified"
                  sx={{ height: 22, fontWeight: 600 }}
                />
              ) : null}
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', pl: 3.5 }}>
              {isPromoLockedFromReferral
                ? 'This code came from your referral link and cannot be changed.'
                : 'Enter a valid code issued by ISCA or your referring partner. The payable amount updates after verification.'}
            </Typography>
          </Stack>

          <Field.Text
            name="promoCode"
            label="Code"
            placeholder="e.g. PROMO2026"
            disabled={isPromoLockedFromReferral}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              style: { textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 },
              autoComplete: 'off',
              spellCheck: false,
              readOnly: isPromoLockedFromReferral,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:tag-price-bold-duotone" width={18} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <LoadingButton
                    size="small"
                    variant="contained"
                    color="inherit"
                    loading={affiliateValidating}
                    disabled={
                      isPromoLockedFromReferral || !String(promoCodeValue || '').trim()
                    }
                    onClick={() => applyPromoCode()}
                    sx={{
                      minWidth: 76,
                      px: 1.5,
                      height: 32,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: 'none',
                      bgcolor: 'grey.800',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'grey.900', boxShadow: 'none' },
                      '&.Mui-disabled': { bgcolor: 'grey.400', color: 'common.white' },
                    }}
                  >
                    {isPromoLockedFromReferral && affiliateDiscountApplied ? 'Applied' : 'Apply'}
                  </LoadingButton>
                </InputAdornment>
              ),
            }}
            onKeyDown={(event) => {
              if (isPromoLockedFromReferral) {
                event.preventDefault();
                return;
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                applyPromoCode();
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.default',
              },
            }}
          />

          {affiliateValidating ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pl: 0.25 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">
                Verifying code with the registry...
              </Typography>
            </Stack>
          ) : affiliatePricing ? (
            <Alert
              severity={affiliateDiscountApplied ? 'success' : 'warning'}
              variant="outlined"
              icon={
                <Iconify
                  icon={
                    affiliateDiscountApplied
                      ? 'solar:verified-check-bold'
                      : 'solar:danger-triangle-bold'
                  }
                  width={20}
                />
              }
              sx={{
                py: 0.75,
                alignItems: 'center',
                '& .MuiAlert-message': { width: 1 },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {affiliateDiscountApplied
                  ? `Code verified: ${verifiedPromoCodeLabel}`
                  : 'Code could not be verified'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
                {affiliateDiscountApplied
                  ? 'A promotional rate has been applied to your payment summary below.'
                  : (affiliatePricing?.error
                    || affiliatePricing?.affiliateMessage
                    || affiliatePricing?.voucherMessage
                    || 'This code is invalid, inactive, or expired. The standard membership fee applies.')}
              </Typography>
            </Alert>
          ) : promoCodeValue ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Select Apply to verify this code before payment.
            </Typography>
          ) : (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Optional. Leave blank to continue with the standard membership fee.
            </Typography>
          )}
        </Stack>
      </Box>

      <Box
        sx={(theme) => ({
          width: 1,
          p: 2,
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
          bgcolor: alpha(theme.palette.primary.main, 0.06),
        })}
      >
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Payment summary
            </Typography>
            <Chip size="small" color="warning" variant="outlined" label={membershipBadgeLabel} />
          </Stack>
          <Divider sx={{ borderStyle: 'dashed' }} />
          {affiliateDiscountApplied ? (
            <>
              <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Original price</span>
                <strong>{currencyLabel} {standardTotalAmount.toFixed(2)}</strong>
              </Typography>
              <Typography
                variant="body2"
                sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}
              >
                <span>Promotional rate</span>
                <strong>{currencyLabel} {Number(totalAmount).toFixed(2)}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Verified code: {verifiedPromoCodeLabel}
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Base amount</span>
                <strong>{currencyLabel} {Number(membershipBaseAmount).toFixed(2)}</strong>
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{`GST (${Number(membershipFeeConfig.gstRatePercent) || 9}%)`}</span>
                <strong>{currencyLabel} {Number(gstAmount).toFixed(2)}</strong>
              </Typography>
            </>
          )}
          <Typography variant="subtitle2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total payable</span>
            <strong>{currencyLabel} {Number(totalAmount).toFixed(2)}</strong>
          </Typography>
          <FormControlLabel
            sx={{ m: 0, mt: 0.25 }}
            control={(
              <Checkbox
                size="small"
                checked={paymentConsentChecked}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setPaymentConsentChecked(checked);
                  persistPaymentConsent(checked);
                }}
              />
            )}
            label={(
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                I confirm this payable amount and want to continue to payment.
              </Typography>
            )}
          />
          {isPaymentReturnProcessing ? (
            <Stack spacing={1.5} alignItems="center" sx={{ py: 1.5 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center' }}>
                Creating your account...
              </Typography>
            </Stack>
          ) : (
            <LoadingButton
              size="medium"
              variant="contained"
              fullWidth
              loading={paymentActionLoading}
              disabled={!paymentConsentChecked || verifiedSignupLoading}
              onClick={handleMembershipPayment}
            >
              {`Pay ${currencyLabel} ${Number(totalAmount).toFixed(2)}`}
            </LoadingButton>
          )}
        </Stack>
      </Box>
    </Stack>
  ) : null;

  const renderForm = (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isMembershipFeeFlow
            ? { xs: '1fr', md: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)' }
            : '1fr',
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        <Box sx={isPaymentReturnProcessing ? { pointerEvents: 'none', opacity: 0.5 } : {}}>
          {renderAccountFields}
        </Box>
        {renderMembershipPanel}
      </Box>
      {renderNoSeparateStepNotice}
    </Stack>
  );

  const renderTerms = (
    <Typography
      component="div"
      sx={{
        mt: 3,
        mb: 0.5,
        textAlign: 'center',
        typography: 'caption',
        color: 'text.secondary',
      }}
    >
      {'By signing up, I agree to the '}
      <Link
        href={ISCA_PRIVACY_POLICY_URL}
        target="_blank"
        rel="noopener noreferrer"
        underline="always"
        color="text.primary"
      >
        Privacy policy
      </Link>
      .
    </Typography>
  );

  const renderPaymentConfirmed = paymentCompletedState ? (
    <MembershipPaymentConfirmedView
      email={paymentCompletedState.email}
      memberName={paymentCompletedState.memberName}
      paidAmount={paymentCompletedState.paidAmount}
      currency={paymentCompletedState.currency}
      itemName={paymentCompletedState.itemName}
      paymentRef={paymentCompletedState.paymentRef}
      redirectCountdown={paymentRedirectCountdown}
      onSignIn={() => {
        clearMembershipSignupClientDraftStorage();
        router.replace(buildPaymentCompleteSignInHref());
      }}
    />
  ) : null;

  if (paymentCompletedState) {
    return renderPaymentConfirmed;
  }

  return (
    <>
      {renderLogo}

      {renderHead}

      {isUnsupportedStandaloneSignup && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Standalone account creation is not available. Please use the company QR invite link shared by your
          administrator, or{' '}
          <Link component={RouterLink} href={signInHref} underline="always">
            sign in
          </Link>{' '}
          if you already have an account.
        </Alert>
      )}

      {isCompanyQrEnrollmentFlow && qrEnrollmentLoading && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<CircularProgress size={18} />}>
          Validating your company QR invite...
        </Alert>
      )}

      {isCompanyQrEnrollmentFlow && !!qrEnrollmentError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {qrEnrollmentError}
        </Alert>
      )}

      {isCompanyQrEnrollmentFlow && qrEnrollmentReady && !qrEnrollmentError && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Company enrollment verified. Your company has already paid — create your Salesforce eServices account below, then sign in with eServices.
        </Alert>
      )}

      {isVerifiedNricSignupFlow && verifiedSignupLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Validating your secure verified signup access...
        </Alert>
      )}

      {isVerifiedNricSignupFlow && !!verifiedSignupAccessError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {verifiedSignupAccessError}
        </Alert>
      )}

      {isVerifiedSignupSignInOnlyState && (
        <Stack sx={{ mb: 2 }} alignItems="flex-end">
          <Button component={RouterLink} href={signInHref} variant="contained">
            Sign in
          </Button>
        </Stack>
      )}

      {!paymentConfirming && isVerifiedNricSignupFlow && !verifiedSignupLoading && !verifiedSignupAccessError && (
        <Alert severity="success" sx={{ mb: 2 }}>
          NRIC verification confirmed.
          {verifiedSignupPrefill?.address ? ` Verified address: ${verifiedSignupPrefill.address}` : ''}
        </Alert>
      )}

      {!paymentConfirming && !!paymentNotice && (
        <Alert severity={paymentNotice.severity || 'info'} sx={{ mb: 2 }}>
          {paymentNotice.message}
        </Alert>
      )}

      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {!isUnsupportedStandaloneSignup
        && !(isVerifiedNricSignupFlow && (verifiedSignupLoading || verifiedSignupAccessError))
        && !(isCompanyQrEnrollmentFlow && (qrEnrollmentLoading || qrEnrollmentError)) && (
        <Box
          sx={(theme) => ({
            p: 2.25,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.neutral, 0.8)} 100%)`,
            boxShadow: `0 20px 40px ${alpha(theme.palette.grey[500], 0.12)}`,
          })}
        >
          <Form methods={methods} onSubmit={isMembershipFeeFlow ? handleMembershipPayment : handleCreateAccount}>
            {renderForm}
          </Form>
        </Box>
      )}

      {renderTerms}
    </>
  );
}

