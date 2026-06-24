import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';
import { INPUT_LABEL_ABOVE, MEMBERSHIP_SELECT_MENU_PROPS } from 'src/utils/membership-form-ui';

import { useBoolean } from 'src/hooks/use-boolean';
import { Iconify } from 'src/components/iconify';
import {
  buildSalesforceNexusUserPayloadFromSignup,
  parseSingaporeNricDisplayName,
  resolveVerifiedNricSalesforceFields,
  SALESFORCE_ID_TYPE_BLUE,
  SALESFORCE_ID_TYPE_PINK,
} from 'src/utils/nric-id-type';
import {
  createSalesforceNexusUser,
  setSalesforceNexusPassword,
  saveSalesforceMembershipRecord,
} from 'src/auth/context/jwt';

// ----------------------------------------------------------------------

export const SALESFORCE_CREATE_ACCOUNT_OUTCOMES = new Set([
  'student-create-membership-account',
  'student-fee-paid-create-account',
  'membership-account-create',
  'corporate-membership-signup',
  'verified-nric-signup',
]);

const SALUTATION_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Mdm.'];

const EMPTY_REGISTER_FORM = {
  salutation: 'Mr.',
  firstName: '',
  lastName: '',
  nameAsPerId: '',
  email: '',
};

function resolveEligibilityTypeForSalesforceMembership(flow, membershipOutcome = '') {
  const explicit = String(flow?.eligibilityType || '').trim();
  if (explicit) return explicit;

  const outcome = String(membershipOutcome || '').trim();
  const hasVerifiedNric =
    flow?.spPrVerified === true
    && Boolean(String(flow?.verifiedNricFin || '').trim());

  if (
    outcome === 'verified-nric-signup'
    || outcome === 'fee-waiver-signup'
    || shouldUseNricVerifiedSalesforceCreateStep(flow)
    || hasVerifiedNric
  ) {
    return 'fee-waiver-nric';
  }

  if (isCorporateQuestionnaireMembershipFlow(flow)) {
    return 'corporate-isca-partner';
  }

  if (flow?.eligibilityVerified === true && flow?.eligibilityType === 'experienced') {
    return 'experienced';
  }

  if (flow?.eligibilityVerified === true && flow?.eligibilityType === 'recognition') {
    return 'recognition';
  }

  if (
    flow?.eligibilityVerified === true
    && (flow?.studentMembershipOptIn !== null && flow?.studentMembershipOptIn !== undefined)
  ) {
    return 'student';
  }

  if (flow?.isSingaporePr === true) {
    return 'fee-waiver-nric';
  }

  return 'student';
}

function buildEligibilityPayloadFromFlow(flow, membershipOutcome, salesforceUsername, registerForm = null) {
  const eligibilityType = resolveEligibilityTypeForSalesforceMembership(flow, membershipOutcome);

  if (!flow || typeof flow !== 'object') {
    return {
      eligibilityType,
      snapshot: {
        membershipOutcome,
        salesforceUsername,
        eligibilityType,
        ...(registerForm
          ? {
              firstName: String(registerForm.firstName || '').trim(),
              lastName: String(registerForm.lastName || '').trim(),
              email: String(registerForm.email || '').trim(),
              nameAsPerId: String(registerForm.nameAsPerId || '').trim(),
              salutation: String(registerForm.salutation || '').trim(),
            }
          : {}),
      },
    };
  }
  return {
    isSingaporePr: typeof flow.isSingaporePr === 'boolean' ? flow.isSingaporePr : undefined,
    isIscaMember: typeof flow.isIscaMember === 'boolean' ? flow.isIscaMember : undefined,
    wantsIscaMembership:
      typeof flow.wantsIscaMembership === 'boolean' ? flow.wantsIscaMembership : undefined,
    eligibilityType,
    snapshot: {
      ...flow,
      eligibilityType,
      membershipOutcome: membershipOutcome || '',
      salesforceUsername,
      salesforceMembershipCompletedAt: new Date().toISOString(),
      ...(registerForm
        ? {
            firstName: String(registerForm.firstName || '').trim(),
            lastName: String(registerForm.lastName || '').trim(),
            email: String(registerForm.email || '').trim(),
            nameAsPerId: String(registerForm.nameAsPerId || '').trim(),
            salutation: String(registerForm.salutation || '').trim(),
          }
        : {}),
    },
  };
}

