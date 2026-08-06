'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Alert from '@mui/material/Alert';
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
} from 'src/services/intl-payment.service';
import {
  COUNTRIES,
  getCountryFlagUrl,
  resolveCountryByLabel,
} from 'src/assets/data/countries';
import { detectCountryOfResidenceFromIp } from 'src/utils/detect-country-from-ip';
import {
  INTL_MEMBERSHIP_FEE,
  INTL_PAID_SIGNUP_DEFAULTS,
  IntlPaidSignUpSchema,
} from 'src/validations/intl-auth.validation';

// ----------------------------------------------------------------------

const NAVY = '#002060';

const FORM_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  columnGap: 2.5,
  rowGap: 2.75,
  '& .MuiFormLabel-asterisk': { color: 'error.main' },
  '& > *': { minWidth: 0 },
};

const FULL = { gridColumn: '1 / -1' };

function fieldError(errors, name) {
  return errors?.[name]?.message || '';
}

/** React 19: RHF `ref` must go to MUI `inputRef`, not element.ref. */
function textFieldProps(field) {
  const { ref, ...rest } = field;
  return { ...rest, inputRef: ref };
}

function CountryFlag({ code, size = 18 }) {
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

// ----------------------------------------------------------------------

export function IntlSignUpView() {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || paths.dashboard;
  const paymentCanceled = searchParams.get('payment') === 'canceled';
  const [errorMsg, setErrorMsg] = useState(
    paymentCanceled ? 'Payment was canceled. You can try again when ready.' : '',
  );
  const [showPassword, setShowPassword] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [detectingCountry, setDetectingCountry] = useState(true);
  const [pricing, setPricing] = useState({
    currency: INTL_MEMBERSHIP_FEE.currency,
    baseAmount: INTL_MEMBERSHIP_FEE.baseAmount,
    baseAmountSgd: INTL_MEMBERSHIP_FEE.baseAmountSgd,
    totalAmount: INTL_MEMBERSHIP_FEE.baseAmount,
    promoApplied: false,
    voucherDiscountAmount: INTL_MEMBERSHIP_FEE.voucherDiscountAmount,
    exchangeRate: 1,
  });
  const [pricingLoading, setPricingLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(IntlPaidSignUpSchema),
    defaultValues: INTL_PAID_SIGNUP_DEFAULTS,
  });

  const countryOfResidence = watch('countryOfResidence');
  const promoCodeValue = watch('promoCode');
  const paymentConsent = watch('paymentConsent');
  const selectedCountry = resolveCountryByLabel(countryOfResidence);

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
    if (!country) return undefined;

    let active = true;
    setPricingLoading(true);
    (async () => {
      try {
        const data = await getIntlMembershipPricing({
          countryOfResidence: country,
          promoApplied,
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
  }, [countryOfResidence, promoApplied]);

  const currencyLabel = pricing.currency || INTL_MEMBERSHIP_FEE.currency;
  const membershipBaseAmount = Number(pricing.baseAmount) || INTL_MEMBERSHIP_FEE.baseAmount;
  const standardTotal = Number(membershipBaseAmount.toFixed(2));
  const totalAmount = promoApplied
    ? Number(pricing.voucherDiscountAmount || INTL_MEMBERSHIP_FEE.voucherDiscountAmount)
    : Number(pricing.totalAmount) || standardTotal;

  const applyPromoCode = () => {
    const code = String(getValues('promoCode') || '').trim().toUpperCase();
    if (!code) {
      setPromoApplied(false);
      setPromoMessage('Enter a code to apply.');
      return;
    }
    setValue('promoCode', code);
    if (code.length >= 4) {
      setPromoApplied(true);
      setPromoMessage(`Code verified: ${code}`);
    } else {
      setPromoApplied(false);
      setPromoMessage('This code is invalid. The standard fee applies.');
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    setErrorMsg('');
    try {
      const registered = await intlRegister({
        salutation: data.salutation,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        contactNumber: data.contactNumber || undefined,
        password: data.password,
        countryOfResidence: data.countryOfResidence,
        promoCode: data.promoCode || undefined,
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
        promoCode: data.promoCode || undefined,
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
    }
  });

  return (
    <AuthCenteredLayout wide>
      <Stack alignItems="center" spacing={1.25} sx={{ mb: { xs: 2.5, md: 2.5 } }}>
        <Logo disableLink sx={{ width: 104, maxWidth: 120, height: 46, maxHeight: 52 }} />

        <Typography
          sx={{
            mt: 0.25,
            px: 1.25,
            py: 0.35,
            borderRadius: 1,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: NAVY,
            bgcolor: alpha(NAVY, 0.08),
          }}
        >
          International membership
        </Typography>

        <Typography
          variant="h4"
          sx={{
            textAlign: 'center',
            fontWeight: 700,
            color: NAVY,
            fontSize: { xs: 22, sm: 26 },
            letterSpacing: -0.3,
          }}
        >
          Complete your payment
        </Typography>

        <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center" useFlexGap>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Already have an account?
          </Typography>
          <Typography
            component={Link}
            href={`${paths.auth.signIn}?returnTo=${encodeURIComponent(returnTo)}`}
            variant="subtitle2"
            sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
          >
            Sign in
          </Typography>
        </Stack>
      </Stack>

      {errorMsg ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      ) : null}

      <Box
        sx={{
          p: { xs: 0, md: 0 },
          bgcolor: 'transparent',
        }}
      >
        <Stack spacing={2.5} component="form" onSubmit={onSubmit} noValidate>
          {/* Left: form | Right: voucher + payment */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2.5,
              alignItems: 'start',
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
                      required
                      label="Salutation"
                      error={Boolean(fieldError(errors, 'salutation'))}
                      helperText={fieldError(errors, 'salutation')}
                      InputLabelProps={{ shrink: true }}
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
                    required
                    label="First name"
                    error={Boolean(fieldError(errors, 'firstName'))}
                    helperText={fieldError(errors, 'firstName')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:user-id-bold-duotone" width={18} />
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
                    required
                    label="Last name"
                    error={Boolean(fieldError(errors, 'lastName'))}
                    helperText={fieldError(errors, 'lastName')}
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:user-id-bold-duotone" width={18} />
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
                      required
                      type="email"
                      label="Email address"
                      error={Boolean(fieldError(errors, 'email'))}
                      helperText={fieldError(errors, 'email')}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="solar:letter-bold-duotone" width={18} />
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
                      required
                      label="Password"
                      placeholder="6+ characters"
                      type={showPassword ? 'text' : 'password'}
                      error={Boolean(fieldError(errors, 'password'))}
                      helperText={fieldError(errors, 'password')}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="solar:lock-password-bold-duotone" width={18} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                              <Iconify
                                icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
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
                      label="Contact number (optional)"
                      error={Boolean(fieldError(errors, 'contactNumber'))}
                      helperText={fieldError(errors, 'contactNumber')}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: selectedCountry ? (
                          <InputAdornment position="start">
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <CountryFlag code={selectedCountry.code} />
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontWeight: 600 }}
                              >
                                +{selectedCountry.phone}
                              </Typography>
                            </Stack>
                          </InputAdornment>
                        ) : (
                          <InputAdornment position="start">
                            <Iconify icon="solar:phone-bold-duotone" width={18} />
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
                  render={({ field }) => (
                    <TextField
                      {...textFieldProps(field)}
                      select
                      fullWidth
                      required
                      label="Country of residence"
                      error={Boolean(fieldError(errors, 'countryOfResidence'))}
                      helperText={
                        fieldError(errors, 'countryOfResidence') ||
                        (detectingCountry
                          ? 'Detecting your country…'
                          : 'Auto-detected from your location')
                      }
                      InputLabelProps={{ shrink: true }}
                      SelectProps={{
                        renderValue: (value) => {
                          const country = resolveCountryByLabel(value);
                          return (
                            <Stack direction="row" spacing={1} alignItems="center">
                              {detectingCountry ? (
                                <CircularProgress size={14} />
                              ) : country ? (
                                <CountryFlag code={country.code} />
                              ) : (
                                <Iconify icon="solar:global-bold-duotone" width={18} />
                              )}
                              <span>{value}</span>
                            </Stack>
                          );
                        },
                      }}
                    >
                      {COUNTRIES.map((country) => (
                        <MenuItem key={country.code} value={country.label}>
                          <Stack direction="row" spacing={1.25} alignItems="center">
                            <CountryFlag code={country.code} />
                            <span>{country.label}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Box>
            </Box>

            <Stack spacing={1.5} sx={{ width: 1 }}>
              <Box
                sx={{
                  width: 1,
                  p: { xs: 0, md: 2 },
                  borderRadius: 1.5,
                  border: {
                    xs: 'none',
                    md: `1px solid ${promoApplied ? alpha('#0f766e', 0.35) : alpha(NAVY, 0.12)}`,
                  },
                  bgcolor: {
                    xs: 'transparent',
                    md: promoApplied ? alpha('#0f766e', 0.04) : alpha(NAVY, 0.02),
                  },
                }}
              >
                <Stack spacing={1.25}>
                  <Stack spacing={0.25}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Iconify
                        icon="solar:ticket-bold-duotone"
                        width={18}
                        sx={{ color: 'text.secondary' }}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Voucher / Referral code
                      </Typography>
                      {promoApplied ? (
                        <Chip
                          size="small"
                          color="success"
                          label="Verified"
                          sx={{ height: 22, fontWeight: 600 }}
                        />
                      ) : null}
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', pl: 3.5 }}>
                      Enter a valid code. The payable amount updates after verification.
                    </Typography>
                  </Stack>

                  <Controller
                    name="promoCode"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...textFieldProps(field)}
                        fullWidth
                        label="Code"
                        placeholder="e.g. PROMO2026"
                        InputLabelProps={{ shrink: true }}
                        inputProps={{
                          style: {
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontWeight: 600,
                          },
                          autoComplete: 'off',
                          spellCheck: false,
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Iconify icon="solar:tag-price-bold-duotone" width={18} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <Button
                                size="small"
                                variant="contained"
                                color="inherit"
                                disabled={!String(promoCodeValue || '').trim()}
                                onClick={applyPromoCode}
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
                                  '&.Mui-disabled': {
                                    bgcolor: 'grey.400',
                                    color: 'common.white',
                                  },
                                }}
                              >
                                Apply
                              </Button>
                            </InputAdornment>
                          ),
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            applyPromoCode();
                          }
                        }}
                      />
                    )}
                  />

                  {promoMessage ? (
                    <Typography
                      variant="caption"
                      sx={{ color: promoApplied ? 'success.main' : 'text.secondary' }}
                    >
                      {promoMessage}
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Optional. Leave blank to continue with the standard membership fee.
                    </Typography>
                  )}
                </Stack>
              </Box>

              <Box
                sx={{
                  width: 1,
                  p: { xs: 2, md: 2.25 },
                  borderRadius: 2,
                  border: `1px solid ${alpha(NAVY, 0.14)}`,
                  bgcolor: alpha(NAVY, 0.035),
                }}
              >
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Payment summary
                  </Typography>
                  <Chip
                    size="small"
                    color="default"
                    variant="outlined"
                    label={pricingLoading ? '…' : currencyLabel}
                  />
                </Stack>
                <Divider sx={{ borderStyle: 'dashed' }} />

                {promoApplied ? (
                  <>
                    <Typography
                      variant="body2"
                      sx={{ display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>Original price</span>
                      <strong>
                        {currencyLabel} {standardTotal.toFixed(2)}
                      </strong>
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        color: 'success.main',
                      }}
                    >
                      <span>Promotional rate</span>
                      <strong>
                        {currencyLabel} {Number(totalAmount).toFixed(2)}
                      </strong>
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <span>Membership fee</span>
                    <strong>
                      {currencyLabel} {Number(membershipBaseAmount).toFixed(2)}
                    </strong>
                  </Typography>
                )}

                {currencyLabel !== 'SGD' && !promoApplied ? (
                  <Typography variant="caption" color="text.secondary">
                    Converted from SGD {Number(pricing.baseAmountSgd || 365).toFixed(2)}
                  </Typography>
                ) : null}

                <Typography
                  variant="subtitle2"
                  sx={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>Total payable</span>
                  <strong>
                    {currencyLabel} {Number(totalAmount).toFixed(2)}
                  </strong>
                </Typography>

                <Controller
                  name="paymentConsent"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      sx={{
                        m: 0,
                        mt: 0.5,
                        alignItems: 'center',
                        gap: 0.75,
                        '& .MuiCheckbox-root': {
                          p: 0,
                          alignSelf: 'center',
                        },
                        '& .MuiFormControlLabel-label': {
                          pt: 0,
                          lineHeight: 1.45,
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
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          I confirm this payable amount and want to continue to payment.
                        </Typography>
                      }
                    />
                  )}
                />
                {fieldError(errors, 'paymentConsent') ? (
                  <Typography variant="caption" color="error">
                    {fieldError(errors, 'paymentConsent')}
                  </Typography>
                ) : null}

                <Button
                  size="large"
                  variant="contained"
                  color="primary"
                  fullWidth
                  type="submit"
                  disabled={!paymentConsent || isSubmitting}
                  sx={{
                    height: 48,
                    fontWeight: 700,
                    mt: 0.5,
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' },
                  }}
                >
                  {isSubmitting ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    `Pay ${currencyLabel} ${Number(totalAmount).toFixed(2)}`
                  )}
                </Button>
              </Stack>
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              width: 1,
              px: { xs: 0, md: 1.5 },
              py: { xs: 0.5, md: 1.25 },
              borderRadius: { xs: 0, md: 1.5 },
              border: {
                xs: 'none',
                md: `1px solid ${alpha(NAVY, 0.12)}`,
              },
              bgcolor: {
                xs: 'transparent',
                md: alpha(NAVY, 0.03),
              },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Iconify icon="solar:shield-check-bold" width={18} />
              <Stack spacing={0.25}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  No separate create account step
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  We save these details as a draft first. Your account is created automatically only
                  after payment succeeds.
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </AuthCenteredLayout>
  );
}
