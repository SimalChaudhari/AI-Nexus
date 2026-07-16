import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { AnimateLogo2 } from 'src/components/animate';
import { Form, Field } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';
import { CorporateSignUpSchema } from 'src/validations/user.validation';

import {
  checkCorporateSalesforceAccount,
  createCorporateSalesforceAccount,
  setSalesforceNexusPassword,
} from 'src/auth/context/jwt';
import { POST_OAUTH_RETURN_TO_KEY } from 'src/utils/membership-eligibility-sso';

// ----------------------------------------------------------------------

const ORG_TYPE_OPTIONS = [
  'Private Limited',
  'Public Limited',
  'Partnership',
  'Sole Proprietorship',
  'Limited Liability Partnership',
  'Other',
];

const COMMUNICATION_PREFERENCE_FIELDS = [
  { name: 'iscaConferencesEvents', label: 'ISCA conferences & events' },
  { name: 'practitionersBulletin', label: 'Practitioners Bulletin' },
  { name: 'iscaAccountifyBulletin', label: 'ISCA Accountify Bulletin' },
  { name: 'financialForensicFocus', label: 'Financial Forensic Focus' },
  { name: 'businessFinanceBulletin', label: 'Business Finance Bulletin' },
  { name: 'monthlyCALab', label: 'Monthly CA Lab' },
  { name: 'specialISCAOfferings', label: 'Special ISCA offerings' },
  { name: 'participateInResearch', label: 'Participate in research' },
  { name: 'boardflixBulletin', label: 'Boardflix Bulletin' },
  { name: 'monthlyISCharteredAccountantJournal', label: 'IS Chartered Accountant Journal' },
  { name: 'scaqNewsletterUpdates', label: 'SCAQ newsletter updates' },
  { name: 'studentMemberNewsletterUpdates', label: 'Student member newsletter' },
  { name: 'theISCABuzzCorporateMembersNewsletter', label: 'ISCA Buzz (Corporate)' },
];

function SectionTitle({ children }) {
  return (
    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 700, pt: 0.5 }}>
      {children}
    </Typography>
  );
}