function resolveUsernameFromCreateResponse(createResult, email) {
  const salesforce = createResult?.salesforce ?? createResult;
  if (salesforce && typeof salesforce === 'object') {
    const candidate =
      salesforce.username
      || salesforce.Username
      || salesforce.userName
      || salesforce.UserName;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return email.trim();
}

function resolveNricIdentityForSalesforceApi(flowState) {
  const { idType, idNumber } = resolveVerifiedNricSalesforceFields({ flow: flowState });
  return {
    idType: String(idType || '').trim(),
    idNumber: String(idNumber || '').trim().toUpperCase(),
  };
}

/** Outcomes that require the dedicated Salesforce membership registration form. */
export function isSalesforceMembershipCreateOutcomeKey(outcome) {
  return SALESFORCE_CREATE_ACCOUNT_OUTCOMES.has(outcome);
}

function isCorporateQuestionnaireMembershipFlow(state) {
  return (
    state?.initialQuestionnaireSubmitted
    && state?.isIscaMember === false
    && state?.isSingaporePr === false
    && state?.companyRegistrationUnderCompany === true
    && state?.companyReferenceConfirmed === true
    && !state?.companyReferenceRouteAbandoned
  );
}

function isQuestionnaireSgPrFlow(state) {
  return (
    state?.initialQuestionnaireSubmitted
    && state?.isIscaMember === false
    && state?.isSingaporePr === true
    && !state?.homeGetStartedFlow
  );
}

/** NRIC image or manual verify succeeded — use in-modal SSO create-account (not simple signup). */
export function shouldUseNricVerifiedSalesforceCreateStep(state) {
  if (!state || state.salesforceMembershipAccountCreated) return false;
  if (state.isSingaporePr !== true || state.spPrVerified !== true) return false;
  if (!String(state.verifiedNricFin || '').trim()) return false;
  if (state.feeWaiverViaCompanyReference) return false;

  if (isQuestionnaireSgPrFlow(state)) return true;

  if (!state.initialQuestionnaireSubmitted && state.nricUploadAcknowledged) return true;

  return false;
}

/**
 * Whether the flow should show the dedicated Salesforce create-account step
 * (separate from the generic membership result / signup forms).
 */
export function shouldUseSalesforceMembershipCreateStep(state) {
  if (shouldUseNricVerifiedSalesforceCreateStep(state)) return true;
  if (!state || state.salesforceMembershipAccountCreated) return false;
  if (state.isIscaMember === true) return false;

  if (isCorporateQuestionnaireMembershipFlow(state) && state.salesforceAccountChoice === 'create') {
    return true;
  }

  // Recognition path: create account on /auth/membership/salesforce-create (never in modal).
  if (state.eligibilityType === 'recognition') {
    return false;
  }

  if (
    state.eligibilityVerified === true
    && state.eligibilityType === 'student'
    && state.studentMembershipOptIn === true
  ) {
    return true;
  }
  if (
    state.eligibilityVerified === true
    && state.eligibilityType === 'student'
    && state.studentMembershipOptIn === false
    && state.studentFeePaymentCompleted
  ) {
    return true;
  }
  if (state.eligibilityVerified === true) {
    if (state.eligibilityType === 'scaq-candidate') return false;
    if (state.eligibilityType === 'direct-degree' && state.directDegreeRecognised === false) return false;
    if (state.eligibilityType === 'student') return false;
    return true;
  }
  return false;
}

// ----------------------------------------------------------------------

export function SalesforceMembershipCreateStep({
  title,
  summary,
  defaultEmail = '',
  flowState = null,
  membershipOutcome = '',
  draftUserId = '',
  fullPage = false,
  hideLoginButton = false,
  onPhaseChange,
  onAccountCreated,
  onPasswordSetComplete,
  onLoginWithSalesforce,
}) {
  const theme = useTheme();
  const isCorporateFlow = isCorporateQuestionnaireMembershipFlow(flowState);
  const isNricVerifiedFlow = shouldUseNricVerifiedSalesforceCreateStep(flowState);
  const nricIdentity = useMemo(
    () => (isNricVerifiedFlow ? resolveNricIdentityForSalesforceApi(flowState) : null),
    [flowState, isNricVerifiedFlow]
  );
  const [phase, setPhase] = useState('register');
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [designation, setDesignation] = useState('');
  const [passwordForm, setPasswordForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [nricIdType, setNricIdType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const showPassword = useBoolean();
  const showConfirmPassword = useBoolean();

  useEffect(() => {
    const email = String(defaultEmail || '').trim();
    if (email) {
      setRegisterForm((prev) => ({ ...prev, email }));
    }
  }, [defaultEmail]);

  useEffect(() => {
    const rawName = String(flowState?.verifiedNricNameAsPerId || '').trim();
    const explicitFirstName = String(flowState?.verifiedNricFirstName || '').trim();
    const explicitLastName = String(flowState?.verifiedNricLastName || '').trim();
    if (!rawName || !flowState?.spPrVerified) return;
    const parsed = parseSingaporeNricDisplayName(rawName);
    setRegisterForm((prev) => ({
      ...prev,
      nameAsPerId: prev.nameAsPerId || rawName,
      firstName: prev.firstName || explicitFirstName || parsed.firstName || '',
      lastName: prev.lastName || explicitLastName || parsed.lastName || '',
    }));
  }, [
    flowState?.verifiedNricNameAsPerId,
    flowState?.verifiedNricFirstName,
    flowState?.verifiedNricLastName,
    flowState?.spPrVerified,
  ]);

  useEffect(() => {
    if (!isNricVerifiedFlow) return;
    const detectedIdType = String(nricIdentity?.idType || flowState?.verifiedNricIdType || '').trim();
    if (detectedIdType) {
      setNricIdType(detectedIdType);
    }
  }, [flowState?.verifiedNricIdType, isNricVerifiedFlow, nricIdentity?.idType]);

  useEffect(() => {
    onPhaseChange?.(phase === 'register' ? 0 : 1);
  }, [phase, onPhaseChange]);

  const updateRegisterField = (field) => (event) => {
    setRegisterForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updatePasswordField = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRegisterSubmit = async (event) => {
    event?.preventDefault?.();
    const { salutation, firstName, lastName, nameAsPerId, email } = registerForm;
    if (!firstName.trim() || !lastName.trim() || !nameAsPerId.trim() || !email.trim()) {
      setError('Please complete all required fields.');
      return;
    }
    if (isCorporateFlow && !designation.trim()) {
      setError('Please enter your designation.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let idType = String(flowState?.verifiedNricIdType || '').trim();
      let idNumber = String(flowState?.verifiedNricFin || '').trim();
      if (isNricVerifiedFlow) {
        const resolved = resolveNricIdentityForSalesforceApi(flowState);
        idType = String(nricIdType || resolved.idType).trim();
        idNumber = resolved.idNumber;
        if (!idType || !idNumber) {
          setError('Verified NRIC details are missing. Please go back and complete NRIC verification again.');
          setSubmitting(false);
          return;
        }
      }
      const salesforcePayload = buildSalesforceNexusUserPayloadFromSignup({
        salutation,
        firstName,
        lastName,
        nameAsPerId,
        email,
        idType,
        idNumber,
      });
      const createResult = await createSalesforceNexusUser(salesforcePayload);
      const username = resolveUsernameFromCreateResponse(createResult, email);
      setPasswordForm({ username, password: '', confirmPassword: '' });
      setPhase('set-password');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create Salesforce membership account.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPasswordSubmit = async (event) => {
    event?.preventDefault?.();
    const { username, password, confirmPassword } = passwordForm;
    if (!username.trim()) {
      setError('Salesforce username is required.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await setSalesforceNexusPassword({
        username: username.trim(),
        password,
      });

      const eligibility = buildEligibilityPayloadFromFlow(
        flowState,
        membershipOutcome,
        username.trim(),
        registerForm
      );
      if (isCorporateFlow) {
        eligibility.snapshot = {
          ...eligibility.snapshot,
          companyName: String(flowState?.companyVerifiedName || '').trim(),
          industry: String(flowState?.companyVerifiedIndustry || '').trim(),
          companyReferenceId: String(flowState?.companyReferenceId || '').trim(),
          designation: String(designation || '').trim(),
        };
      }
      if (isNricVerifiedFlow && nricIdentity?.idNumber) {
        const resolvedIdType = String(nricIdType || nricIdentity.idType).trim();
        eligibility.snapshot = {
          ...eligibility.snapshot,
          verifiedNricFin: nricIdentity.idNumber,
          verifiedNricIdType: resolvedIdType,
          idType: resolvedIdType,
          nricFin: nricIdentity.idNumber,
        };
      }
      if (flowState) {
        await saveSalesforceMembershipRecord({
          email: registerForm.email.trim(),
          firstname: registerForm.firstName.trim(),
          lastname: registerForm.lastName.trim(),
          salutation: registerForm.salutation,
          nameAsPerId: registerForm.nameAsPerId.trim(),
          salesforceUsername: username.trim(),
          draftUserId: draftUserId || undefined,
          membershipOutcome: membershipOutcome || undefined,
          eligibilityIsSingaporePr: eligibility.isSingaporePr,
          eligibilityIsIscaMember: eligibility.isIscaMember,
          eligibilityWantsMembership: eligibility.wantsIscaMembership,
          eligibilityType: eligibility.eligibilityType,
          eligibilitySnapshot: eligibility.snapshot,
        });
      }

      if (onPasswordSetComplete) {
        onPasswordSetComplete();
        return;
      }

      onAccountCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set Salesforce password.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldSize = fullPage ? 'medium' : 'small';

  const { primary, secondary } = theme.palette;

  const paperSx = fullPage
    ? {
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: `1px solid ${alpha(primary.main, 0.14)}`,
        boxShadow: `0 12px 40px ${alpha(primary.main, 0.1)}`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${primary.main} 0%, ${secondary.main} 100%)`,
        },
      }
    : {
        p: 2.5,
        borderRadius: 2,
        borderColor: alpha(theme.palette.primary.main, 0.28),
        bgcolor: alpha(theme.palette.primary.main, 0.04),
      };

  const sectionIntro = (
    <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ mb: 3, pt: fullPage ? 1 : 0 }}>
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background:
            phase === 'set-password'
              ? `linear-gradient(135deg, ${alpha(primary.main, 0.15)} 0%, ${alpha(secondary.main, 0.12)} 100%)`
              : alpha(theme.palette.info.main, 0.1),
          border: `1px solid ${alpha(phase === 'set-password' ? primary.main : theme.palette.info.main, 0.22)}`,
        }}
      >
        <Iconify
          icon={phase === 'set-password' ? 'solar:lock-password-bold' : 'mdi:salesforce'}
          width={28}
          sx={{ color: phase === 'set-password' ? 'primary.main' : 'info.main' }}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant={fullPage ? 'h5' : 'subtitle1'}
          sx={{ fontWeight: 800, lineHeight: 1.3 }}
        >
          {phase === 'set-password' ? (
            <>
              <Box component="span" sx={{ color: secondary.main }}>
                Step 2 —{' '}
              </Box>
              <Box component="span" sx={{ color: secondary.main }}>
                Set your login password
              </Box>
            </>
          ) : fullPage ? (
            <>
              <Box component="span" sx={{ color: secondary.main }}>
                Step 1 —{' '}
              </Box>
              <Box component="span" sx={{ color: secondary.main }}>
                Account details
              </Box>
            </>
          ) : (
            title || 'Create membership account'
          )}
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 0.75, lineHeight: 1.65, color: alpha(primary.dark, 0.7) }}
        >
          {phase === 'set-password'
            ? 'Your membership account was created. Set your password, then you will sign in with Eservices to open the application form.'
            : fullPage ? (
              <>
                Enter your details exactly as they appear on your ID. Fields marked with{' '}
                <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  *
                </Box>{' '}
                are required.
              </>
            ) : (
              summary
            )}
        </Typography>
      </Box>
    </Stack>
  );

  return (
    <Stack spacing={fullPage ? 0 : 2}>
      {!fullPage && (
        <Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
                {phase === 'set-password' ? 'Set your Salesforce password' : title || 'Create membership account'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>
                {phase === 'set-password'
                  ? 'Your membership account was created. Choose a password for Salesforce login, then continue to sign in.'
                  : summary}
              </Typography>
            </Box>
            {phase === 'register' && onLoginWithSalesforce && !hideLoginButton && (
              <Button
                variant="outlined"
                color="inherit"
                onClick={onLoginWithSalesforce}
                disabled={submitting}
                sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Login with Eservices
              </Button>
            )}
          </Stack>
        </Box>
      )}

      {fullPage && (
        <Box
          sx={{
            display: { md: 'none' },
            mb: 2,
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            background: `linear-gradient(90deg, ${alpha(primary.main, 0.08)} 0%, ${alpha(secondary.main, 0.06)} 100%)`,
            border: `1px solid ${alpha(primary.main, 0.14)}`,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            <Box component="span" sx={{ color: secondary.main }}>
              Step {phase === 'register' ? '1' : '2'} of 3
            </Box>
            {' — '}
            <Box component="span" sx={{ color: secondary.main }}>
              {phase === 'register' ? 'Account details' : 'Set password'}
            </Box>
          </Typography>
        </Box>
      )}

      {phase === 'register' && (
        <Paper component="form" noValidate onSubmit={handleRegisterSubmit} variant="outlined" sx={paperSx}>
          {fullPage ? sectionIntro : (
            <>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Iconify icon="mdi:salesforce" width={22} sx={{ color: 'info.main' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    <Box component="span" sx={{ color: secondary.main }}>
                      Step 1 —{' '}
                    </Box>
                    <Box component="span" sx={{ color: secondary.main }}>
                      Account details
                    </Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Register your ISCA Salesforce membership account.
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                select
                label="Salutation"
                value={registerForm.salutation}
                onChange={updateRegisterField('salutation')}
                fullWidth
                size={fieldSize}
                disabled={submitting}
                InputLabelProps={INPUT_LABEL_ABOVE}
                SelectProps={{ MenuProps: MEMBERSHIP_SELECT_MENU_PROPS }}
              >
                {SALUTATION_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={8} md={4.5}>
              <TextField
                label="First name"
                value={registerForm.firstName}
                onChange={updateRegisterField('firstName')}
                fullWidth
                size={fieldSize}
                required
                disabled={submitting}
                InputLabelProps={INPUT_LABEL_ABOVE}
              />
            </Grid>
            <Grid item xs={12} sm={12} md={4.5}>
              <TextField
                label="Last name"
                value={registerForm.lastName}
                onChange={updateRegisterField('lastName')}
                fullWidth
                size={fieldSize}
                required
                disabled={submitting}
                InputLabelProps={INPUT_LABEL_ABOVE}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Name as per ID"
                placeholder="e.g. Tan Zhi Wen"
                value={registerForm.nameAsPerId}
                onChange={updateRegisterField('nameAsPerId')}
                fullWidth
                size={fieldSize}
                required
                disabled={submitting}
                InputLabelProps={INPUT_LABEL_ABOVE}
              />
            </Grid>
            {isNricVerifiedFlow && nricIdentity?.idType && nricIdentity?.idNumber && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    label="ID type"
                    value={nricIdType}
                    onChange={(event) => setNricIdType(event.target.value)}
                    fullWidth
                    size={fieldSize}
                    disabled={submitting}
                    InputLabelProps={INPUT_LABEL_ABOVE}
                    SelectProps={MEMBERSHIP_SELECT_MENU_PROPS}
                    helperText="Auto-detected from your NRIC. Change only if incorrect."
                  >
                    <MenuItem value={SALESFORCE_ID_TYPE_BLUE}>{SALESFORCE_ID_TYPE_BLUE}</MenuItem>
                    <MenuItem value={SALESFORCE_ID_TYPE_PINK}>{SALESFORCE_ID_TYPE_PINK}</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="NRIC / FIN number"
                    value={nricIdentity.idNumber}
                    fullWidth
                    size={fieldSize}
                    disabled
                    InputLabelProps={INPUT_LABEL_ABOVE}
                    helperText="Sent automatically when creating your account"
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField
                label="Email address"
                type="email"
                value={registerForm.email}
                onChange={updateRegisterField('email')}
                fullWidth
                size={fieldSize}
                required
                disabled={submitting}
                InputLabelProps={INPUT_LABEL_ABOVE}
                helperText={
                  isCorporateFlow
                    ? 'We will check if a Salesforce account already exists for this email before creating a new account.'
                    : 'Used as your Salesforce username if not assigned separately.'
                }
              />
            </Grid>
            {isCorporateFlow && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Company name"
                    value={String(flowState?.companyVerifiedName || '').trim()}
                    fullWidth
                    size={fieldSize}
                    disabled
                    InputLabelProps={INPUT_LABEL_ABOVE}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Industry"
                    value={String(flowState?.companyVerifiedIndustry || '').trim()}
                    fullWidth
                    size={fieldSize}
                    disabled
                    InputLabelProps={INPUT_LABEL_ABOVE}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Company ID"
                    value={String(flowState?.companyReferenceId || '').trim()}
                    fullWidth
                    size={fieldSize}
                    disabled
                    InputLabelProps={INPUT_LABEL_ABOVE}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Designation"
                    value={designation}
                    onChange={(event) => setDesignation(event.target.value)}
                    fullWidth
                    size={fieldSize}
                    required
                    disabled={submitting}
                    InputLabelProps={INPUT_LABEL_ABOVE}
                  />
                </Grid>
              </>
            )}
          </Grid>

          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mt: 2.5 }}>
              {error}
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              mt: 3,
              pt: 2.5,
              borderTop: `1px solid ${alpha(primary.main, 0.1)}`,
              justifyContent: 'flex-end',
              bgcolor: fullPage ? alpha(primary.main, 0.02) : 'transparent',
              mx: fullPage ? { xs: -2.5, md: -3.5 } : 0,
              mb: fullPage ? { xs: -2.5, md: -3.5 } : 0,
              px: fullPage ? { xs: 2.5, md: 3.5 } : 0,
              pb: fullPage ? { xs: 2.5, md: 3 } : 0,
              borderRadius: fullPage ? '0 0 20px 20px' : 0,
            }}
          >
            <LoadingButton
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              loading={submitting}
              sx={{
                minWidth: { sm: 160 },
                textTransform: 'none',
                fontWeight: 700,
                px: 4,
                boxShadow: `0 6px 20px ${alpha(primary.main, 0.35)}`,
              }}
            >
              Create
            </LoadingButton>
          </Stack>
        </Paper>
      )}

      {phase === 'set-password' && (
        <Paper component="form" noValidate onSubmit={handleSetPasswordSubmit} variant="outlined" sx={paperSx}>
          {fullPage ? sectionIntro : (
            <>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Iconify icon="solar:lock-password-bold" width={22} sx={{ color: 'primary.main' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    <Box component="span" sx={{ color: secondary.main }}>
                      Step 2 —{' '}
                    </Box>
                    <Box component="span" sx={{ color: secondary.main }}>
                      Login password
                    </Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Set the password you will use when signing in with Salesforce.
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          <Alert
            severity="success"
            icon={<Iconify icon="solar:verified-check-bold" width={22} />}
            sx={{
              mb: 3,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.success.main, 0.08),
              border: `1px solid ${alpha(theme.palette.success.main, 0.24)}`,
              '& .MuiAlert-icon': { color: 'success.main' },
            }}
          >
            Membership account created successfully. Set your password below, then sign in with
            Eservices.
          </Alert>

          <Grid container spacing={2.5}>
            <Grid item xs={12}>
              <TextField
                label="Salesforce username"
                value={passwordForm.username}
                onChange={updatePasswordField('username')}
                fullWidth
                size={fieldSize}
                required
                disabled={submitting}
                InputLabelProps={INPUT_LABEL_ABOVE}
                helperText="Usually your email address."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Password"
                type={showPassword.value ? 'text' : 'password'}
                value={passwordForm.password}
                onChange={updatePasswordField('password')}
                fullWidth
                size={fieldSize}
                required
                disabled={submitting}
                InputLabelProps={INPUT_LABEL_ABOVE}
                helperText="Minimum 8 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={showPassword.onToggle} edge="end" aria-label="toggle password">
                        <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Confirm password"
                type={showConfirmPassword.value ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={updatePasswordField('confirmPassword')}
                fullWidth
                size={fieldSize}
                required
                disabled={submitting}
                InputLabelProps={INPUT_LABEL_ABOVE}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={showConfirmPassword.onToggle}
                        edge="end"
                        aria-label="toggle confirm password"
                      >
                        <Iconify icon={showConfirmPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mt: 2.5 }}>
              {error}
            </Alert>
          )}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{
              mt: 3,
              pt: 2.5,
              borderTop: `1px solid ${alpha(primary.main, 0.1)}`,
              justifyContent: 'space-between',
              bgcolor: fullPage ? alpha(secondary.main, 0.04) : 'transparent',
              mx: fullPage ? { xs: -2.5, md: -3.5 } : 0,
              mb: fullPage ? { xs: -2.5, md: -3.5 } : 0,
              px: fullPage ? { xs: 2.5, md: 3.5 } : 0,
              pb: fullPage ? { xs: 2.5, md: 3 } : 0,
              borderRadius: fullPage ? '0 0 20px 20px' : 0,
            }}
          >
            <LoadingButton
              variant="outlined"
              color="secondary"
              disabled={submitting}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={20} />}
              onClick={() => {
                setError('');
                setPhase('register');
              }}
              sx={{ textTransform: 'none', fontWeight: 600, borderWidth: 1.5 }}
            >
              Back
            </LoadingButton>
            <LoadingButton
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              loading={submitting}
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={20} />}
              sx={{
                minWidth: { sm: 280 },
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                boxShadow: `0 6px 20px ${alpha(primary.main, 0.35)}`,
              }}
            >
              Set password and sign in
            </LoadingButton>
          </Stack>
        </Paper>
      )}

      {!fullPage && (
        <Typography variant="caption" color="text.secondary">
          {phase === 'set-password'
            ? 'After setting your password, use Login with Eservices on the next screen.'
            : 'Next you will set your Salesforce login password, then sign in to the platform.'}
        </Typography>
      )}
    </Stack>
  );
}
