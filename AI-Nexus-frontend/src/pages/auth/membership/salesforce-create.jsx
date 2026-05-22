import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { Iconify } from 'src/components/iconify';
import { MembershipFormBrand } from 'src/components/membership-form-brand';
import { SalesforceMembershipCreateStep } from 'src/sections/learning/components/salesforce-membership-create-step';
import {
  buildMembershipApplicationOAuthStartUrl,
  MEMBERSHIP_APPLICATION_OUTCOME,
  setMembershipApplicationPending,
  saveMembershipApplicationCourseReturn,
} from 'src/utils/membership-salesforce-session';

// ----------------------------------------------------------------------

const STEPS = ['Account details', 'Set password', 'Sign in'];

export default function MembershipSalesforceCreatePage() {
  const theme = useTheme();
  const { primary, secondary } = theme.palette;
  const [searchParams] = useSearchParams();
  const [activeStep, setActiveStep] = useState(0);
  const defaultEmail = searchParams.get('email') || '';

  useEffect(() => {
    setMembershipApplicationPending();
    const returnTo = searchParams.get('returnTo');
    if (returnTo) {
      try {
        const decoded = decodeURIComponent(returnTo);
        if (!decoded.includes('/salesforce-bridge')) {
          saveMembershipApplicationCourseReturn(decoded);
        }
      } catch {
        // ignore
      }
    }
  }, [searchParams]);

  const oauthStartUrl = useMemo(
    () =>
      buildMembershipApplicationOAuthStartUrl(
        paths.auth.oauth.start,
        paths.auth.membership.salesforceBridge
      ),
    []
  );

  const handlePasswordSetComplete = () => {
    window.location.href = oauthStartUrl;
  };

  const handleLoginWithSalesforce = () => {
    window.location.href = oauthStartUrl;
  };

  const handleBack = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      window.history.back();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: alpha(primary.main, 0.02),
        backgroundImage: `linear-gradient(180deg, ${alpha(primary.main, 0.06)} 0%, ${alpha(
          secondary.main,
          0.03
        )} 28%, ${theme.palette.background.default} 55%)`,
      }}
    >
      <Box
        component="header"
        sx={{
          position: 'relative',
          px: { xs: 2, md: 4 },
          py: { xs: 2.5, md: 3 },
          borderBottom: `1px solid ${alpha(primary.main, 0.12)}`,
          bgcolor: 'background.paper',
          boxShadow: `0 8px 32px ${alpha(primary.main, 0.08)}`,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${primary.main} 0%, ${secondary.main} 100%)`,
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'stretch', md: 'flex-start' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ pt: 0.5 }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            spacing={{ xs: 2, sm: 2.5 }}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <MembershipFormBrand sx={{ alignSelf: { xs: 'center', sm: 'flex-start' } }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack
              direction="row"
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ columnGap: 1.25, rowGap: 0.75 }}
            >
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.25,
                  fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' },
                  m: 0,
                }}
              >
                <Box component="span" sx={{ color: primary.main }}>
                  Create Salesforce{' '}
                </Box>
                <Box component="span" sx={{ color: secondary.main }}>
                  Membership account
                </Box>
              </Typography>
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1.5,
                  py: 0.4,
                  borderRadius: 10,
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Iconify icon="mdi:salesforce" width={18} sx={{ color: 'info.main' }} />
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ fontWeight: 700, color: 'info.dark' }}
                >
                  ISCA Eservices
                </Typography>
              </Box>
            </Stack>
            <Typography
              variant="body2"
              sx={{ mt: 1, lineHeight: 1.65, maxWidth: 720, color: 'text.primary' }}
            >
              Register your membership account, set your password, then sign in with Eservices to
              open the application form.
            </Typography>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ xs: 'stretch', md: 'center' }}
            spacing={1}
            sx={{ flexShrink: 0, width: { xs: 1, md: 'auto' } }}
          >
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleBack}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                borderWidth: 1.5,
              }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleLoginWithSalesforce}
              startIcon={<Iconify icon="solar:login-3-bold" width={18} />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                px: 2.5,
                boxShadow: `0 4px 14px ${alpha(primary.main, 0.35)}`,
                '&:hover': {
                  boxShadow: `0 6px 20px ${alpha(primary.main, 0.45)}`,
                },
              }}
            >
              Login with Eservices
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            display: { xs: 'none', md: 'block' },
            bgcolor: alpha(primary.main, 0.04),
            border: `1px solid ${alpha(primary.main, 0.1)}`,
          }}
        >
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            sx={{
              '& .MuiStepLabel-label': {
                fontWeight: 600,
                fontSize: '0.8rem',
              },
              '& .MuiStepLabel-label.Mui-active': {
                color: primary.main,
                fontWeight: 700,
              },
              '& .MuiStepLabel-label.Mui-completed': {
                color: secondary.main,
              },
              '& .MuiStepIcon-root': {
                color: alpha(secondary.main, 0.35),
              },
              '& .MuiStepIcon-root.Mui-active': {
                color: primary.main,
              },
              '& .MuiStepIcon-root.Mui-completed': {
                color: secondary.main,
              },
              '& .MuiStepConnector-line': {
                borderColor: alpha(primary.main, 0.2),
              },
            }}
          >
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          width: 1,
          px: { xs: 2, md: 4 },
          py: { xs: 3, md: 4 },
        }}
      >
        <Box sx={{ width: 1 }}>
          <SalesforceMembershipCreateStep
            fullPage
            hideLoginButton
            defaultEmail={defaultEmail}
            membershipOutcome={MEMBERSHIP_APPLICATION_OUTCOME}
            onPhaseChange={setActiveStep}
            onPasswordSetComplete={handlePasswordSetComplete}
            onLoginWithSalesforce={handleLoginWithSalesforce}
          />
        </Box>
      </Box>
    </Box>
  );
}
