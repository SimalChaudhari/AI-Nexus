import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';
import { MembershipFormBrand } from 'src/components/membership-form-brand';
import { MembershipApplicationForm } from 'src/sections/learning/components/membership-application-form';
import {
  readMembershipSalesforceSession,
  readMembershipApplicationCourseReturn,
  clearMembershipApplicationPending,
  clearMembershipApplicationCourseReturn,
  applyDeferredPlatformLoginAfterApplication,
} from 'src/utils/membership-salesforce-session';
import {
  redirectToMembershipApplicationSsoLogin,
  readMembershipApplicationSsoRedirectNotice,
} from 'src/utils/membership-salesforce-auth';
import { useAuthContext } from 'src/auth/hooks';
import {
  isSalesforceCaMemberClass,
  redirectCaMemberToPlatform,
  tryCompleteCaMemberPlatformLogin,
} from 'src/utils/membership-application-ca';
import {
  isApprovedSalesforceMember,
  tryCompleteApprovedMemberPlatformLogin,
} from 'src/utils/membership-application-approved-member';
import { readSalesforceFlagsFromCallbackParams } from 'src/utils/membership-eligibility-sso';
import {
  readMembershipApplicationPathway,
  getMembershipApplicationPageSubtitle,
  persistMembershipApplicationPathway,
  normalizeMembershipApplicationPathway,
  clearMembershipApplicationDraft,
} from 'src/utils/membership-application-pathway';
import { clearMembershipApplicationDraftBackup } from 'src/utils/membership-application-draft-backup';

// ----------------------------------------------------------------------

