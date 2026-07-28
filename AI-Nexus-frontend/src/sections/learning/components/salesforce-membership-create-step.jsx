import { useCallback, useEffect, useMemo, useState } from 'react';

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
import CircularProgress from '@mui/material/CircularProgress';
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
  checkSalesforceUserByNric,
  updateSalesforceNexusUser,
} from 'src/auth/context/jwt';
import { assertSalesforceEmailAvailable } from 'src/utils/salesforce-email-check';
import {
  clearPendingNexusPasswordSetup,
  readPendingNexusPasswordSetup,
  writePendingNexusPasswordSetup,
} from 'src/utils/pending-nexus-password-session';

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
  if (state.salesforceExistingAccountFound) return false;
  if (state.salesforceNexusUserUpdated) return false;
  if (String(state.salesforcePendingAccountId || '').trim() && state.citizenshipRecordUpdated) {
    return false;
  }
  if (state.citizenshipUpdateMode) return false;
  if (state.isSingaporePr !== true || state.spPrVerified !== true) return false;
  if (!String(state.verifiedNricFin || '').trim()) return false;
  if (state.feeWaiverViaCompanyReference) return false;

  if (isQuestionnaireSgPrFlow(state)) {
    // No / Yes / Yes + company verified → corporate fee-waiver result, not in-modal create.
    if (
      state.companyRegistrationUnderCompany === true
      && state.companyReferenceConfirmed === true
      && !state.companyReferenceRouteAbandoned
    ) {
      return false;
    }
    return true;
  }

  if (!state.initialQuestionnaireSubmitted && state.nricUploadAcknowledged) return true;

  return false;
}

/** Existing eServices account — update NRIC/citizenship after verification (citizenship gap flow). */
export function shouldUseNricVerifiedSalesforceUpdateStep(state) {
  if (!state || state.salesforceNexusUserUpdated) return false;
  if (state.salesforceExistingAccountFound) return false;
  if (!String(state.salesforcePendingAccountId || '').trim()) return false;
  if (state.spPrVerified !== true) return false;
  if (!String(state.verifiedNricFin || '').trim()) return false;
  return state.citizenshipRecordUpdated === true;
}

/**
 * Whether the flow should show the dedicated Salesforce create-account step
 * (separate from the generic membership result / signup forms).
 */
