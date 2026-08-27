'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Alert from '@mui/material/Alert';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { AuthCenteredLayout } from 'src/layouts/auth-centered';
import { paths } from 'src/routes/paths';
import { intlRegister } from 'src/services/intl-auth.service';
import {
  createIntlCheckoutSession,
  getIntlMembershipPricing,
  trackAffiliateClick,
  validateIntlPromoCode,
} from 'src/services/intl-payment.service';
import { navigateToAuthPath } from 'src/utils/intl-auth-navigate';
import {
  COUNTRIES,
  getCountryFlagUrl,
  resolveCountryByLabel,
} from 'src/assets/data/countries';
import { detectCountryOfResidenceFromIp } from 'src/utils/detect-country-from-ip';
import {
  getNationalPhoneLimitsForCountry,
  sanitizeNationalPhoneNumber,
} from 'src/utils/intl-phone';
import {
  INTL_MEMBERSHIP_FEE,
  INTL_PAID_SIGNUP_DEFAULTS,
  IntlPaidSignUpSchema,
} from 'src/validations/intl-auth.validation';
import { INTL_NAVY, INTL_NAVY_DEEP, INTL_RED, INTL_SOFT_PANEL } from 'src/theme/intl-brand';

// ----------------------------------------------------------------------

const NAVY = INTL_NAVY;
const RED = INTL_RED;
const AFFILIATE_REF_STORAGE_KEY = 'intlAffiliateSignupRef';

const FORM_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  columnGap: { xs: 1.75, sm: 2.25 },
  rowGap: { xs: 2.25, sm: 2.5 },
  '& .MuiFormLabel-asterisk': { color: 'error.main' },
  '& > *': { minWidth: 0 },
  '& .MuiInputBase-root': {
    fontSize: 15,
    minHeight: 48,
  },
  '& .MuiInputLabel-root': {
    fontSize: 14.5,
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    fontSize: 12.5,
  },
};

const FULL = { gridColumn: '1 / -1' };

/** ~10 compact rows visible before scroll. */
const COUNTRY_LISTBOX_SX = {
  maxHeight: 280,
  py: 0.5,
  '& .MuiAutocomplete-option': {
    minHeight: 32,
    py: 0.5,
    px: 1.25,
    fontSize: 13.5,
  },
};

const filterCountries = createFilterOptions({
  stringify: (option) => `${option.label} ${option.code} ${option.phone}`,
});

function fieldError(errors, name) {
  return errors?.[name]?.message || '';
}

function formatIntlAmount(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0';
  const code = String(currency || '').trim().toUpperCase();
  if (code && code !== 'SGD') return String(Math.round(n));
  const cents = Number(n.toFixed(2));
  return Number.isInteger(cents) ? String(Math.round(cents)) : cents.toFixed(2);
}

function membershipPlanLabel(type) {
  return type === 'student' ? 'Student' : 'Full / Role';
}

/** React 19: never spread RHF `ref` onto JSX; map it to MUI `inputRef`. */
function textFieldProps(field) {
  const { ref, ...rest } = field;
  return { ...rest, inputRef: ref };
}

function CountryFlag({ code, size = 16 }) {
  const src = getCountryFlagUrl(code);
  if (!src) return null;
  return (
    <Box
      component="img"
      src={src}
      alt=""
      loading="lazy"
      sx={{
        width: size,
        height: size * 0.75,
        objectFit: 'cover',
        borderRadius: '2px',
        display: 'block',
        flexShrink: 0,
      }}
    />
  );
}

/** Soft tinted field icon for a more polished form look. */
function FieldIcon({ icon, color }) {
  return (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        bgcolor: alpha(color, 0.1),
        color,
      }}
    >
      <Iconify icon={icon} width={16} />
    </Box>
  );
}

const FIELD_ICON = {
  salutation: { icon: 'solar:user-speak-rounded-bold-duotone', color: NAVY },
  firstName: { icon: 'solar:user-bold-duotone', color: NAVY },
  lastName: { icon: 'solar:user-id-bold-duotone', color: NAVY },
  email: { icon: 'solar:letter-bold-duotone', color: NAVY },
  password: { icon: 'solar:lock-password-bold-duotone', color: RED },
  phone: { icon: 'solar:phone-bold-duotone', color: NAVY },
  country: { icon: 'solar:global-bold-duotone', color: NAVY },
};

// ----------------------------------------------------------------------

