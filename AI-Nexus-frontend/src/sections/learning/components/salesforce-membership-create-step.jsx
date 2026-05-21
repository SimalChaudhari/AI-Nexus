import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
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
import { alpha } from '@mui/material/styles';

import { useBoolean } from 'src/hooks/use-boolean';
import { Iconify } from 'src/components/iconify';
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
]);

const SALUTATION_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Mdm.'];

const EMPTY_REGISTER_FORM = {
  salutation: 'Mr.',
  firstName: '',
  lastName: '',
  nameAsPerId: '',
  email: '',
};

function buildEligibilityPayloadFromFlow(flow, membershipOutcome, salesforceUsername) {
  if (!flow || typeof flow !== 'object') {
    return {
      eligibilityType: 'student',
      snapshot: { membershipOutcome, salesforceUsername },
    };
  }
  return {
    isSingaporePr: typeof flow.isSingaporePr === 'boolean' ? flow.isSingaporePr : undefined,
    isIscaMember: typeof flow.isIscaMember === 'boolean' ? flow.isIscaMember : undefined,
    wantsIscaMembership:
      typeof flow.wantsIscaMembership === 'boolean' ? flow.wantsIscaMembership : undefined,
    eligibilityType: flow.eligibilityType || 'student',
    snapshot: {
      ...flow,
      membershipOutcome: membershipOutcome || '',
      salesforceUsername,
      salesforceMembershipCompletedAt: new Date().toISOString(),
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

/** Outcomes that require the dedicated Salesforce membership registration form. */
export function isSalesforceMembershipCreateOutcomeKey(outcome) {
  return SALESFORCE_CREATE_ACCOUNT_OUTCOMES.has(outcome);
}

/**
 * Whether the flow should show the dedicated Salesforce create-account step
 * (separate from the generic membership result / signup forms).
 */
export function shouldUseSalesforceMembershipCreateStep(state) {
  if (!state || state.salesforceMembershipAccountCreated) return false;
  if (state.isIscaMember === true) return false;
  if (state.isSingaporePr === true && state.spPrVerified === true) return false;

  if (state.eligibilityType === 'recognition') {
    return state.salesforceAccountChoice === 'create';
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
  onAccountCreated,
  onLoginWithSalesforce,
}) {
  const [phase, setPhase] = useState('register');
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [passwordForm, setPasswordForm] = useState({ username: '', password: '', confirmPassword: '' });
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
    setSubmitting(true);
    setError('');
    try {
      const createResult = await createSalesforceNexusUser({
        salutation,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        name_as_per_id: nameAsPerId.trim(),
        email: email.trim(),
      });
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
        username.trim()
      );
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

      onAccountCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set Salesforce password.');
    } finally {
      setSubmitting(false);
    }
  };

  const paperSx = (theme) => ({
    p: 2.5,
    borderRadius: 2,
    borderColor: alpha(theme.palette.primary.main, 0.28),
    bgcolor: alpha(theme.palette.primary.main, 0.04),
  });

  return (
    <Stack spacing={2}>
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
          {phase === 'register' && onLoginWithSalesforce && (
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

      {phase === 'register' && (
        <Paper component="form" noValidate onSubmit={handleRegisterSubmit} variant="outlined" sx={paperSx}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Iconify icon="mdi:salesforce" width={22} sx={{ color: 'info.main' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Step 1 — Account details
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Register your ISCA Salesforce membership account.
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1.75}>
            <TextField
              select
              label="Salutation"
              value={registerForm.salutation}
              onChange={updateRegisterField('salutation')}
              fullWidth
              size="small"
              disabled={submitting}
            >
              {SALUTATION_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.75}>
              <TextField
                label="First Name"
                value={registerForm.firstName}
                onChange={updateRegisterField('firstName')}
                fullWidth
                size="small"
                required
                disabled={submitting}
              />
              <TextField
                label="Last Name"
                value={registerForm.lastName}
                onChange={updateRegisterField('lastName')}
                fullWidth
                size="small"
                required
                disabled={submitting}
              />
            </Stack>

            <TextField
              label="Name As Per ID"
              placeholder="Example: Tan Zhi Wen"
              value={registerForm.nameAsPerId}
              onChange={updateRegisterField('nameAsPerId')}
              fullWidth
              size="small"
              required
              disabled={submitting}
            />

            <TextField
              label="Email Address"
              type="email"
              value={registerForm.email}
              onChange={updateRegisterField('email')}
              fullWidth
              size="small"
              required
              disabled={submitting}
              helperText="Used as your Salesforce username if not assigned separately."
            />

            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <LoadingButton
              type="submit"
              variant="contained"
              size="large"
              loading={submitting}
              sx={{ alignSelf: { sm: 'flex-end' }, minWidth: { sm: 220 }, textTransform: 'none', fontWeight: 700 }}
            >
              Create Salesforce account
            </LoadingButton>
          </Stack>
        </Paper>
      )}

      {phase === 'set-password' && (
        <Paper component="form" noValidate onSubmit={handleSetPasswordSubmit} variant="outlined" sx={paperSx}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Iconify icon="solar:lock-password-bold" width={22} sx={{ color: 'primary.main' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Step 2 — Login password
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Set the password you will use when signing in with Salesforce.
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1.75}>
            <Alert severity="success" sx={{ py: 0.5 }}>
              Membership account created. Set your password below.
            </Alert>

            <TextField
              label="Salesforce Username"
              value={passwordForm.username}
              onChange={updatePasswordField('username')}
              fullWidth
              size="small"
              required
              disabled={submitting}
              helperText="Usually your email address."
            />

            <TextField
              label="Password"
              type={showPassword.value ? 'text' : 'password'}
              value={passwordForm.password}
              onChange={updatePasswordField('password')}
              fullWidth
              size="small"
              required
              disabled={submitting}
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

            <TextField
              label="Confirm Password"
              type={showConfirmPassword.value ? 'text' : 'password'}
              value={passwordForm.confirmPassword}
              onChange={updatePasswordField('confirmPassword')}
              fullWidth
              size="small"
              required
              disabled={submitting}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={showConfirmPassword.onToggle} edge="end" aria-label="toggle confirm password">
                      <Iconify icon={showConfirmPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Alert severity="error" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <LoadingButton
                variant="outlined"
                color="inherit"
                disabled={submitting}
                onClick={() => {
                  setError('');
                  setPhase('register');
                }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Back
              </LoadingButton>
              <LoadingButton
                type="submit"
                variant="contained"
                size="large"
                loading={submitting}
                sx={{ minWidth: { sm: 220 }, textTransform: 'none', fontWeight: 700 }}
              >
                Set password and continue
              </LoadingButton>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Typography variant="caption" color="text.secondary">
        {phase === 'set-password'
          ? 'After setting your password, use Login with Eservices on the next screen.'
          : 'Next you will set your Salesforce login password, then sign in to the platform.'}
      </Typography>
    </Stack>
  );
}
