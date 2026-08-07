import { useState, useEffect } from 'react';
import { useRouter } from 'src/routes/hooks';
import { useAuthContext } from 'src/auth/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { DashboardContent } from 'src/layouts/dashboard';
import { MainContent } from 'src/layouts/main';

import { fDate } from 'src/utils/format-time';
import { ProfileSectionCard } from 'src/components/profile-section-card';
import { UserSalesforceProfileCard } from 'src/components/user-salesforce-profile-fields';
import { syncApiUserToSession } from 'src/auth/utils/normalize-user-session';
import { useGetUserProfile, useGetAdminProfile } from 'src/actions/user';
import { UserNewEditForm } from '../user/user-new-edit-form';
import { getJobRoleAuditStatus } from '../user/view/user-fee-waiver-audit-panel';
import {
  FeeWaiverHrUserStatusPanel,
  canShowFeeWaiverHrStatus,
} from '../user/view/fee-waiver-hr-user-status';

// ----------------------------------------------------------------------

export function CommonProfileView() {
  const theme = useTheme();
  const router = useRouter();
  const { user: currentAuthUser, checkUserSession } = useAuthContext();

  const [isEditMode, setIsEditMode] = useState(false);

  const normalizedRole = String(currentAuthUser?.role || 'User').toLowerCase();
  const userRole = normalizedRole === 'admin' ? 'Admin' : 'User';
  const isAdmin = normalizedRole === 'admin';

  const ContentWrapper = isAdmin ? DashboardContent : MainContent;
  const contentShellProps = { maxWidth: false, sx: { width: 1, maxWidth: 'none' } };

  const userProfileHook = useGetUserProfile(!isAdmin);
  const adminProfileHook = useGetAdminProfile(isAdmin);

  const { user: fetchedUser, userLoading, userError, refresh: refreshUser } = isAdmin
    ? adminProfileHook
    : userProfileHook;

  useEffect(() => {
    if (!fetchedUser?.id) return;
    syncApiUserToSession(fetchedUser);
    checkUserSession?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when API user id changes only
  }, [fetchedUser?.id]);

  if (userError && (userError?.message?.includes('403') || userError?.message?.includes('Forbidden') || userError?.response?.status === 403)) {
    return (
      <ContentWrapper {...contentShellProps}>
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Access denied
          </Typography>
          <Card sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              You do not have permission to access this page.
            </Typography>
            <Button variant="contained" onClick={() => router.push(paths.home)} startIcon={<Iconify icon="solar:home-2-bold" width={20} />}>
              Go to home
            </Button>
          </Card>
        </Stack>
      </ContentWrapper>
    );
  }

  const user = fetchedUser;

  const handleEditSuccess = async (updatedUser) => {
    setIsEditMode(false);

    if (updatedUser) {
      syncApiUserToSession(updatedUser);
    }

    if (refreshUser) {
      refreshUser();
    }

    if (checkUserSession) {
      await checkUserSession();
    }
  };

  if (userLoading) {
    return <LoadingScreen />;
  }

  if (userError || !user) {
    const errorMessage =
      typeof userError === 'string'
        ? userError
        : userError?.message || userError?.response?.data?.message || 'Profile not found';

    return (
      <ContentWrapper {...contentShellProps}>
        <Stack spacing={2}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Profile
          </Typography>
          <Card sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="body1" color="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Typography>
            <Button variant="outlined" component={RouterLink} href={isAdmin ? paths.admin.root : paths.home}>
              {isAdmin ? 'Back to admin' : 'Back to home'}
            </Button>
          </Card>
        </Stack>
      </ContentWrapper>
    );
  }

  const displayName =
    [user.firstname, user.lastname].filter(Boolean).join(' ') || user.name || user.username || (isAdmin ? 'Admin' : 'User');
  const normalizedStatus = String(user.status || 'Active').toLowerCase();
  const statusLabel = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

  const basePath = (CONFIG.site.basePath || '').replace(/\/$/, '');
  const coverUrl = basePath ? `${basePath}/assets/profilebg.jpg` : '/assets/profilebg.jpg';

  const headlineSubtitle = (() => {
    const parts = [];
    if (user.username) parts.push(`@${user.username}`);
    if (user.company) parts.push(user.company);
    return parts.length ? parts.join(' · ') : '';
  })();

  const hasContactNumber = Boolean(String(user.contactNumber || user.phoneNumber || '').trim());
  const showEmailVerified = Boolean(user.isVerified);
  const showContactVerified = Boolean(user.isVerified) && hasContactNumber;
  const showFeeWaiverHrStatus = !isAdmin && canShowFeeWaiverHrStatus(user);
  const jobRoleStatus = showFeeWaiverHrStatus ? getJobRoleAuditStatus(user) : null;

  if (isEditMode) {
    return (
      <ContentWrapper {...contentShellProps}>
        <Stack spacing={3} sx={{ width: 1, mt: { xs: 1.5, sm: 2, md: 2.5 } }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} flexWrap="wrap" useFlexGap>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Edit profile
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                {isAdmin
                  ? 'Update your admin account details stored in the local database.'
                  : 'Update your ISCA eServices profile details. Changes sync to Salesforce when your account is linked.'}

              </Typography>
            </Box>
            <Button variant="outlined" color="inherit" onClick={() => setIsEditMode(false)} startIcon={<Iconify icon="solar:close-circle-bold" width={20} />}>
              Cancel
            </Button>
          </Stack>
          <UserNewEditForm
            currentUser={user}
            onCancel={() => setIsEditMode(false)}
            onSuccess={handleEditSuccess}
            isProfileEdit
            isAdminProfile={isAdmin}
          />
        </Stack>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper {...contentShellProps}>
      <Stack spacing={3} sx={{ width: 1, mt: { xs: 1.5, sm: 2, md: 2.5 } }}>
        <Card
          sx={{
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.14)}`,
            boxShadow:
              theme.palette.mode === 'dark'
                ? `0 18px 48px ${alpha(theme.palette.common.black, 0.4)}`
                : `0 18px 48px ${alpha(theme.palette.grey[500], 0.14)}`,
            borderRadius: 3,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              height: { xs: 148, sm: 188 },
              overflow: 'hidden',
              backgroundImage: `
                linear-gradient(125deg, ${alpha(theme.palette.primary.darker || theme.palette.primary.dark, 0.72)} 0%, ${alpha(theme.palette.primary.main, 0.35)} 48%, ${alpha(theme.palette.common.black, 0.25)} 100%),
                url(${coverUrl})
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(ellipse at 20% 20%, ${alpha(theme.palette.common.white, 0.18)} 0%, transparent 55%)`,
                pointerEvents: 'none',
              },
            }}
          />

          <Box sx={{ px: { xs: 2, sm: 3, md: 3.5 }, pb: { xs: 2.5, sm: 3.5 }, pt: 0, bgcolor: 'background.paper' }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 2, md: 3 }}
              alignItems={{ xs: 'center', md: 'flex-end' }}
              sx={{ mt: { xs: -7.5, sm: -9 } }}
            >
              <Avatar
                src={user.avatarUrl}
                alt={displayName}
                sx={{
                  width: { xs: 108, sm: 124 },
                  height: { xs: 108, sm: 124 },
                  fontSize: { xs: '2.4rem', sm: '2.7rem' },
                  fontWeight: 700,
                  border: '4px solid',
                  borderColor: 'background.paper',
                  boxShadow: `0 10px 28px ${alpha(theme.palette.common.black, 0.18)}`,
                  bgcolor: alpha(theme.palette.primary.main, 0.16),
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Avatar>

              <Stack
                spacing={1}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  alignItems: { xs: 'center', md: 'flex-start' },
                  textAlign: { xs: 'center', md: 'left' },
                  pb: { md: 0.5 },
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1.15,
                    fontSize: { xs: '1.6rem', sm: '1.95rem', md: '2.15rem' },
                    letterSpacing: '-0.02em',
                  }}
                >
                  {displayName}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {headlineSubtitle || user.email}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  sx={{ color: 'text.secondary' }}
                >
                  <Iconify icon="solar:calendar-bold" width={18} />
                  <Typography variant="body2">Member since {fDate(user.createdAt) || '—'}</Typography>
                </Stack>
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  useFlexGap
                  spacing={1}
                  sx={{ pt: 0.25, justifyContent: { xs: 'center', md: 'flex-start' } }}
                >
                  <Label color={normalizedStatus === 'active' ? 'success' : 'error'} variant="soft">
                    {statusLabel}
                  </Label>
                  {user.isVerified && (
                    <Label color="success" variant="soft" startIcon={<Iconify icon="solar:verified-check-bold" width={14} />}>
                      Email verified
                    </Label>
                  )}
                  {jobRoleStatus ? (
                    <Label color={jobRoleStatus.color} variant="soft">
                      Job role: {jobRoleStatus.label}
                    </Label>
                  ) : null}
                </Stack>
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{
                  width: { xs: 1, sm: 'auto' },
                  flexShrink: 0,
                  alignSelf: { xs: 'stretch', md: 'flex-end' },
                  pb: { md: 0.5 },
                }}
              >
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={<Iconify icon="solar:pen-bold" width={20} />}
                  onClick={() => setIsEditMode(true)}
                  sx={{ fontWeight: 700, borderRadius: 2 }}
                >
                  Edit profile
                </Button>
                {!isAdmin ? (
                  <Button
                    component={RouterLink}
                    href={paths.home}
                    variant="outlined"
                    color="inherit"
                    size="medium"
                    endIcon={<Iconify icon="solar:arrow-right-linear" width={18} />}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    Explore
                  </Button>
                ) : null}
              </Stack>
            </Stack>

            <Divider sx={{ my: { xs: 2.5, sm: 3 } }} />

            <Grid container spacing={2.5} alignItems="stretch">
              <Grid xs={12} md={showFeeWaiverHrStatus ? 5 : 12}>
                <ProfileSectionCard title="Contact" subtitle="How we reach you" accent="primary">
                  <Stack spacing={2.25} sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                        }}
                      >
                        <Iconify icon="solar:letter-bold" width={20} sx={{ color: 'primary.main' }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Email
                          </Typography>
                          {showEmailVerified ? (
                            <Box
                              component="span"
                              aria-label="Verified"
                              title="Verified"
                              sx={{ display: 'inline-flex', lineHeight: 0, color: 'success.main' }}
                            >
                              <Iconify icon="solar:verified-check-bold" width={16} />
                            </Box>
                          ) : null}
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                          {user.email || '—'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                        }}
                      >
                        <Iconify icon="solar:phone-bold" width={20} sx={{ color: 'primary.main' }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Contact number
                          </Typography>
                          {showContactVerified ? (
                            <Box
                              component="span"
                              aria-label="Verified"
                              title="Verified"
                              sx={{ display: 'inline-flex', lineHeight: 0, color: 'success.main' }}
                            >
                              <Iconify icon="solar:verified-check-bold" width={16} />
                            </Box>
                          ) : null}
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {user.contactNumber || user.phoneNumber || '—'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Button
                      fullWidth
                      component={RouterLink}
                      href={paths.contact}
                      variant="outlined"
                      color="inherit"
                      size="medium"
                      startIcon={<Iconify icon="solar:chat-round-dots-bold" width={20} />}
                      sx={{ borderRadius: 2, mt: 'auto', fontWeight: 700 }}
                    >
                      Contact support
                    </Button>
                  </Stack>
                </ProfileSectionCard>
              </Grid>

              {showFeeWaiverHrStatus ? (
                <Grid xs={12} md={7}>
                  <ProfileSectionCard
                    title="Job role verification"
                    subtitle="HR / employer confirmation for fee waiver"
                    accent="info"
                  >
                    <FeeWaiverHrUserStatusPanel user={user} onRefresh={refreshUser} />
                  </ProfileSectionCard>
                </Grid>
              ) : null}

              <Grid xs={12}>
                <UserSalesforceProfileCard user={user} layout="wide" />
              </Grid>
            </Grid>
          </Box>
        </Card>
      </Stack>
    </ContentWrapper>
  );
}