export function IntlSignUpView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || paths.dashboard;
  const paymentCanceled = searchParams.get('payment') === 'canceled';
  const paymentRef = String(searchParams.get('ref') || '').trim().toUpperCase();
  const lockedReferralCode = paymentRef;
  const isPromoLockedFromReferral = Boolean(lockedReferralCode);

  const [errorMsg, setErrorMsg] = useState(
    paymentCanceled ? 'Payment was canceled. You can try again when ready.' : '',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoLocksPlan, setPromoLocksPlan] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [referralResolved, setReferralResolved] = useState(!Boolean(lockedReferralCode));
  const [detectingCountry, setDetectingCountry] = useState(true);
  const [pricing, setPricing] = useState({
    currency: INTL_MEMBERSHIP_FEE.currency,
    baseAmount: INTL_MEMBERSHIP_FEE.baseAmount,
    baseAmountSgd: INTL_MEMBERSHIP_FEE.baseAmountSgd,
    totalAmount: INTL_MEMBERSHIP_FEE.baseAmount,
    promoApplied: false,
    voucherDiscountAmount: INTL_MEMBERSHIP_FEE.voucherDiscountAmount,
    exchangeRate: 1,
    promoFixed: false,
  });
  const [pricingLoading, setPricingLoading] = useState(false);
  const payInFlightRef = useRef(false);
  const appliedPromoInputRef = useRef('');
  const affiliateTrackedRef = useRef('');
  const promoAssignedPlanRef = useRef(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(IntlPaidSignUpSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      ...INTL_PAID_SIGNUP_DEFAULTS,
      promoCode: lockedReferralCode || INTL_PAID_SIGNUP_DEFAULTS.promoCode || '',
    },
  });

  const countryOfResidence = watch('countryOfResidence');
  const membershipTypeValue = watch('membershipType');
  const planChosen =
    membershipTypeValue === 'student' || membershipTypeValue === 'full';
  const membershipType = planChosen ? membershipTypeValue : 'full';
  const promoCodeValue = watch('promoCode');
  const paymentConsent = watch('paymentConsent');
  const selectedCountry = resolveCountryByLabel(countryOfResidence);
  const phoneLimits = getNationalPhoneLimitsForCountry(countryOfResidence);
  const showRolePicker =
    !promoLocksPlan && (!isPromoLockedFromReferral || referralResolved);
  const showDetails = planChosen || promoApplied || isPromoLockedFromReferral;

  useEffect(() => {
    const current = String(getValues('contactNumber') || '');
    if (!current) return;
    const sanitized = sanitizeNationalPhoneNumber(current, countryOfResidence);
    if (sanitized !== current) {
      setValue('contactNumber', sanitized, { shouldValidate: Boolean(sanitized) });
    }
  }, [countryOfResidence, getValues, setValue]);

  useEffect(() => {
    let active = true;
    (async () => {
      setDetectingCountry(true);
      try {
        const label = await detectCountryOfResidenceFromIp();
        if (!active) return;
        const current = String(getValues('countryOfResidence') || '').trim();
        if (!current && label) {
          setValue('countryOfResidence', label, { shouldValidate: true });
        }
      } finally {
        if (active) setDetectingCountry(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [getValues, setValue]);

  useEffect(() => {
    const country = String(countryOfResidence || '').trim();
    if (!country || !planChosen) return undefined;

    let active = true;
    setPricingLoading(true);
    (async () => {
      try {
        const data = await getIntlMembershipPricing({
          countryOfResidence: country,
          promoApplied,
          membershipType,
          promoCode: promoApplied ? appliedPromoInputRef.current : undefined,
        });
        if (!active || !data) return;
        setPricing({
          currency: data.currency || INTL_MEMBERSHIP_FEE.currency,
          baseAmount: Number(data.baseAmount) || INTL_MEMBERSHIP_FEE.baseAmount,
          baseAmountSgd: Number(data.baseAmountSgd) || INTL_MEMBERSHIP_FEE.baseAmountSgd,
          totalAmount: Number(data.totalAmount) || INTL_MEMBERSHIP_FEE.baseAmount,
          promoApplied: Boolean(data.promoApplied),
          voucherDiscountAmount:
            Number(data.voucherDiscountAmount) || INTL_MEMBERSHIP_FEE.voucherDiscountAmount,
          exchangeRate: Number(data.exchangeRate) || 1,
          promoFixed: Boolean(data.promoFixed),
        });
      } catch {
        // Keep last known / fallback pricing if backend is unreachable.
      } finally {
        if (active) setPricingLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [countryOfResidence, promoApplied, membershipType, planChosen]);

  const currencyLabel = pricing.currency || INTL_MEMBERSHIP_FEE.currency;
  const showPromoConverted = promoApplied && currencyLabel !== 'SGD' && !pricing.promoFixed;
  const showBaseConverted = currencyLabel !== 'SGD' && !pricing.promoFixed;
  const membershipBaseAmount = Number(pricing.baseAmount) || INTL_MEMBERSHIP_FEE.baseAmount;
  const standardTotal = Number(membershipBaseAmount.toFixed(2));
  const totalAmount = promoApplied
    ? Number(pricing.voucherDiscountAmount || INTL_MEMBERSHIP_FEE.voucherDiscountAmount)
    : Number(pricing.totalAmount) || standardTotal;
  const exchangeRate = Number(pricing.exchangeRate) || 1;
  const baseAmountSgd = Number(pricing.baseAmountSgd) || INTL_MEMBERSHIP_FEE.baseAmountSgd;
  const payableAmountSgd =
    currencyLabel === 'SGD'
      ? Number(totalAmount)
      : exchangeRate > 0
        ? Number(totalAmount) / exchangeRate
        : baseAmountSgd;

  const applyPromoCode = useCallback(
    async (codeOverride) => {
      const code = String(codeOverride ?? getValues('promoCode') ?? '').trim().toUpperCase();
      if (!code) {
        setPromoApplied(false);
        setPromoLocksPlan(false);
        setPromoMessage('Enter a code to apply.');
        appliedPromoInputRef.current = '';
        if (promoAssignedPlanRef.current) {
          promoAssignedPlanRef.current = false;
          setValue('membershipType', '', { shouldValidate: false });
        }
        return;
      }

      setPromoValidating(true);
      try {
        const result = await validateIntlPromoCode({
          code,
          countryOfResidence: String(getValues('countryOfResidence') || '').trim() || undefined,
          membershipType:
            getValues('membershipType') === 'student' ? 'student' : 'full',
        });

        if (result?.valid || result?.discountApplied) {
          const exactCode = String(result?.appliedCode || code).trim().toUpperCase();
          const voucherPlan = String(result?.voucherMembershipType || '').toLowerCase();
          const locksPlan =
            result?.locksMembership === true
            || voucherPlan === 'student'
            || voucherPlan === 'full';
          appliedPromoInputRef.current = exactCode;
          promoAssignedPlanRef.current = locksPlan;
          setValue('promoCode', exactCode);
          if (locksPlan) {
            setValue(
              'membershipType',
              voucherPlan === 'student' ? 'student' : 'full',
              { shouldValidate: true, shouldDirty: true },
            );
          }
          setPromoLocksPlan(locksPlan);
          setPromoApplied(true);
          setPromoMessage(
            result?.message ||
              (locksPlan
                ? `Code verified: ${exactCode}. ${membershipPlanLabel(voucherPlan)} plan applied.`
                : `Code verified: ${exactCode}. Choose Student or Full / Role.`),
          );
          window.setTimeout(() => {
            document
              .getElementById('intl-signup-details')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
          if (result?.currency || result?.payableAmount != null) {
            setPricing((prev) => ({
              ...prev,
              currency: result.currency || prev.currency,
              baseAmount: Number(result.originalAmount) || prev.baseAmount,
              baseAmountSgd: Number(result.baseAmountSgd) || prev.baseAmountSgd,
              totalAmount: Number(result.payableAmount) || prev.totalAmount,
              voucherDiscountAmount:
                Number(result.voucherDiscountAmount ?? result.payableAmount) ||
                prev.voucherDiscountAmount,
              exchangeRate: Number(result.exchangeRate) || prev.exchangeRate,
              promoApplied: true,
              promoFixed: Boolean(result.promoFixed),
            }));
          }
        } else {
          appliedPromoInputRef.current = '';
          setPromoApplied(false);
          setPromoLocksPlan(false);
          if (promoAssignedPlanRef.current) {
            promoAssignedPlanRef.current = false;
            setValue('membershipType', '', { shouldValidate: false });
          }
          setPromoMessage(
            result?.message ||
              result?.affiliateMessage ||
              result?.voucherMessage ||
              'This code is invalid or expired. The standard fee applies.',
          );
        }
      } catch (error) {
        appliedPromoInputRef.current = '';
        setPromoApplied(false);
        setPromoLocksPlan(false);
        if (promoAssignedPlanRef.current) {
          promoAssignedPlanRef.current = false;
          setValue('membershipType', '', { shouldValidate: false });
        }
        setPromoMessage(
          error?.response?.data?.message ||
            error?.message ||
            'Could not validate this code. Please try again.',
        );
      } finally {
        setPromoValidating(false);
        if (lockedReferralCode) {
          setReferralResolved(true);
        }
      }
    },
    [getValues, setValue, lockedReferralCode],
  );

  useEffect(() => {
    if (!promoApplied || !appliedPromoInputRef.current) return undefined;
    applyPromoCode(appliedPromoInputRef.current);
    return undefined;
  }, [countryOfResidence, promoLocksPlan ? null : membershipTypeValue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const normalized = String(promoCodeValue || '').trim().toUpperCase();
    if (appliedPromoInputRef.current && normalized !== appliedPromoInputRef.current) {
      appliedPromoInputRef.current = '';
      setPromoApplied(false);
      setPromoLocksPlan(false);
      setPromoMessage('');
      if (promoAssignedPlanRef.current) {
        promoAssignedPlanRef.current = false;
        setValue('membershipType', '', { shouldValidate: false });
      }
    }
  }, [promoCodeValue, setValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (paymentCanceled) return;

    const refCode = lockedReferralCode;
    if (!refCode) return;

    try {
      sessionStorage.setItem(AFFILIATE_REF_STORAGE_KEY, refCode);
    } catch {
      // ignore storage errors
    }
    setValue('promoCode', refCode);

    if (affiliateTrackedRef.current === refCode) return;
    affiliateTrackedRef.current = refCode;

    trackAffiliateClick({
      affiliateCode: refCode,
      landingPath: window.location.pathname,
    }).catch(() => {});
    applyPromoCode(refCode);
  }, [applyPromoCode, lockedReferralCode, paymentCanceled, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    if (payInFlightRef.current || isSubmitting) {
      return;
    }
    const plan = data.membershipType === 'student' ? 'student' : data.membershipType === 'full' ? 'full' : '';
    if (!plan) {
      setErrorMsg('Please choose a membership plan first.');
      return;
    }
    payInFlightRef.current = true;
    setErrorMsg('');
    try {
      const registered = await intlRegister({
        salutation: data.salutation,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        contactNumber: data.contactNumber
          ? sanitizeNationalPhoneNumber(data.contactNumber, data.countryOfResidence) || undefined
          : undefined,
        password: data.password,
        countryOfResidence: data.countryOfResidence,
        membershipType: plan,
        promoCode: promoApplied
          ? String(data.promoCode || appliedPromoInputRef.current || '').trim().toUpperCase() ||
            undefined
          : undefined,
        paymentConsent: data.paymentConsent,
      });

      if (!registered?.draftUserId || !registered?.signupAccessToken) {
        throw new Error('Could not create registration draft for payment.');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const successUrl = `${origin}${paths.auth.paymentReturn}`;
      const cancelUrl = `${origin}${paths.auth.signUp}?payment=canceled`;

      const checkout = await createIntlCheckoutSession({
        draftUserId: registered.draftUserId,
        signupAccessToken: registered.signupAccessToken,
        successUrl,
        cancelUrl,
        membershipType: plan,
        promoCode: promoApplied
          ? String(data.promoCode || appliedPromoInputRef.current || '').trim().toUpperCase() ||
            undefined
          : undefined,
        paymentConsent: data.paymentConsent,
      });

      if (!checkout?.url) {
        throw new Error('Payment checkout URL was not returned.');
      }

      window.location.href = checkout.url;
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Could not start payment. Please try again.';
      setErrorMsg(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      payInFlightRef.current = false;
    }
  });

  return (
    <AuthCenteredLayout wide>
      <Stack alignItems="center" spacing={0.75} sx={{ mb: { xs: 1.5, md: 2 } }}>
        <Logo disableLink sx={{ width: 88, height: 40 }} />

        <Typography
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 0.75,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.7,
            textTransform: 'uppercase',
            color: NAVY,
            bgcolor: alpha(NAVY, 0.07),
          }}
        >
          International membership
        </Typography>

        <Typography
          component="h1"
          sx={{
            textAlign: 'center',
            fontWeight: 800,
            color: INTL_NAVY_DEEP,
            fontSize: { xs: 20, sm: 22 },
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
          }}
        >
          Register & pay
        </Typography>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center" useFlexGap>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            Already have an account?
          </Typography>
          <Typography
            component="a"
            href={`${paths.auth.signIn}?returnTo=${encodeURIComponent(returnTo)}`}
            onClick={(e) => {
              e.preventDefault();
              navigateToAuthPath(
                router,
                `${paths.auth.signIn}?returnTo=${encodeURIComponent(returnTo)}`,
              );
            }}
            sx={{
              color: RED,
              textDecoration: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Sign in
          </Typography>
        </Stack>
      </Stack>

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
          {errorMsg}
        </Alert>
      ) : null}

      <Box sx={{ width: 1 }}>
        <Stack spacing={1.75} component="form" onSubmit={onSubmit} noValidate>
          {promoLocksPlan ? (
            <Box
              sx={{
                width: 1,
                p: { xs: 1.25, sm: 1.5 },
                borderRadius: 1.5,
                border: `1px solid ${alpha('#0f766e', 0.28)}`,
                bgcolor: alpha('#0f766e', 0.05),
              }}
            >
              <Controller name="membershipType" control={control} render={() => null} />
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 14 }}>
                  1. Membership plan
                </Typography>
                <Chip
                  size="small"
                  label={`${membershipPlanLabel(membershipTypeValue)} · from promo`}
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: 11,
                    bgcolor: alpha('#0f766e', 0.12),
                    color: '#0f766e',
                  }}
                />
              </Stack>
            </Box>
          ) : showRolePicker ? (
          <Controller
            name="membershipType"
            control={control}
            render={({ field }) => {
              const selected =
                field.value === 'student' || field.value === 'full' ? field.value : '';
              const plans = [
                {
                  id: 'student',
                  title: 'Student',
                  blurb: 'Pillar 1 foundations only',
                  icon: 'solar:bookmark-square-bold-duotone',
                },
                {
                  id: 'full',
                  title: 'Full / Role',
                  blurb: 'By role + all pillars',
                  icon: 'solar:users-group-rounded-bold-duotone',
                },
              ];
              return (
                <Box
                  sx={{
                    width: 1,
                    p: { xs: 1.25, sm: 1.5 },
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(NAVY, 0.12)}`,
                    bgcolor: INTL_SOFT_PANEL,
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 14 }}>
                        1. Choose membership
                      </Typography>
                      {selected ? (
                        <Chip
                          size="small"
                          label={membershipPlanLabel(selected)}
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            fontSize: 11,
                            bgcolor: alpha(RED, 0.1),
                            color: RED,
                          }}
                        />
                      ) : null}
                    </Stack>
                    {promoApplied ? (
                      <Typography sx={{ color: alpha(NAVY, 0.65), fontSize: 12, lineHeight: 1.4 }}>
                        This promo works for both plans. Choose Student or Full / Role.
                      </Typography>
                    ) : null}
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 1,
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      }}
                    >
                      {plans.map((plan) => {
                        const active = selected === plan.id;
                        return (
                          <Box
                            key={plan.id}
                            component="button"
                            type="button"
                            onClick={() => {
                              field.onChange(plan.id);
                              window.setTimeout(() => {
                                document
                                  .getElementById('intl-signup-details')
                                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 80);
                            }}
                            sx={{
                              textAlign: 'left',
                              cursor: 'pointer',
                              p: 1.25,
                              borderRadius: 1.25,
                              border: `1.5px solid ${active ? RED : alpha(NAVY, 0.14)}`,
                              bgcolor: active ? '#fff' : alpha('#fff', 0.7),
                              boxShadow: active ? `0 0 0 1px ${alpha(RED, 0.18)}` : 'none',
                              WebkitTapHighlightColor: 'transparent',
                              '&:hover': { borderColor: RED, bgcolor: '#fff' },
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Box
                                sx={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: 1,
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0,
                                  bgcolor: active ? alpha(RED, 0.12) : alpha(NAVY, 0.08),
                                  color: active ? RED : NAVY,
                                }}
                              >
                                <Iconify icon={plan.icon} width={16} />
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: 13.5, lineHeight: 1.2 }}>
                                  {plan.title}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: alpha(NAVY, 0.65), lineHeight: 1.35, mt: 0.25 }}>
                                  {plan.blurb}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Box>
                    {errors.membershipType?.message ? (
                      <Typography sx={{ color: 'error.main', fontSize: 12 }}>
                        {errors.membershipType.message}
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              );
            }}
          />
          ) : isPromoLockedFromReferral && !referralResolved ? (
            <Box
              sx={{
                width: 1,
                py: 1.25,
                px: 1.5,
                borderRadius: 1.5,
                border: `1px dashed ${alpha(NAVY, 0.2)}`,
                bgcolor: alpha(NAVY, 0.02),
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: 13 }}>
                Applying referral code…
              </Typography>
            </Box>
          ) : null}

          {!showDetails ? (
            <Box
              sx={{
                width: 1,
                py: 1.5,
                px: 1.5,
                borderRadius: 1.5,
                border: `1px dashed ${alpha(NAVY, 0.2)}`,
                bgcolor: alpha(NAVY, 0.02),
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: 13 }}>
                Select a plan to unlock details
              </Typography>
            </Box>
          ) : (
            <Box
              id="intl-signup-details"
              sx={{
                width: 1,
                scrollMarginTop: 12,
                p: { xs: 2, sm: 2.5, md: 3 },
                borderRadius: 2,
                border: `1px solid ${alpha(NAVY, 0.12)}`,
                bgcolor: '#fff',
                boxShadow: `0 10px 28px ${alpha(NAVY, 0.05)}`,
              }}
            >
              <Stack spacing={0.5} sx={{ mb: { xs: 2, sm: 2.5 } }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: NAVY,
                    fontSize: { xs: 18, sm: 20 },
                    letterSpacing: '-0.02em',
                  }}
                >
                  2. Your details & payment
                </Typography>
                <Typography sx={{ color: alpha(NAVY, 0.68), fontSize: { xs: 13.5, sm: 14.5 }, lineHeight: 1.5 }}>
                  Enter your personal information and complete payment for your selected plan.
                </Typography>
              </Stack>

          {/* Left: form | Right: voucher + payment */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
              gap: { xs: 2.5, md: 3 },
              alignItems: 'stretch',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 1,
                minHeight: 0,
              }}
            >
            <Box sx={FORM_GRID_SX}>
              <Box sx={FULL}>
                <Controller
                  name="salutation"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...textFieldProps(field)}
                      select
                      fullWidth
                      size="small"
                      required
                      label="Salutation"
                      error={Boolean(fieldError(errors, 'salutation'))}
                      helperText={fieldError(errors, 'salutation')}
                      InputLabelProps={{ shrink: true }}
                      SelectProps={{
                        MenuProps: {
                          disableScrollLock: true,
                          disablePortal: false,
                          anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                          transformOrigin: { vertical: 'top', horizontal: 'left' },
                        },
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FieldIcon {...FIELD_ICON.salutation} />
                          </InputAdornment>
                        ),
                      }}
                    >
                      {['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Box>

              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...textFieldProps(field)}
                    fullWidth
                    size="small"
                    required
                    label="First name"
                    error={Boolean(fieldError(errors, 'firstName'))}
                    helperText={fieldError(errors, 'firstName')}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 80, autoComplete: 'given-name' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FieldIcon {...FIELD_ICON.firstName} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...textFieldProps(field)}
                    fullWidth
                    size="small"
                    required
                    label="Last name"
                    error={Boolean(fieldError(errors, 'lastName'))}
                    helperText={fieldError(errors, 'lastName')}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ maxLength: 80, autoComplete: 'family-name' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <FieldIcon {...FIELD_ICON.lastName} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Box sx={FULL}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...textFieldProps(field)}
                      fullWidth
                      size="small"
                      required
                      type="email"
                      label="Email address"
                      error={Boolean(fieldError(errors, 'email'))}
                      helperText={fieldError(errors, 'email')}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ maxLength: 120, autoComplete: 'email' }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FieldIcon {...FIELD_ICON.email} />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={FULL}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...textFieldProps(field)}
                      fullWidth
                      size="small"
                      required
                      label="Password"
                      placeholder="6+ characters"
                      type={showPassword ? 'text' : 'password'}
                      error={Boolean(fieldError(errors, 'password'))}
                      helperText={fieldError(errors, 'password')}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ maxLength: 72, autoComplete: 'new-password' }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <FieldIcon {...FIELD_ICON.password} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                              <Iconify
                                icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                                sx={{ color: '#64748B' }}
                              />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={FULL}>
                <Controller
                  name="contactNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...textFieldProps(field)}
                      fullWidth
                      size="small"
                      label="Contact number (optional)"
                      placeholder={
                        phoneLimits.max
                          ? `${phoneLimits.max}-digit local number`
                          : 'Local number'
                      }
                      error={Boolean(fieldError(errors, 'contactNumber'))}
                      helperText={
                        fieldError(errors, 'contactNumber') ||
                        phoneLimits.hint ||
                        'Enter local number without country code'
                      }
                      InputLabelProps={{ shrink: true }}
                      inputProps={{
                        inputMode: 'numeric',
                        maxLength: phoneLimits.max || 15,
                        autoComplete: 'tel-national',
                      }}
                      onChange={(event) => {
                        field.onChange(
                          sanitizeNationalPhoneNumber(event.target.value, countryOfResidence),
                        );
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ mr: 0.75 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <FieldIcon {...FIELD_ICON.phone} />
                              <Box
                                sx={{
                                  px: 0.85,
                                  py: 0.35,
                                  borderRadius: 1,
                                  bgcolor: alpha(NAVY, 0.06),
                                  border: `1px solid ${alpha(NAVY, 0.12)}`,
                                  minWidth: 46,
                                  textAlign: 'center',
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: NAVY,
                                    lineHeight: 1.2,
                                    letterSpacing: 0.2,
                                  }}
                                >
                                  {phoneLimits.dialDisplay ||
                                    (selectedCountry ? `+${selectedCountry.phone}` : '+—')}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  width: '1px',
                                  height: 22,
                                  bgcolor: alpha(NAVY, 0.16),
                                }}
                              />
                            </Stack>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={FULL}>
                <Controller
                  name="countryOfResidence"
                  control={control}
                  render={({ field }) => {
                    const { ref, onChange, value, ...restField } = field;
                    const selected = resolveCountryByLabel(value) || null;

                    return (
                      <Autocomplete
                        name={restField.name}
                        onBlur={restField.onBlur}
                        options={COUNTRIES}
                        value={selected}
                        loading={detectingCountry}
                        autoHighlight
                        openOnFocus
                        disableListWrap
                        disableClearable={Boolean(selected)}
                        filterOptions={filterCountries}
                        getOptionLabel={(option) => option?.label || ''}
                        isOptionEqualToValue={(option, val) => option.code === val?.code}
                        onChange={(_, next) => onChange(next?.label || '')}
                        componentsProps={{
                          popper: {
                            placement: 'bottom-start',
                            modifiers: [
                              { name: 'flip', enabled: false },
                              {
                                name: 'preventOverflow',
                                options: { altAxis: false, tether: false },
                              },
                            ],
                          },
                          paper: {
                            elevation: 8,
                            sx: {
                              mt: 0.5,
                              borderRadius: 1.5,
                              border: `1px solid ${alpha(NAVY, 0.1)}`,
                              boxShadow: `0 12px 32px ${alpha(NAVY, 0.14)}`,
                              overflow: 'hidden',
                            },
                          },
                        }}
                        ListboxProps={{ sx: COUNTRY_LISTBOX_SX }}
                        renderOption={(props, option) => {
                          const { key, ...optionProps } = props;
                          return (
                            <Box
                              component="li"
                              key={option.code || key}
                              {...optionProps}
                              sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}
                            >
                              <CountryFlag code={option.code} size={16} />
                              <Typography component="span" variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                                {option.label}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ color: 'text.disabled', fontWeight: 600, flexShrink: 0 }}
                              >
                                +{option.phone}
                              </Typography>
                            </Box>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            inputRef={ref}
                            fullWidth
                            size="small"
                            required
                            label="Country of residence"
                            placeholder="Search country…"
                            error={Boolean(fieldError(errors, 'countryOfResidence'))}
                            helperText={
                              fieldError(errors, 'countryOfResidence') ||
                              (detectingCountry
                                ? 'Detecting your country…'
                                : 'Type to search, or pick from the list')
                            }
                            InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <>
                                  <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                                    {detectingCountry ? (
                                      <Box
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: 1,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          bgcolor: alpha(FIELD_ICON.country.color, 0.12),
                                        }}
                                      >
                                        <CircularProgress size={14} sx={{ color: FIELD_ICON.country.color }} />
                                      </Box>
                                    ) : selected ? (
                                      <Box
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: 1,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          bgcolor: alpha(FIELD_ICON.country.color, 0.12),
                                        }}
                                      >
                                        <CountryFlag code={selected.code} size={16} />
                                      </Box>
                                    ) : (
                                      <FieldIcon {...FIELD_ICON.country} />
                                    )}
                                  </InputAdornment>
                                  {params.InputProps.startAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />
                    );
                  }}
                />
              </Box>
            </Box>

              <Box
                sx={{
                  mt: 'auto',
                  px: 1.5,
                  py: 1.5,
                  borderRadius: 1.5,
                  border: `1px solid ${alpha(NAVY, 0.1)}`,
                  bgcolor: alpha(NAVY, 0.035),
                }}
              >
                <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: 14, lineHeight: 1.5 }}>
                  Account activates after successful payment. Draft details are saved until checkout completes.
                </Typography>
              </Box>
            </Box>

            <Stack spacing={2} sx={{ width: 1, height: 1 }}>
              <Box
                sx={{
                  width: 1,
                  p: 1.25,
                  borderRadius: 1.5,
                  border: `1px solid ${promoApplied ? alpha('#0f766e', 0.3) : alpha(NAVY, 0.12)}`,
                  bgcolor: promoApplied ? alpha('#0f766e', 0.04) : alpha(NAVY, 0.02),
                }}
              >
                <Stack spacing={0.85}>
                  <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography sx={{ fontWeight: 700, color: NAVY, fontSize: 12.5 }}>
                      Voucher / Referral
                    </Typography>
                    <Chip
                      size="small"
                      label={promoApplied ? 'Verified' : 'Optional'}
                      sx={{
                        height: 18,
                        fontWeight: 700,
                        fontSize: 10,
                        bgcolor: promoApplied ? alpha('#0f766e', 0.12) : alpha(NAVY, 0.08),
                        color: promoApplied ? '#0f766e' : NAVY,
                      }}
                    />
                  </Stack>

                  <Controller
                    name="promoCode"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...textFieldProps(field)}
                        fullWidth
                        size="small"
                        placeholder="e.g. PROMO2026"
                        disabled={isPromoLockedFromReferral}
                        inputProps={{
                          readOnly: isPromoLockedFromReferral,
                          style: {
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontWeight: 600,
                            fontSize: 13,
                          },
                          autoComplete: 'off',
                          spellCheck: false,
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Iconify
                                icon="solar:tag-price-bold-duotone"
                                width={16}
                                sx={{ color: RED }}
                              />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <Button
                                size="small"
                                variant="contained"
                                disabled={
                                  promoValidating ||
                                  isPromoLockedFromReferral ||
                                  !String(promoCodeValue || '').trim()
                                }
                                onClick={() => applyPromoCode()}
                                startIcon={
                                  promoValidating ? (
                                    <CircularProgress size={12} color="inherit" />
                                  ) : null
                                }
                                sx={{
                                  minWidth: 64,
                                  px: 1.25,
                                  height: 28,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  boxShadow: 'none',
                                  bgcolor: RED,
                                  color: '#fff',
                                  '&:hover': { bgcolor: '#B7221D', boxShadow: 'none' },
                                  '&.Mui-disabled': {
                                    bgcolor: alpha(RED, 0.35),
                                    color: '#fff',
                                  },
                                }}
                              >
                                {isPromoLockedFromReferral && promoApplied ? 'Applied' : 'Apply'}
                              </Button>
                            </InputAdornment>
                          ),
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            if (isPromoLockedFromReferral) return;
                            applyPromoCode();
                          }
                        }}
                      />
                    )}
                  />

                  {promoValidating ? (
                    <Typography sx={{ color: alpha(NAVY, 0.65), fontSize: 11.5 }}>
                      Verifying…
                    </Typography>
                  ) : promoMessage ? (
                    <Typography
                      sx={{
                        color: promoApplied ? '#0f766e' : alpha(NAVY, 0.65),
                        fontWeight: promoApplied ? 600 : 400,
                        fontSize: 11.5,
                        lineHeight: 1.35,
                      }}
                    >
                      {promoMessage}
                    </Typography>
                  ) : null}
                </Stack>
              </Box>

              <Box
                sx={{
                  width: 1,
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 2,
                  background: `linear-gradient(165deg, ${NAVY} 0%, ${INTL_NAVY_DEEP} 100%)`,
                  color: '#fff',
                  boxShadow: `0 12px 28px ${alpha(NAVY, 0.22)}`,
                }}
              >
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography sx={{ fontWeight: 800, color: '#fff', fontSize: 15 }}>
                    Payment summary
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Chip
                      size="small"
                      label={
                        promoApplied
                          ? `${membershipPlanLabel(membershipType)} · promo`
                          : membershipPlanLabel(membershipType)
                      }
                      sx={{
                        height: 24,
                        fontWeight: 700,
                        fontSize: 11,
                        bgcolor: alpha('#fff', 0.14),
                        color: '#fff',
                      }}
                    />
                    <Chip
                      size="small"
                      label={pricingLoading ? '…' : currencyLabel}
                      sx={{
                        height: 24,
                        fontWeight: 800,
                        fontSize: 11,
                        bgcolor: alpha('#fff', 0.18),
                        color: '#fff',
                      }}
                    />
                  </Stack>
                </Stack>
                <Divider sx={{ borderStyle: 'dashed', borderColor: alpha('#fff', 0.22) }} />

                {promoApplied ? (
                  <>
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: alpha('#fff', 0.78),
                      }}
                    >
                      <span>Original price</span>
                      <Box component="strong" sx={{ color: alpha('#fff', 0.9) }}>
                        {currencyLabel} {formatIntlAmount(standardTotal, currencyLabel)}
                      </Box>
                    </Typography>
                    {showBaseConverted ? (
                      <Typography sx={{ color: alpha('#fff', 0.55), fontSize: 11.5, mt: -0.5 }}>
                        Converted from SGD {formatIntlAmount(baseAmountSgd, 'SGD')}
                      </Typography>
                    ) : null}
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: '#7dffa8',
                      }}
                    >
                      <span>Promotional rate</span>
                      <strong>
                        {currencyLabel} {formatIntlAmount(totalAmount, currencyLabel)}
                      </strong>
                    </Typography>
                    {showPromoConverted ? (
                      <Typography sx={{ color: alpha('#7dffa8', 0.75), fontSize: 11.5, mt: -0.5 }}>
                        Converted from SGD {formatIntlAmount(payableAmountSgd, 'SGD')}
                      </Typography>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: alpha('#fff', 0.82),
                      }}
                    >
                      <span>Membership fee</span>
                      <Box component="strong" sx={{ color: '#fff' }}>
                        {currencyLabel} {formatIntlAmount(membershipBaseAmount, currencyLabel)}
                      </Box>
                    </Typography>
                    {showBaseConverted ? (
                      <Typography sx={{ color: alpha('#fff', 0.55), fontSize: 11.5, mt: -0.5 }}>
                        Converted from SGD {formatIntlAmount(baseAmountSgd, 'SGD')}
                      </Typography>
                    ) : null}
                  </>
                )}

                <Box
                  sx={{
                    mt: 0.25,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 1.5,
                    bgcolor: alpha('#fff', 0.1),
                    border: `1px solid ${alpha('#fff', 0.16)}`,
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      color: '#fff',
                      gap: 1,
                    }}
                  >
                    <span>Total payable</span>
                    <Box
                      component="strong"
                      sx={{ fontSize: 18, letterSpacing: '-0.02em', color: '#fff' }}
                    >
                      {currencyLabel} {formatIntlAmount(totalAmount, currencyLabel)}
                    </Box>
                  </Typography>
                  {showPromoConverted || (!promoApplied && showBaseConverted) ? (
                    <Typography
                      sx={{
                        mt: 0.5,
                        color: alpha('#fff', 0.62),
                        fontSize: 12,
                        textAlign: 'right',
                      }}
                    >
                      Converted from SGD {formatIntlAmount(payableAmountSgd, 'SGD')}
                    </Typography>
                  ) : null}
                </Box>

                <Controller
                  name="paymentConsent"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      sx={{
                        m: 0,
                        mt: 0.75,
                        alignItems: 'flex-start',
                        gap: 1,
                        width: 1,
                        ml: 0,
                        mr: 0,
                        '& .MuiCheckbox-root': {
                          p: 0,
                          mt: '2px',
                          color: alpha('#fff', 0.75),
                          '&.Mui-checked': { color: '#fff' },
                        },
                        '& .MuiFormControlLabel-label': {
                          flex: 1,
                          minWidth: 0,
                          pt: 0,
                        },
                      }}
                      control={
                        <Checkbox
                          size="small"
                          checked={Boolean(field.value)}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label={
                        <Typography
                          sx={{
                            color: alpha('#fff', 0.88),
                            display: 'block',
                            fontSize: { xs: 12.5, sm: 13.5 },
                            lineHeight: 1.45,
                            fontWeight: 500,
                          }}
                        >
                          I confirm this amount and continue to payment.
                        </Typography>
                      }
                    />
                  )}
                />
                {fieldError(errors, 'paymentConsent') ? (
                  <Typography
                    sx={{ color: '#ffb4b4', fontSize: 12, pl: 3.25, mt: 0.25 }}
                  >
                    {fieldError(errors, 'paymentConsent')}
                  </Typography>
                ) : null}

                <Button
                  variant="contained"
                  fullWidth
                  type="submit"
                  disabled={!planChosen || !paymentConsent || isSubmitting}
                  sx={{
                    height: 48,
                    fontWeight: 800,
                    mt: 0.5,
                    textTransform: 'none',
                    boxShadow: 'none',
                    bgcolor: RED,
                    color: '#fff',
                    fontSize: 15,
                    '&:hover': { bgcolor: '#B7221D', boxShadow: 'none' },
                    '&.Mui-disabled': {
                      bgcolor: alpha('#fff', 0.22),
                      color: alpha('#fff', 0.55),
                    },
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    `Pay ${currencyLabel} ${formatIntlAmount(totalAmount, currencyLabel)}`
                  )}
                </Button>
              </Stack>
              </Box>
            </Stack>
          </Box>
            </Box>
          )}
        </Stack>
      </Box>
    </AuthCenteredLayout>
  );
}
