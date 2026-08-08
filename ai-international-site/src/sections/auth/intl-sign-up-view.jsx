'use client';

import { useEffect, useRef, useState } from 'react';
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
} from 'src/services/intl-payment.service';
import { navigateToAuthPath } from 'src/utils/intl-auth-navigate';
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
const RED = '#C00000';

const FORM_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  columnGap: 2.5,
  rowGap: 2.75,
  '& .MuiFormLabel-asterisk': { color: 'error.main' },
  '& > *': { minWidth: 0 },
};

const FULL = { gridColumn: '1 / -1' };

/** ~10 compact rows visible before scroll. */
const COUNTRY_LISTBOX_SX = {
  maxHeight: 360,
  py: 0.5,
  '& .MuiAutocomplete-option': {
    minHeight: 36,
    py: 0.75,
    px: 1.5,
    fontSize: 14,
  },
};

const filterCountries = createFilterOptions({
  stringify: (option) => `${option.label} ${option.code} ${option.phone}`,
});

function fieldError(errors, name) {
  return errors?.[name]?.message || '';
}

/** React 19: never spread RHF `ref` onto JSX; map it to MUI `inputRef`. */
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
        bgcolor: alpha(color, 0.12),
        color,
      }}
    >
      <Iconify icon={icon} width={16} />
    </Box>
  );
}

const FIELD_ICON = {
  salutation: { icon: 'solar:user-speak-rounded-bold-duotone', color: '#7C3AED' },
  firstName: { icon: 'solar:user-bold-duotone', color: '#2563EB' },
  lastName: { icon: 'solar:user-id-bold-duotone', color: '#0D9488' },
  email: { icon: 'solar:letter-bold-duotone', color: '#EA580C' },
  password: { icon: 'solar:lock-password-bold-duotone', color: '#C00000' },
  phone: { icon: 'solar:phone-bold-duotone', color: '#059669' },
  country: { icon: 'solar:global-bold-duotone', color: '#002060' },
};

// ----------------------------------------------------------------------