export function CorporateSignUpView() {
  const searchParams = useSearchParams();
  const password = useBoolean();
  const returnTo = searchParams.get('returnTo') || paths.corporate.overview;
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const signInHref = `${paths.auth.simple.signIn}?returnTo=${encodeURIComponent(paths.corporate.overview)}`;

  const methods = useForm({
    resolver: zodResolver(CorporateSignUpSchema),
    defaultValues: {
      companyName: '',
      uenNumber: '',
      organisationType: 'Private Limited',
      businessCountry: 'Singapore',
      businessCity: 'Singapore',
      businessState: 'SG',
      businessPostalCode: '',
      businessStreetName: '',
      businessUnitNumber: '',
      businessBuildingName: '',
      isSme: true,
      isPaidCorporate: false,
      isProvidesProfessionalServices: false,
      firstName: '',
      lastName: '',
      email: '',
      mobilePhone: '',
      phone: '',
      designation: '',
      website: '',
      iscaConferencesEvents: true,
      practitionersBulletin: true,
      iscaAccountifyBulletin: false,
      financialForensicFocus: false,
      businessFinanceBulletin: true,
      monthlyCALab: true,
      specialISCAOfferings: false,
      participateInResearch: true,
      boardflixBulletin: false,
      monthlyISCharteredAccountantJournal: true,
      scaqNewsletterUpdates: false,
      studentMemberNewsletterUpdates: false,
      theISCABuzzCorporateMembersNewsletter: true,
      password: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const startCorporateSso = (email) => {
    try {
      sessionStorage.setItem(POST_OAUTH_RETURN_TO_KEY, returnTo || paths.corporate.overview);
    } catch {
      // ignore
    }
    const params = new URLSearchParams({
      returnTo: returnTo || paths.corporate.overview,
      ...(email ? { login_hint: email } : {}),
    });
    window.location.href = `${paths.auth.oauth.start}?${params.toString()}`;
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMsg('');
      setInfoMsg('');

      const email = String(data.email || '').trim().toLowerCase();
      const uenNumber = String(data.uenNumber || '').trim();

      let alreadyExists = false;
      try {
        const check = await checkCorporateSalesforceAccount({ email, uenNumber });
        const nested = check?.data || check;
        alreadyExists = Boolean(
          nested?.corporateAccountExists && nested?.contactExists
        );
      } catch {
        // Check is best-effort; continue to create when the check fails.
      }

      if (alreadyExists) {
        setInfoMsg('Corporate account already found. Continue with Salesforce sign-in…');
        startCorporateSso(email);
        return;
      }

      await createCorporateSalesforceAccount({
        account: {
          name: data.companyName.trim(),
          uenNumber,
          businessCountry: data.businessCountry.trim(),
          businessPostalCode: String(data.businessPostalCode || '').trim(),
          businessUnitNumber: String(data.businessUnitNumber || '').trim(),
          businessBuildingName: String(data.businessBuildingName || '').trim(),
          businessStreetName: String(data.businessStreetName || '').trim(),
          businessCity: data.businessCity.trim(),
          businessState: String(data.businessState || 'SG').trim(),
          organisationType: data.organisationType,
          isPaidCorporate: Boolean(data.isPaidCorporate),
          isSme: data.isSme !== false,
          isProvidesProfessionalServices: Boolean(data.isProvidesProfessionalServices),
        },
        contact: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email,
          mobilePhone: String(data.mobilePhone || '').trim(),
          phone: String(data.phone || '').trim(),
          designation: String(data.designation || '').trim(),
          website: String(data.website || '').trim(),
          iscaConferencesEvents: data.iscaConferencesEvents ? 'Yes' : 'No',
          practitionersBulletin: Boolean(data.practitionersBulletin),
          iscaAccountifyBulletin: Boolean(data.iscaAccountifyBulletin),
          financialForensicFocus: Boolean(data.financialForensicFocus),
          businessFinanceBulletin: Boolean(data.businessFinanceBulletin),
          monthlyCALab: Boolean(data.monthlyCALab),
          specialISCAOfferings: Boolean(data.specialISCAOfferings),
          participateInResearch: Boolean(data.participateInResearch),
          boardflixBulletin: Boolean(data.boardflixBulletin),
          monthlyISCharteredAccountantJournal: Boolean(data.monthlyISCharteredAccountantJournal),
          scaqNewsletterUpdates: Boolean(data.scaqNewsletterUpdates),
          studentMemberNewsletterUpdates: Boolean(data.studentMemberNewsletterUpdates),
          theISCABuzzCorporateMembersNewsletter: Boolean(
            data.theISCABuzzCorporateMembersNewsletter
          ),
        },
      });

      await setSalesforceNexusPassword({
        username: email,
        password: data.password,
      });

      setInfoMsg('Account created. Redirecting to Salesforce sign-in…');
      startCorporateSso(email);
    } catch (error) {
      setErrorMsg(error?.message || 'Corporate registration failed.');
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
        CORPORATE HR ACCOUNT
      </Box>

      <Typography variant="h5" sx={{ textAlign: 'center' }}>
        Register your company for the HR portal
      </Typography>

      <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        Create your Salesforce corporate account, set a password, then sign in with SSO to access the
        Corporate HR dashboard.
      </Typography>

      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Already registered?
        </Typography>

        <Link component={RouterLink} href={signInHref} variant="subtitle2">
          Sign in
        </Link>
      </Stack>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={2} sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Stack spacing={1.5}>
            <SectionTitle>Company details</SectionTitle>

            <Field.Text
              name="companyName"
              label="Company name"
              required
              placeholder="e.g. Tech Innovations Pte Ltd"
              InputLabelProps={{ shrink: true }}
            />

            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6}>
                <Field.Text
                  name="uenNumber"
                  label="UEN number"
                  required
                  placeholder="e.g. 202312345A"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field.Select name="organisationType" label="Organisation type" required>
                  {ORG_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Field.Select>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field.Text
                  name="businessCountry"
                  label="Country"
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field.Text
                  name="businessCity"
                  label="City"
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field.Text name="businessState" label="State" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field.Text
                  name="businessPostalCode"
                  label="Postal code"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Field.Text
                  name="businessStreetName"
                  label="Street name"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field.Text
                  name="businessUnitNumber"
                  label="Unit number"
                  placeholder="#12-01"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Field.Text
                  name="businessBuildingName"
                  label="Building name"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <Field.Switch name="isSme" label="Company is an SME" />
            <Field.Switch
              name="isProvidesProfessionalServices"
              label="Provides professional services"
            />
          </Stack>
        </Grid>

        <Grid item xs={12} md={6}>
          <Stack spacing={1.5}>
            <SectionTitle>HR contact</SectionTitle>

            <Field.Text
              name="firstName"
              label="First name"
              required
              InputLabelProps={{ shrink: true }}
            />
            <Field.Text
              name="lastName"
              label="Last name"
              required
              InputLabelProps={{ shrink: true }}
            />
            <Field.Text
              name="email"
              label="Work email"
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
            <Field.Text name="mobilePhone" label="Mobile phone" InputLabelProps={{ shrink: true }} />
            <Field.Text name="phone" label="Office phone" InputLabelProps={{ shrink: true }} />
            <Field.Text name="designation" label="Designation" InputLabelProps={{ shrink: true }} />
            <Field.Text name="website" label="Website" InputLabelProps={{ shrink: true }} />
          </Stack>
        </Grid>
      </Grid>

      <SectionTitle>Communication preferences</SectionTitle>
      <Typography variant="caption" sx={{ color: 'text.secondary', mt: -1 }}>
        Choose which ISCA updates this corporate contact should receive.
      </Typography>
      <Grid container spacing={0.5}>
        {COMMUNICATION_PREFERENCE_FIELDS.map((field) => (
          <Grid item xs={12} sm={6} key={field.name}>
            <Field.Switch name={field.name} label={field.label} />
          </Grid>
        ))}
      </Grid>

      <SectionTitle>Salesforce password</SectionTitle>

      <Field.Text
        name="password"
        label="Password"
        required
        placeholder="8+ characters"
        type={password.value ? 'text' : 'password'}
        helperText="Used for Salesforce / eServices sign-in after account creation."
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          width: '100%',
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'block' } }} />
        <LoadingButton
          fullWidth
          color="inherit"
          size="large"
          type="submit"
          variant="contained"
          loading={isSubmitting}
          loadingIndicator="Creating account..."
          sx={{ height: 44, fontWeight: 700 }}
        >
          Create account
        </LoadingButton>
      </Box>
    </Stack>
  );

  return (
    <>
      {renderLogo}
      {renderHead}

      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}
      {!!infoMsg && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {infoMsg}
        </Alert>
      )}

      <Box
        sx={(theme) => ({
          p: 2.25,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.grey[500], 0.16)}`,
          background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.neutral, 0.8)} 100%)`,
          boxShadow: `0 20px 40px ${alpha(theme.palette.grey[500], 0.12)}`,
        })}
      >
        <Form methods={methods} onSubmit={onSubmit}>
          {renderForm}
        </Form>
      </Box>
    </>
  );
}
