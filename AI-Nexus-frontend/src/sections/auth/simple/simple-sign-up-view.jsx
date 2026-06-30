import { useEffect, useMemo, useRef, useState } from 'react';
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
  buildFreeIndividualSignUpSchema,
  buildPaidIndividualSignUpSchema,
} from 'src/validations/user.validation';

import { getVerifiedSignupAccess, saveMembershipSignupDraft, signUp, createSalesforceNexusUser, setSalesforceNexusPassword } from 'src/auth/context/jwt';
import { confirmMembershipPayment, createMembershipCheckoutSession } from 'src/services/payment.service';
import {
  buildSalesforceNexusUserPayloadFromSignup,
  resolveVerifiedNricSalesforceFields,
  resolveSalesforceNexusUsernameFromCreateResponse,
} from 'src/utils/nric-id-type';
import {
  isApprovedSalesforceStudentMember,
  startStudentMemberSsoLogin,
} from 'src/utils/membership-application-student';
import {
  buildIndividualSignupPrefillFromEligibility,
  INDIVIDUAL_SIGNUP_CITIZENSHIP_OPTIONS,
  INDIVIDUAL_SIGNUP_DEFAULT_VALUES,
  INDIVIDUAL_SIGNUP_JOB_FUNCTION_OPTIONS,
  mergeSignupEligibilityData,
  requiresFreeSignupJobAudit,
} from 'src/utils/individual-signup-form';
import { FreeSignupAuditDialog } from './free-signup-audit-dialog';

const SIGNUP_FORM_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  columnGap: 2,
  rowGap: 2,
  '& .MuiFormLabel-asterisk': { color: 'error.main' },
  '& > *': { minWidth: 0 },
};