export function IntlSignUpView() {
  const router = useRouter();
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
  const payInFlightRef = useRef(false);

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
    if (payInFlightRef.current || isSubmitting) {
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
    } finally {
      payInFlightRef.current = false;
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
            component="a"
            href={`${paths.auth.signIn}?returnTo=${encodeURIComponent(returnTo)}`}
            onClick={(e) => {
              e.preventDefault();
              navigateToAuthPath(
                router,
                `${paths.auth.signIn}?returnTo=${encodeURIComponent(returnTo)}`,
              );
            }}
            variant="subtitle2"
            sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700, cursor: 'pointer' }}
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
                    required
                    label="First name"
                    error={Boolean(fieldError(errors, 'firstName'))}
                    helperText={fieldError(errors, 'firstName')}
                    InputLabelProps={{ shrink: true }}
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
                    required
                    label="Last name"
                    error={Boolean(fieldError(errors, 'lastName'))}
                    helperText={fieldError(errors, 'lastName')}
                    InputLabelProps={{ shrink: true }}
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
                      required
                      type="email"
                      label="Email address"
                      error={Boolean(fieldError(errors, 'email'))}
                      helperText={fieldError(errors, 'email')}
                      InputLabelProps={{ shrink: true }}
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
                      label="Contact number (optional)"
                      error={Boolean(fieldError(errors, 'contactNumber'))}
                      helperText={fieldError(errors, 'contactNumber')}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ minWidth: 72, mr: 0.5 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 64 }}>
                              <FieldIcon {...FIELD_ICON.phone} />
                              {selectedCountry ? (
                                <>
                                  <CountryFlag code={selectedCountry.code} />
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'text.secondary', fontWeight: 600, minWidth: 28 }}
                                  >
                                    +{selectedCountry.phone}
                                  </Typography>
                                </>
                              ) : null}
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

            <Stack spacing={1.75} sx={{ width: 1 }}>
              <Box
                sx={{
                  width: 1,
                  p: { xs: 1.75, md: 2 },
                  borderRadius: 2,
                  border: `1px solid ${promoApplied ? alpha('#0f766e', 0.4) : alpha(RED, 0.28)}`,
                  background: promoApplied
                    ? `linear-gradient(145deg, ${alpha('#0f766e', 0.1)} 0%, ${alpha('#14b8a6', 0.06)} 100%)`
                    : `linear-gradient(145deg, ${alpha(RED, 0.08)} 0%, ${alpha('#fff7f5', 1)} 55%, ${alpha(NAVY, 0.04)} 100%)`,
                  boxShadow: `0 8px 24px ${alpha(promoApplied ? '#0f766e' : RED, 0.08)}`,
                }}
              >
                <Stack spacing={1.25}>
                  <Stack spacing={0.25}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Box
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: 1,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: promoApplied ? alpha('#0f766e', 0.14) : alpha(RED, 0.12),
                          color: promoApplied ? '#0f766e' : RED,
                        }}
                      >
                        <Iconify icon="solar:ticket-bold-duotone" width={18} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: NAVY }}>
                        Voucher / Referral code
                      </Typography>
                      {promoApplied ? (
                        <Chip
                          size="small"
                          label="Verified"
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            bgcolor: alpha('#0f766e', 0.14),
                            color: '#0f766e',
                          }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          label="Optional"
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            bgcolor: alpha(RED, 0.1),
                            color: RED,
                          }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{ color: alpha(NAVY, 0.62), pl: { xs: 0, sm: 4.75 } }}
                    >
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
                              <Iconify
                                icon="solar:tag-price-bold-duotone"
                                width={18}
                                sx={{ color: RED }}
                              />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <Button
                                size="small"
                                variant="contained"
                                disabled={!String(promoCodeValue || '').trim()}
                                onClick={applyPromoCode}
                                sx={{
                                  minWidth: 76,
                                  px: 1.5,
                                  height: 32,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  boxShadow: 'none',
                                  bgcolor: RED,
                                  color: '#fff',
                                  '&:hover': { bgcolor: '#a00000', boxShadow: 'none' },
                                  '&.Mui-disabled': {
                                    bgcolor: alpha(RED, 0.35),
                                    color: '#fff',
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
                      sx={{
                        color: promoApplied ? '#0f766e' : alpha(NAVY, 0.65),
                        fontWeight: promoApplied ? 600 : 400,
                      }}
                    >
                      {promoMessage}
                    </Typography>
                  ) : (
                    <Typography variant="caption" sx={{ color: alpha(NAVY, 0.55) }}>
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
                  border: `1px solid ${alpha(NAVY, 0.2)}`,
                  background: `
                    linear-gradient(165deg, ${NAVY} 0%, #003087 48%, #001a4d 100%)
                  `,
                  boxShadow: `0 14px 36px ${alpha(NAVY, 0.28)}`,
                  color: '#fff',
                }}
              >
              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: 1,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: alpha('#fff', 0.14),
                        color: '#fff',
                      }}
                    >
                      <Iconify icon="solar:card-bold-duotone" width={18} />
                    </Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fff' }}>
                      Payment summary
                    </Typography>
                  </Stack>
                  <Chip
                    size="small"
                    label={pricingLoading ? '…' : currencyLabel}
                    sx={{
                      height: 24,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      bgcolor: alpha('#fff', 0.16),
                      color: '#fff',
                      border: `1px solid ${alpha('#fff', 0.28)}`,
                    }}
                  />
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
                        {currencyLabel} {standardTotal.toFixed(2)}
                      </Box>
                    </Typography>
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
                        {currencyLabel} {Number(totalAmount).toFixed(2)}
                      </strong>
                    </Typography>
                  </>
                ) : (
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
                      {currencyLabel} {Number(membershipBaseAmount).toFixed(2)}
                    </Box>
                  </Typography>
                )}

                {currencyLabel !== 'SGD' && !promoApplied ? (
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.62) }}>
                    Converted from SGD {Number(pricing.baseAmountSgd || 365).toFixed(2)}
                  </Typography>
                ) : null}

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
                      {currencyLabel} {Number(totalAmount).toFixed(2)}
                    </Box>
                  </Typography>
                </Box>

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
                          color: alpha('#fff', 0.7),
                          '&.Mui-checked': { color: '#fff' },
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
                        <Typography
                          variant="caption"
                          sx={{ color: alpha('#fff', 0.78), display: 'block' }}
                        >
                          I confirm this payable amount and want to continue to payment.
                        </Typography>
                      }
                    />
                  )}
                />
                {fieldError(errors, 'paymentConsent') ? (
                  <Typography variant="caption" sx={{ color: '#ffb4b4' }}>
                    {fieldError(errors, 'paymentConsent')}
                  </Typography>
                ) : null}

                <Button
                  size="large"
                  variant="contained"
                  fullWidth
                  type="submit"
                  disabled={!paymentConsent || isSubmitting}
                  sx={{
                    height: 48,
                    fontWeight: 800,
                    mt: 0.5,
                    textTransform: 'none',
                    boxShadow: 'none',
                    bgcolor: RED,
                    color: '#fff',
                    '&:hover': { bgcolor: '#a00000', boxShadow: 'none' },
                    '&.Mui-disabled': {
                      bgcolor: alpha('#fff', 0.22),
                      color: alpha('#fff', 0.55),
                    },
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
              px: { xs: 1.75, md: 2 },
              py: { xs: 1.5, md: 1.75 },
              borderRadius: 2,
              border: `1px solid ${alpha(NAVY, 0.22)}`,
              background: `
                linear-gradient(135deg, ${alpha(NAVY, 0.1)} 0%, ${alpha('#1d4ed8', 0.08)} 45%, ${alpha(RED, 0.06)} 100%)
              `,
              boxShadow: `0 8px 22px ${alpha(NAVY, 0.08)}`,
            }}
          >
            <Stack direction="row" spacing={1.25} alignItems="flex-start">
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.25,
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: alpha(NAVY, 0.12),
                  color: NAVY,
                }}
              >
                <Iconify icon="solar:shield-check-bold" width={20} />
              </Box>
              <Stack spacing={0.35}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: NAVY }}>
                  No separate create account step
                </Typography>
                <Typography variant="caption" sx={{ color: alpha(NAVY, 0.7), lineHeight: 1.55 }}>
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