export default function MembershipApplicationPage() {
  const theme = useTheme();
  const { primary, secondary } = theme.palette;
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const pathway = normalizeMembershipApplicationPathway(
    searchParams.get('pathway') || readMembershipApplicationPathway()
  );
  /** 'checking' = CA gate in progress; 'form' = show application; never flash form for CA members. */
  const [gatePhase, setGatePhase] = useState('checking');
  const [ssoNotice, setSsoNotice] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const { authenticated, user } = useAuthContext();

  useEffect(() => {
    persistMembershipApplicationPathway(pathway);
  }, [pathway]);

  useEffect(() => {
    const notice = readMembershipApplicationSsoRedirectNotice();
    if (notice) {
      setSsoNotice(notice);
    }

    const billingStatusMessage = searchParams.get('statusMessage');
    if (billingStatusMessage) {
      try {
        setStatusNotice(decodeURIComponent(billingStatusMessage));
      } catch {
        setStatusNotice(billingStatusMessage);
      }
    }

    const session = readMembershipSalesforceSession();
    const callbackSf = readSalesforceFlagsFromCallbackParams(searchParams);
    const sessionMemberClass = session?.memberClass || callbackSf.memberClass;
    const userMemberClass = user?.salesforce?.memberClass;
    const sessionMembershipStatus =
      callbackSf.membershipStatus || user?.salesforce?.membershipStatus;

    if (
      authenticated
      && (isSalesforceCaMemberClass(userMemberClass) || isSalesforceCaMemberClass(sessionMemberClass))
    ) {
      redirectCaMemberToPlatform(readMembershipApplicationCourseReturn() || paths.learning);
      return undefined;
    }

    if (
      authenticated
      && isApprovedSalesforceMember({
        memberClass: userMemberClass || sessionMemberClass,
        membershipStatus: sessionMembershipStatus,
      })
    ) {
      redirectCaMemberToPlatform(readMembershipApplicationCourseReturn() || paths.learning);
      return undefined;
    }

    if (!session?.accountId) {
      redirectToMembershipApplicationSsoLogin({ reason: 'missing_session' });
      return undefined;
    }

    if (!session?.socialToken?.trim()) {
      redirectToMembershipApplicationSsoLogin({ reason: 'session_expired' });
      return undefined;
    }

    let cancelled = false;
    setGatePhase('checking');

    const run = async () => {
      try {
        const caLogin = await tryCompleteCaMemberPlatformLogin({
          socialAccessToken: session.socialToken,
        });
        if (cancelled) return;
        if (caLogin.loggedIn && caLogin.redirectTo) {
          redirectCaMemberToPlatform(caLogin.redirectTo);
          return;
        }

        const memberLogin = await tryCompleteApprovedMemberPlatformLogin({
          socialAccessToken: session.socialToken,
        });
        if (cancelled) return;
        if (memberLogin.loggedIn && memberLogin.redirectTo) {
          redirectCaMemberToPlatform(memberLogin.redirectTo);
          return;
        }

        if (
          isSalesforceCaMemberClass(caLogin.memberClass)
          || isSalesforceCaMemberClass(sessionMemberClass)
        ) {
          setStatusNotice(
            caLogin.message
            || 'Your CA membership was confirmed in eServices, but sign-in could not be completed. Please sign in with eServices again.'
          );
          setGatePhase('checking');
          return;
        }

        if (
          isApprovedSalesforceMember({
            memberClass: memberLogin.memberClass || sessionMemberClass,
            membershipStatus: memberLogin.membershipStatus || sessionMembershipStatus,
          })
        ) {
          setStatusNotice(
            memberLogin.message
            || 'Your ISCA membership was confirmed in eServices, but sign-in could not be completed. Please sign in with eServices again.'
          );
          setGatePhase('checking');
          return;
        }

        setGatePhase('form');
      } catch (err) {
        if (cancelled) return;
        if (err?.code === 'SALESFORCE_SOCIAL_TOKEN_EXPIRED') {
          return;
        }
        if (isSalesforceCaMemberClass(sessionMemberClass)) {
          setStatusNotice(
            'Your CA membership was detected, but we could not verify it with eServices. Please sign in again.'
          );
          setGatePhase('checking');
          return;
        }
        setGatePhase('form');
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [authenticated, router, searchParams, user?.salesforce?.memberClass, user?.salesforce?.membershipStatus]);

  const handleAllTabsSubmitted = async () => {
    clearMembershipApplicationDraft(pathway);
    clearMembershipApplicationDraftBackup(pathway);
    await applyDeferredPlatformLoginAfterApplication();
    clearMembershipApplicationPending();
    const courseReturn = readMembershipApplicationCourseReturn();
    clearMembershipApplicationCourseReturn();

    if (courseReturn) {
      window.location.href = courseReturn;
      return;
    }
    router.replace(paths.home);
  };

  const handleBack = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      router.back();
    }
  };

  if (gatePhase !== 'form') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(primary.main, 0.02),
          backgroundImage: `linear-gradient(180deg, ${alpha(primary.main, 0.06)} 0%, ${alpha(
            secondary.main,
            0.03
          )} 28%, ${theme.palette.background.default} 55%)`,
        }}
      >
        <Stack alignItems="center" spacing={2} sx={{ px: 2, maxWidth: 420 }}>
          <LinearProgress sx={{ width: 240, borderRadius: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Checking your ISCA membership status…
          </Typography>
          {statusNotice && (
            <Alert severity="warning" sx={{ width: 1 }}>
              {statusNotice}
            </Alert>
          )}
        </Stack>
      </Box>
    );
  }

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
                  ISCA membership{' '}
                </Box>
                <Box component="span" sx={{ color: secondary.main }}>
                  application
                </Box>
              </Typography>
              {readMembershipSalesforceSession()?.accountId && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.4,
                    borderRadius: 10,
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.24)}`,
                  }}
                >
                  <Iconify icon="solar:verified-check-bold" width={18} sx={{ color: 'success.main' }} />
                  <Typography component="span" variant="caption" sx={{ fontWeight: 700, color: 'success.dark' }}>
                    Salesforce linked · …{readMembershipSalesforceSession().accountId.slice(-6)}
                  </Typography>
                </Box>
              )}
            </Stack>
            <Typography
              variant="body2"
              sx={{ mt: 1, lineHeight: 1.65, maxWidth: 720, color: 'text.primary' }}
            >
              {getMembershipApplicationPageSubtitle(pathway)}
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
          </Stack>
        </Stack>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          width: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {ssoNotice && (
          <Alert severity="info" sx={{ mx: { xs: 2, md: 4 }, mt: 2 }} onClose={() => setSsoNotice('')}>
            {ssoNotice}
          </Alert>
        )}
        {statusNotice && (
          <Alert
            severity={searchParams.get('billingComplete') === '1' ? 'success' : 'info'}
            sx={{ mx: { xs: 2, md: 4 }, mt: 2 }}
            onClose={() => setStatusNotice('')}
          >
            {statusNotice}
          </Alert>
        )}
        <MembershipApplicationForm onAllTabsSubmitted={handleAllTabsSubmitted} fullPage pathway={pathway} />
      </Box>
    </Box>
  );
}