export function shouldUseSalesforceMembershipCreateStep(state) {
  if (shouldUseNricVerifiedSalesforceUpdateStep(state)) return true;
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
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [designation, setDesignation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nricIdType, setNricIdType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState('');
  const [error, setError] = useState('');
  const [emailSfChecking, setEmailSfChecking] = useState(false);
  const [emailSfError, setEmailSfError] = useState('');
  /** True once createuserfornexus has succeeded in this browser session. */
  const [accountCreatedPendingPassword, setAccountCreatedPendingPassword] = useState(false);
  const [pendingUsername, setPendingUsername] = useState('');
  const showPassword = useBoolean();
  const showConfirmPassword = useBoolean();
  const shouldCheckSalesforceEmail = isNricVerifiedFlow || isCorporateFlow;

  const applyPendingPasswordSetup = useCallback((pending) => {
    if (!pending?.username) return;
    if (pending.registerForm) {
      setRegisterForm((prev) => ({
        ...prev,
        salutation: pending.registerForm.salutation || prev.salutation || 'Mr.',
        firstName: pending.registerForm.firstName || prev.firstName,
        lastName: pending.registerForm.lastName || prev.lastName,
        nameAsPerId: pending.registerForm.nameAsPerId || prev.nameAsPerId,
        email: pending.registerForm.email || pending.email || prev.email,
      }));
    } else if (pending.email) {
      setRegisterForm((prev) => ({ ...prev, email: pending.email }));
    }
    if (pending.designation) {
      setDesignation(pending.designation);
    }
    setPendingUsername(String(pending.username || '').trim());
    setAccountCreatedPendingPassword(true);
    setError('');
  }, []);

  // Resume after refresh / remount when account was created but password not yet set.
  useEffect(() => {
    const pending = readPendingNexusPasswordSetup();
    if (!pending) return;
    applyPendingPasswordSetup(pending);
  }, [applyPendingPasswordSetup]);

  // Warn before leaving the tab once the Salesforce account exists without a password.
  useEffect(() => {
    if (!accountCreatedPendingPassword) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [accountCreatedPendingPassword]);

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
    onPhaseChange?.(0);
  }, [onPhaseChange]);

  const updateRegisterField = (field) => (event) => {
    setRegisterForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (field === 'email') {
      setEmailSfError('');
    }
  };

  const verifyEmailAvailableInSalesforce = async (email) => {
    setEmailSfChecking(true);
    setEmailSfError('');
    try {
      const result = await assertSalesforceEmailAvailable(email);
      if (!result.ok) {
        setEmailSfError(result.message);
      }
      return result;
    } finally {
      setEmailSfChecking(false);
    }
  };

  const handleEmailBlur = async () => {
    if (!shouldCheckSalesforceEmail || accountCreatedPendingPassword) return;
    const email = String(registerForm.email || '').trim();
    if (!email) return;
    await verifyEmailAvailableInSalesforce(email);
  };

  const persistPendingPasswordSetup = (username, formSnapshot, designationValue) => {
    writePendingNexusPasswordSetup({
      username: String(username || '').trim(),
      email: String(formSnapshot?.email || '').trim(),
      registerForm: formSnapshot,
      designation: designationValue,
      source: 'membership-create-step',
    });
    setPendingUsername(String(username || '').trim());
    setAccountCreatedPendingPassword(true);
  };

  const finishAfterPasswordSet = async (username) => {
    clearPendingNexusPasswordSetup();
    setAccountCreatedPendingPassword(false);
    setPendingUsername('');

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

    onPhaseChange?.(1);

    if (onPasswordSetComplete) {
      onPasswordSetComplete();
      return;
    }

    onAccountCreated?.();
  };

  const handleSubmit = async (event) => {
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
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const pending = readPendingNexusPasswordSetup();
    const alreadyCreated = accountCreatedPendingPassword || Boolean(pending?.username);
    let username = String(pendingUsername || pending?.username || '').trim();

    setSubmitting(true);
    setError('');
    setSubmitStage('');

    try {
      if (!alreadyCreated) {
        if (shouldCheckSalesforceEmail) {
          const emailCheck = await verifyEmailAvailableInSalesforce(email);
          if (!emailCheck.ok) {
            setError(emailCheck.message);
            setSubmitting(false);
            setSubmitStage('');
            return;
          }
        }

        setSubmitStage('Creating your eServices account…');
        let idType = String(flowState?.verifiedNricIdType || '').trim();
        let idNumber = String(flowState?.verifiedNricFin || '').trim();
        if (isNricVerifiedFlow) {
          const resolved = resolveNricIdentityForSalesforceApi(flowState);
          idType = String(nricIdType || resolved.idType).trim();
          idNumber = resolved.idNumber;
          if (!idType || !idNumber) {
            setError('Verified NRIC details are missing. Please go back and complete NRIC verification again.');
            setSubmitting(false);
            setSubmitStage('');
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
        username = resolveUsernameFromCreateResponse(createResult, email);
        persistPendingPasswordSetup(
          username,
          { salutation, firstName, lastName, nameAsPerId, email },
          designation
        );
      } else {
        username = String(username || email).trim();
        persistPendingPasswordSetup(
          username,
          { salutation, firstName, lastName, nameAsPerId, email },
          designation
        );
      }

      if (!username) {
        setError('Salesforce username is required.');
        setSubmitting(false);
        setSubmitStage('');
        return;
      }

      setSubmitStage('Setting your login password…');
      await setSalesforceNexusPassword({
        username: username.trim(),
        password,
      });

      await finishAfterPasswordSet(username);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete registration.';
      if (accountCreatedPendingPassword || readPendingNexusPasswordSetup()) {
        setAccountCreatedPendingPassword(true);
        setError(
          `${message} Your eServices account was created. Re-submit your password to finish — you will not create a new account.`
        );
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
      setSubmitStage('');
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
          background: alpha(theme.palette.info.main, 0.1),
          border: `1px solid ${alpha(theme.palette.info.main, 0.22)}`,
        }}
      >
        <Iconify icon="mdi:salesforce" width={28} sx={{ color: 'info.main' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant={fullPage ? 'h5' : 'subtitle1'}
          sx={{ fontWeight: 800, lineHeight: 1.3 }}
        >
          {fullPage ? (
            <>
              <Box component="span" sx={{ color: secondary.main }}>
                Step 1 —{' '}
              </Box>
              <Box component="span" sx={{ color: secondary.main }}>
                Create account
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
          {fullPage ? (
            <>
              Enter your details and choose a login password. Fields marked with{' '}
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
                {title || 'Create membership account'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.65 }}>
                {summary}
              </Typography>
            </Box>
            {onLoginWithSalesforce && !hideLoginButton && (
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
              Step 1 of 2
            </Box>
            {' — '}
            <Box component="span" sx={{ color: secondary.main }}>
              Create account
            </Box>
          </Typography>
        </Box>
      )}

      <Paper component="form" noValidate onSubmit={handleSubmit} variant="outlined" sx={paperSx}>
        {fullPage ? sectionIntro : (
          <>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Iconify icon="mdi:salesforce" width={22} sx={{ color: 'info.main' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  <Box component="span" sx={{ color: secondary.main }}>
                    Create account
                  </Box>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Register your ISCA Salesforce membership account and set a login password.
                </Typography>
              </Box>
            </Stack>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {accountCreatedPendingPassword && (
          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
            Your eServices account already exists from this registration attempt. Enter your
            password and submit to finish — a new account will not be created.
          </Alert>
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
              onBlur={handleEmailBlur}
              fullWidth
              size={fieldSize}
              required
              disabled={submitting || emailSfChecking || accountCreatedPendingPassword}
              error={Boolean(emailSfError)}
              InputLabelProps={INPUT_LABEL_ABOVE}
              helperText={
                accountCreatedPendingPassword
                  ? 'Email is locked because your eServices account was already created.'
                  : emailSfError
                    || (shouldCheckSalesforceEmail
                      ? emailSfChecking
                        ? 'Checking eServices for an existing account with this email...'
                        : 'We will check if an eServices account already exists for this email before creating a new account.'
                      : 'Used as your Salesforce username if not assigned separately.')
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

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 0.4 }}>
            Login password
          </Typography>
        </Divider>

        <Grid container spacing={2.5}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Password"
              type={showPassword.value ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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

        {submitStage && (
          <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mt: 2.5 }}>
            {submitStage}
          </Alert>
        )}

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
              minWidth: { sm: 220 },
              textTransform: 'none',
              fontWeight: 700,
              px: 4,
              boxShadow: `0 6px 20px ${alpha(primary.main, 0.35)}`,
            }}
          >
            {accountCreatedPendingPassword ? 'Complete registration' : 'Create account & continue'}
          </LoadingButton>
        </Stack>
      </Paper>

      {!fullPage && (
        <Typography variant="caption" color="text.secondary">
          After creating your account, you will sign in with Eservices to continue.
        </Typography>
      )}
    </Stack>
  );
}

const NATIONALITY_OPTIONS = ['Singapore', 'Malaysia', 'India', 'China', 'Indonesia', 'Philippines', 'Other'];

export function SalesforceNexusUserUpdateStep({
  title,
  summary,
  flowState = null,
  onUpdateComplete,
  onLoginWithSalesforce,
}) {
  const theme = useTheme();
  const fieldSize = 'medium';
  const primary = theme.palette.primary;
  const nricIdentity = useMemo(
    () => resolveNricIdentityForSalesforceApi(flowState),
    [flowState]
  );
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    nationality: 'Singapore',
    idType: SALESFORCE_ID_TYPE_BLUE,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const accountId = String(flowState?.salesforcePendingAccountId || '').trim();
  const email = String(flowState?.salesforcePendingAccountEmail || '').trim();
  const nricNumber = String(nricIdentity?.idNumber || flowState?.verifiedNricFin || '').trim();

  useEffect(() => {
    const pendingFirst = String(flowState?.salesforcePendingAccountFirstName || '').trim();
    const pendingLast = String(flowState?.salesforcePendingAccountLastName || '').trim();
    const verifiedFirst = String(flowState?.verifiedNricFirstName || '').trim();
    const verifiedLast = String(flowState?.verifiedNricLastName || '').trim();
    const rawNationality = String(flowState?.verifiedNricNationality || '').trim();
    const nationality = NATIONALITY_OPTIONS.includes(rawNationality) ? rawNationality : 'Singapore';
    const idType =
      String(nricIdentity?.idType || flowState?.verifiedNricIdType || SALESFORCE_ID_TYPE_BLUE).trim()
      || SALESFORCE_ID_TYPE_BLUE;
    setForm({
      firstName: verifiedFirst || pendingFirst,
      lastName: verifiedLast || pendingLast,
      nationality,
      idType,
    });
  }, [
    flowState?.salesforcePendingAccountFirstName,
    flowState?.salesforcePendingAccountLastName,
    flowState?.verifiedNricFirstName,
    flowState?.verifiedNricLastName,
    flowState?.verifiedNricNationality,
    flowState?.verifiedNricIdType,
    nricIdentity?.idType,
  ]);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!accountId) {
      setError('eServices account ID is missing. Please sign in with eServices and try again.');
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!nricNumber) {
      setError('Verified NRIC number is missing. Please complete NRIC verification again.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const nricCheck = await checkSalesforceUserByNric(nricNumber);
      if (nricCheck?.found) {
        const pendingEmail = email.trim().toLowerCase();
        const foundEmail = String(nricCheck.emailAddress || '').trim().toLowerCase();
        if (foundEmail && pendingEmail && foundEmail !== pendingEmail) {
          setError(
            'An eServices account already exists for this NRIC. Please sign in with eServices instead of updating a different account.'
          );
          return;
        }
      }

      await updateSalesforceNexusUser({
        accountId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        nationality: form.nationality.trim(),
        nricNumber,
        idType: form.idType.trim(),
      });
      if (onUpdateComplete) {
        setSigningIn(true);
        await onUpdateComplete();
        return;
      }
      setUpdated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update eServices account.');
    } finally {
      setSubmitting(false);
    }
  };

  if (signingIn) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
        <CircularProgress size={28} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Account updated. Signing you in...
        </Typography>
      </Stack>
    );
  }

  if (updated) {
    return (
      <Stack spacing={2}>
        <Alert severity="success" icon={<Iconify icon="solar:verified-check-bold" width={22} />}>
          Your eServices account has been updated with your NRIC and citizenship details.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          Sign in with eServices to continue to the platform.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={onLoginWithSalesforce}>
            Login with Eservices
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} component="form" onSubmit={handleSubmit}>
      {title ? (
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      ) : null}
      {summary ? (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>
          {summary}
        </Typography>
      ) : null}
      <Alert severity="info">
        NRIC verified. Review your details below and update your existing eServices account record.
      </Alert>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              label="Email address"
              value={email}
              fullWidth
              size={fieldSize}
              disabled
              InputLabelProps={INPUT_LABEL_ABOVE}
              helperText="From your eServices account"
            />
          </Grid>
          {accountId ? (
            <Grid item xs={12} sm={6}>
              <TextField
                label="eServices account ID"
                value={`…${accountId.slice(-8)}`}
                fullWidth
                size={fieldSize}
                disabled
                InputLabelProps={INPUT_LABEL_ABOVE}
              />
            </Grid>
          ) : null}
          <Grid item xs={12} sm={6}>
            <TextField
              label="NRIC / FIN number"
              value={nricNumber}
              fullWidth
              size={fieldSize}
              disabled
              InputLabelProps={INPUT_LABEL_ABOVE}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First name"
              value={form.firstName}
              onChange={updateField('firstName')}
              fullWidth
              size={fieldSize}
              required
              disabled={submitting}
              InputLabelProps={INPUT_LABEL_ABOVE}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Last name"
              value={form.lastName}
              onChange={updateField('lastName')}
              fullWidth
              size={fieldSize}
              required
              disabled={submitting}
              InputLabelProps={INPUT_LABEL_ABOVE}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="Nationality"
              value={form.nationality}
              onChange={updateField('nationality')}
              fullWidth
              size={fieldSize}
              required
              disabled={submitting}
              InputLabelProps={INPUT_LABEL_ABOVE}
              SelectProps={MEMBERSHIP_SELECT_MENU_PROPS}
            >
              {NATIONALITY_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="ID type"
              value={form.idType}
              onChange={updateField('idType')}
              fullWidth
              size={fieldSize}
              required
              disabled={submitting}
              InputLabelProps={INPUT_LABEL_ABOVE}
              SelectProps={MEMBERSHIP_SELECT_MENU_PROPS}
            >
              <MenuItem value={SALESFORCE_ID_TYPE_BLUE}>{SALESFORCE_ID_TYPE_BLUE}</MenuItem>
              <MenuItem value={SALESFORCE_ID_TYPE_PINK}>{SALESFORCE_ID_TYPE_PINK}</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <LoadingButton
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          loading={submitting}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            boxShadow: `0 6px 20px ${alpha(primary.main, 0.35)}`,
          }}
        >
          Update eServices account
        </LoadingButton>
      </Stack>
    </Stack>
  );
}