const SIGNUP_FORM_GRID_FULL_WIDTH_SX = { gridColumn: '1 / -1' };

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
  const [paymentRedirectCountdown, setPaymentRedirectCountdown] = useState(5);
  const [verifiedSignupLoading, setVerifiedSignupLoading] = useState(false);
  const [verifiedSignupAccessError, setVerifiedSignupAccessError] = useState('');
  const [verifiedSignupPrefill, setVerifiedSignupPrefill] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [scaqSsoPrefillNotice, setScaqSsoPrefillNotice] = useState(false);
  const [companyPrefilled, setCompanyPrefilled] = useState(false);
  const [nricVerifiedReadOnly, setNricVerifiedReadOnly] = useState(false);
  const [freeSignupAuditOpen, setFreeSignupAuditOpen] = useState(false);
  const [freeSignupAuditEmail, setFreeSignupAuditEmail] = useState('');
  const [freeSignupAuditUserId, setFreeSignupAuditUserId] = useState('');
  const [freeSignupAuditLearnerName, setFreeSignupAuditLearnerName] = useState('');
  const freeSignupPrefillRestoredRef = useRef(false);
  const membershipOutcome = searchParams.get('membershipOutcome');
  const returnTo = searchParams.get('returnTo') || '';
  const paymentState = searchParams.get('payment') || '';
  const paymentRef = searchParams.get('ref') || '';
  const paymentSessionId = searchParams.get('session_id') || '';
  const isPaidMembershipFlow = membershipOutcome === 'paid-signup';
  const isVerifiedNricSignupFlow = membershipOutcome === 'verified-nric-signup';
  const isMembershipFeeFlow = isPaidMembershipFlow || isVerifiedNricSignupFlow;
  const isFreeIndividualSignup = !isMembershipFeeFlow;
  const signupAccessToken = searchParams.get('signupAccessToken') || '';
  const membershipDraftFormStorageKey = 'membershipSignupDraftForm';
  const membershipPaymentConsentKey = 'membershipPaymentConsent';
  const membershipEligibilityStorageKey = 'membershipEligibilityFlow';
  const pendingMembershipSessionKey = 'pending_membership_session_id';
  const pendingMembershipRefKey = 'pending_membership_ref';
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
  const membershipBaseAmount = isVerifiedNricSignupFlow ? 300 : 900;
  const gstRate = 0.09;
  const gstAmount = membershipBaseAmount * gstRate;
  const totalAmount = membershipBaseAmount + gstAmount;
  const isVerifiedSignupSignInOnlyState =
    isVerifiedNricSignupFlow
    && !!verifiedSignupAccessError
    && verifiedSignupAccessError.toLowerCase().includes('sign in');
  const signInHref = returnTo
    ? `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(returnTo)}`
    : paths.auth.simple.signIn;
  const buildPaymentCompleteSignInHref = () => paths.auth.oauth.start;
  const membershipInfoText = isVerifiedNricSignupFlow
    ? 'Verified document membership rate applied. Base fee is SGD 300 (excluding GST).'
    : 'Membership paid plan selected. Base fee is SGD 900 (excluding GST).';
  const membershipSource = isVerifiedNricSignupFlow ? 'membership-verified-signup' : 'membership-paid-signup';
  const membershipBadgeLabel = isVerifiedNricSignupFlow ? 'Discount applied' : 'GST included';
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
    () => (isFreeIndividualSignup ? buildFreeIndividualSignUpSchema() : buildPaidIndividualSignUpSchema()),
    [isFreeIndividualSignup]
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
  const jobFunctionValue = watch('jobFunction');
  const citizenshipValue = watch('citizenship');

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
      setCompanyPrefilled(prefill.companyPrefilled);
      setNricVerifiedReadOnly(prefill.nricVerified);

      reset((current) => ({
        ...current,
        company: prefill.company || current.company,
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
      setCompanyPrefilled(profilePrefill.companyPrefilled);

      reset({
        salutation: parsed.values.salutation || '',
        ...INDIVIDUAL_SIGNUP_DEFAULT_VALUES,
        salutation: parsed.values.salutation || '',
        username: parsed.values.username || '',
        firstName: parsed.values.firstName || '',
        lastName: parsed.values.lastName || '',
        email: parsed.values.email || '',
        contactNumber: parsed.values.contactNumber || '',
        password: parsed.values.password || '',
        company: profilePrefill.company || parsed.values.company || '',
        jobFunction: profilePrefill.jobFunction || parsed.values.jobFunction || '',
        jobFunctionOther: profilePrefill.jobFunctionOther || parsed.values.jobFunctionOther || '',
        yearsOfExperience:
          profilePrefill.yearsOfExperience || parsed.values.yearsOfExperience || '',
        countryOfResidence:
          profilePrefill.countryOfResidence || parsed.values.countryOfResidence || '',
      });
      membershipDraftRestoredRef.current = true;
    } catch {
      // Ignore invalid cached draft payloads.
    }
  }, [
    isMembershipFeeFlow,
    isPaidMembershipFlow,
    membershipDraftFormStorageKey,
    membershipOutcome,
    membershipPaymentConsentKey,
    returnTo,
    reset,
  ]);

  useEffect(() => {
    if (!isMembershipFeeFlow || paymentState !== 'canceled') return;

    setPaymentNotice({
      severity: 'warning',
      message: 'Payment was not completed. Your details are still saved as a draft. Continue payment to create your account.',
    });
  }, [isMembershipFeeFlow, paymentState]);

  useEffect(() => {
    if (!paymentCompletedState) {
      return undefined;
    }

    if (paymentRedirectCountdown <= 0) {
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
    setPaymentRedirectCountdown(5);
    setPaymentNotice(null);
    setErrorMsg('');
    console.info('[MembershipPayment] Confirmation started', {
      refId: trimPaymentLogValue(normalizedPaymentRef),
      sessionId: trimPaymentLogValue(fallbackSessionId),
    });

    confirmMembershipPayment({ ref: normalizedPaymentRef, sessionId: fallbackSessionId })
      .then(async (response) => {
        if (!active) return;
        console.info('[MembershipPayment] Confirmation success', {
          refId: trimPaymentLogValue(normalizedPaymentRef),
          userId: trimPaymentLogValue(response?.userId),
        });

        try {
          const formValues = getValues();
          await ensureSalesforceNexusUserForMembershipSignup(formValues, {
            isPaid: true,
            paidAmount: Number(totalAmount.toFixed(2)),
            paidDate: new Date().toLocaleDateString('en-GB'),
            forceCreate: true,
          });
        } catch (salesforceError) {
          console.error('[MembershipPayment] Salesforce account creation failed after payment', salesforceError);
        }

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('membershipDraftUserId');
          sessionStorage.removeItem(membershipDraftFormStorageKey);
          sessionStorage.removeItem(membershipPaymentConsentKey);
          sessionStorage.removeItem(membershipEligibilityStorageKey);
          sessionStorage.removeItem(pendingMembershipSessionKey);
          sessionStorage.removeItem(pendingMembershipRefKey);
          sessionStorage.removeItem('salesforceNexusUsername');
          localStorage.removeItem('membershipSalesforceSession');
        }

        const verifiedEmail = response?.email || getValues('email') || '';
        setPaymentNotice(null);
        setPaymentCompletedState({
          email: verifiedEmail,
          userId: response?.userId || '',
        });
        setPaymentRedirectCountdown(5);
      })
      .catch((error) => {
        if (!active) return;
        const notice = resolveMembershipPaymentNotice(error, 'confirm');
        console.error('[MembershipPayment] Confirmation failed', {
          refId: trimPaymentLogValue(normalizedPaymentRef),
          sessionId: trimPaymentLogValue(fallbackSessionId),
          message: notice.message,
        });
        setPaymentNotice(notice);
        setErrorMsg('');
      })
      .finally(() => {
        if (!active) return;
        setPaymentConfirming(false);
      });

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

  const ensureSalesforceNexusUserForMembershipSignup = async (data, paymentMeta = {}) => {
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
    const forceCreate = paymentMeta.forceCreate === true;
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
      company: data?.company || storedValues?.company || '',
      jobFunction: data?.jobFunction || storedValues?.jobFunction || '',
      countryOfResidence: data?.countryOfResidence || storedValues?.countryOfResidence || '',
      yearsOfExperience: data?.yearsOfExperience ?? storedValues?.yearsOfExperience ?? '',
      password: data?.password || storedValues?.password || '',
    };

    console.info('[MembershipPayment] Creating Salesforce account', {
      email: formValues.email,
      forceCreate,
      isPaid: paymentMeta.isPaid === true,
    });

    const createResult = await createSalesforceNexusUser(
      buildSalesforceNexusUserPayloadFromSignup({
        salutation: formValues.salutation,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        nameAsPerId: [formValues.firstName, formValues.lastName].filter(Boolean).join(' ').trim(),
        idType,
        idNumber,
        company: formValues.company,
        jobFunction: formValues.jobFunction,
        countryOfResidence: formValues.countryOfResidence,
        yearsOfExperience: formValues.yearsOfExperience,
        isPaid: paymentMeta.isPaid === true,
        paidAmount: paymentMeta.paidAmount,
        paidDate: paymentMeta.paidDate,
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

  const redirectToEmailVerify = (email) => {
    const verifySearch = new URLSearchParams({ email }).toString();
    router.push(`${paths.auth.simple.verify}?${verifySearch}`);
  };

  const handleFreeSignupAuditSubmitted = () => {
    const email = freeSignupAuditEmail;
    setFreeSignupAuditOpen(false);
    if (email) {
      redirectToEmailVerify(email);
    }
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
      await ensureSalesforceNexusUserForMembershipSignup(data);
      const signupResult = await signUp({
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: data.contactNumber,
        signupAccessToken: isVerifiedNricSignupFlow ? signupAccessToken : undefined,
        eligibilityData: buildSubmittedEligibilityData(data),
      });

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(membershipEligibilityStorageKey);
      }

      if (isFreeIndividualSignup && requiresFreeSignupJobAudit(data.jobFunction)) {
        const registeredUser = signupResult?.user;
        setFreeSignupAuditEmail(data.email);
        setFreeSignupAuditUserId(registeredUser?.id || registeredUser?._id || '');
        setFreeSignupAuditLearnerName(
          [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
        );
        setFreeSignupAuditOpen(true);
        return;
      }

      redirectToEmailVerify(data.email);
    } catch (error) {
      handleSignupError(error, data.username);
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

      const cachedDraftUserId =
        typeof window !== 'undefined' ? sessionStorage.getItem('membershipDraftUserId') || '' : '';

      const draftResponse = await saveMembershipSignupDraft({
        username: data.username,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        contactNumber: data.contactNumber,
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
            values: {
              salutation: data.salutation,
              username: data.username,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              contactNumber: data.contactNumber,
              password: data.password,
              company: data.company,
              jobFunction: data.jobFunction,
              jobFunctionOther: data.jobFunctionOther,
              yearsOfExperience: data.yearsOfExperience,
              countryOfResidence: data.countryOfResidence,
            },
          })
        );
      }

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const nextSearch = new URLSearchParams();
      if (membershipOutcome) nextSearch.set('membershipOutcome', membershipOutcome);
      if (returnTo) nextSearch.set('returnTo', returnTo);
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
        const notice = resolveMembershipPaymentNotice(error, 'start');
        console.error('[MembershipPayment] Checkout failed', {
          source: membershipSource,
          message: notice.message,
        });
        setPaymentNotice(notice);
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
        {isMembershipFeeFlow ? 'MEMBERSHIP PAYMENT' : 'CREATE ACCOUNT'}
      </Box>

      <Typography variant="h5" sx={{ textAlign: 'center' }}>
        {isVerifiedNricSignupFlow
          ? 'Complete your verified membership setup'
          : isPaidMembershipFlow
            ? 'Complete your membership payment'
            : 'Create your account'}
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {isMembershipFeeFlow
          ? 'Your details stay saved as a draft. We create your account automatically after successful payment.'
          : 'Complete your details to register for the programme.'}
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

      <Box>
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
      </Box>
      <Box>
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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:letter-bold-duotone" width={18} />
              </InputAdornment>
            ),
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
          placeholder="6+ characters"
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

      <Box>
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
      </Box>
      <Box>
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

      <Box>
        <Field.Text
          name="yearsOfExperience"
          label="No. of years of relevant work experience in accounting and finance"
          required
          placeholder="0"
          InputLabelProps={{ shrink: true }}
          inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
        />
      </Box>
      <Box>
        <Field.CountrySelect
          name="countryOfResidence"
          label="Country of residence"
          placeholder="Search country"
          getValue="label"
          required
        />
      </Box>

      {isFreeIndividualSignup ? (
        <>
          <Box>
            <Field.Text
              name="nricFin"
              label="NRIC/FIN number"
              required
              InputLabelProps={{ shrink: true }}
              InputProps={{
                readOnly: nricVerifiedReadOnly,
              }}
              helperText={
                nricVerifiedReadOnly
                  ? 'Auto-filled from your verified NRIC upload.'
                  : 'Enter your NRIC/FIN number.'
              }
            />
          </Box>
          <Box>
            <Field.Select
              name="citizenship"
              label="Citizenship"
              required
              InputLabelProps={{ shrink: true }}
            >
              {INDIVIDUAL_SIGNUP_CITIZENSHIP_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Field.Select>
          </Box>

          {citizenshipValue === 'others' ? (
            <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
              <Field.Text
                name="citizenshipOther"
                label="Please specify your citizenship"
                required
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          ) : null}

          <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
            <Field.Checkbox
              name="imdaFundingAcknowledged"
              label="I acknowledge that my personal information will be shared with IMDA for funding purposes"
            />
          </Box>
        </>
      ) : null}

      {isMembershipFeeFlow && (
        <Box
          sx={(theme) => ({
            ...SIGNUP_FORM_GRID_FULL_WIDTH_SX,
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
      )}

      {!isMembershipFeeFlow && (
        <Box sx={SIGNUP_FORM_GRID_FULL_WIDTH_SX}>
          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting}
            loadingIndicator="Create account..."
            sx={{ height: 44, fontWeight: 700 }}
          >
            Create account
          </LoadingButton>
        </Box>
      )}
    </Box>
  );

  const renderMembershipPanel = isMembershipFeeFlow ? (
    <Stack spacing={1.5} sx={{ position: { md: 'sticky' }, top: { md: 24 } }}>
      {scaqSsoPrefillNotice && (
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          You signed in with Salesforce, but you are not registered as an SCAQ candidate. Your name and email are
          pre-filled below. Complete paid signup (SGD 900 excluding GST) to continue.
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
        <Stack
          direction={{ xs: 'column', sm: 'row', md: 'column' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center', md: 'flex-start' }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Iconify icon="solar:info-circle-bold" width={18} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {membershipInfoText}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Your form details are saved as a draft first. We only activate the account after payment is confirmed.
          </Typography>
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
          <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Base amount</span>
            <strong>SGD {membershipBaseAmount.toFixed(2)}</strong>
          </Typography>
          <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>GST (9%)</span>
            <strong>SGD {gstAmount.toFixed(2)}</strong>
          </Typography>
          <Typography variant="subtitle2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total payable</span>
            <strong>SGD {totalAmount.toFixed(2)}</strong>
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
              {`Pay SGD ${totalAmount.toFixed(2)}`}
            </LoadingButton>
          )}
        </Stack>
      </Box>
    </Stack>
  ) : null;

  const renderForm = (
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
      {'By signing up, I agree to '}
      <Link underline="always" color="text.primary">
        Terms of service
      </Link>
      {' and '}
      <Link underline="always" color="text.primary">
        Privacy policy
      </Link>
      .
    </Typography>
  );

  const renderPaymentConfirmed = paymentCompletedState ? (
    <Box
      sx={(theme) => ({
        p: 3,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
        boxShadow: `0 20px 40px ${alpha(theme.palette.success.main, 0.12)}`,
      })}
    >
      <Stack spacing={2.25} alignItems="center" textAlign="center">
        <Box
          sx={(theme) => ({
            width: 68,
            height: 68,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            color: 'success.main',
            bgcolor: alpha(theme.palette.success.main, 0.12),
          })}
        >
          <Iconify icon="solar:check-circle-bold" width={34} />
        </Box>

        <Stack spacing={0.75}>
          <Typography variant="h5">Payment confirmed</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
            Your membership payment was confirmed and your account setup is complete.
            {paymentCompletedState.email
              ? ` We sent a verification email to ${paymentCompletedState.email}.`
              : ' We sent a verification email to your registered email address.'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460 }}>
            You will be redirected to the sign-in page in {paymentRedirectCountdown} second{paymentRedirectCountdown === 1 ? '' : 's'}.
            Please verify your email before signing in.
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          <Button variant="contained" onClick={() => router.replace(buildPaymentCompleteSignInHref())}>
            Go to sign in now
          </Button>
          
        </Stack>
      </Stack>
    </Box>
  ) : null;

  return (
    <>
      {renderLogo}

      {!paymentCompletedState && renderHead}

      {paymentCompletedState && renderPaymentConfirmed}

      {!paymentCompletedState && isVerifiedNricSignupFlow && verifiedSignupLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Validating your secure verified signup access...
        </Alert>
      )}

      {!paymentCompletedState && isVerifiedNricSignupFlow && !!verifiedSignupAccessError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {verifiedSignupAccessError}
        </Alert>
      )}

      {!paymentCompletedState && isVerifiedSignupSignInOnlyState && (
        <Stack sx={{ mb: 2 }} alignItems="flex-end">
          <Button component={RouterLink} href={signInHref} variant="contained">
            Sign in
          </Button>
        </Stack>
      )}

      {!paymentCompletedState && !paymentConfirming && isVerifiedNricSignupFlow && !verifiedSignupLoading && !verifiedSignupAccessError && (
        <Alert severity="success" sx={{ mb: 2 }}>
          NRIC verification confirmed.
          {verifiedSignupPrefill?.address ? ` Verified address: ${verifiedSignupPrefill.address}` : ''}
        </Alert>
      )}

      {!paymentCompletedState && !paymentConfirming && !!paymentNotice && (
        <Alert severity={paymentNotice.severity || 'info'} sx={{ mb: 2 }}>
          {paymentNotice.message}
        </Alert>
      )}

      {!paymentCompletedState && !!errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {!paymentCompletedState && !(isVerifiedNricSignupFlow && (verifiedSignupLoading || verifiedSignupAccessError)) && (
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

      {!paymentCompletedState && renderTerms}

      <FreeSignupAuditDialog
        open={freeSignupAuditOpen}
        learnerEmail={freeSignupAuditEmail}
        learnerName={freeSignupAuditLearnerName}
        userId={freeSignupAuditUserId}
        onSubmitted={handleFreeSignupAuditSubmitted}
      />
    </>
  );
}

