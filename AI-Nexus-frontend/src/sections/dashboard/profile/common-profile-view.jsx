import { useState } from 'react';
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
import { useGetUserProfile, useGetAdminProfile } from 'src/actions/user';
import { UserNewEditForm } from '../user/user-new-edit-form';

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

  const shouldFetchProfile = !currentAuthUser;
  const userProfileHook = useGetUserProfile(shouldFetchProfile);
  const adminProfileHook = useGetAdminProfile(shouldFetchProfile);

  const { user: fetchedUser, userLoading, userError, refresh: refreshUser } = isAdmin ? adminProfileHook : userProfileHook;

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

  const user = currentAuthUser
    ? {
        id: currentAuthUser.id || currentAuthUser._id,
        username: currentAuthUser.username || fetchedUser?.username,
        firstname: currentAuthUser.firstname || fetchedUser?.firstname,
        lastname: currentAuthUser.lastname || fetchedUser?.lastname,
        email: currentAuthUser.email || fetchedUser?.email,
        status: currentAuthUser.status || fetchedUser?.status || 'Active',
        role: currentAuthUser.role || fetchedUser?.role || userRole,
        isVerified: currentAuthUser.isVerified || fetchedUser?.isVerified || false,
        avatarUrl: currentAuthUser.avatarUrl || fetchedUser?.avatarUrl || null,
        contactNumber: currentAuthUser.contactNumber || currentAuthUser.phoneNumber || fetchedUser?.contactNumber || fetchedUser?.phoneNumber,
        company: currentAuthUser.company || fetchedUser?.company,
        name:
          [currentAuthUser.firstname, currentAuthUser.lastname].filter(Boolean).join(' ') ||
          currentAuthUser.name ||
          fetchedUser?.name,
        createdAt: currentAuthUser.createdAt || fetchedUser?.createdAt,
      }
    : fetchedUser;

  const handleEditSuccess = async (updatedUser) => {
    setIsEditMode(false);

    if (refreshUser) {
      refreshUser();
    }

    if (updatedUser) {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        try {
          const currentUser = JSON.parse(userStr);
          const updatedUserData = {
            ...currentUser,
            ...updatedUser,
            status: updatedUser.status ? updatedUser.status.charAt(0).toUpperCase() + updatedUser.status.slice(1) : currentUser.status,
          };
          sessionStorage.setItem('user', JSON.stringify(updatedUserData));
        } catch (error) {
          console.error('Error updating user in sessionStorage:', error);
        }
      }
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
                Update your name, email, avatar, and other account details. Changes apply after you save.
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
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            My profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 900 }}>
            Your account overview. Edit details anytime, or open Persona & learning to tune course recommendations.
          </Typography>
        </Box>

        <Card
          sx={{
            overflow: 'visible',
            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.12)}`,
            boxShadow: (t) =>
              t.palette.mode === 'dark'
                ? `0 12px 40px ${alpha(theme.palette.common.black, 0.35)}`
                : `0 12px 40px ${alpha(theme.palette.grey[500], 0.12)}`,
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              height: { xs: 160, sm: 200 },
              borderTopLeftRadius: (t) => Number(t.shape.borderRadius) * 2,
              borderTopRightRadius: (t) => Number(t.shape.borderRadius) * 2,
              overflow: 'hidden',
              backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.2)} 0%, ${alpha(theme.palette.common.black, 0.45)} 100%), url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />

          <Box sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2.5, sm: 3 }, pt: 0, bgcolor: 'background.paper' }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 2, md: 2.5 }}
              alignItems={{ xs: 'center', md: 'flex-start' }}
              sx={{ mt: { xs: -8, sm: -10 } }}
            >
              <Avatar
                src={user.avatarUrl}
                alt={displayName}
                sx={{
                  width: { xs: 112, sm: 128 },
                  height: { xs: 112, sm: 128 },
                  fontSize: { xs: '2.5rem', sm: '2.75rem' },
                  fontWeight: 700,
                  border: '4px solid',
                  borderColor: 'background.paper',
                  boxShadow: theme.shadows[8],
                  bgcolor: alpha(theme.palette.grey[500], 0.24),
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
                  pt: { md: 5.5 },
                }}
              >
                <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.15, fontSize: { xs: '1.65rem', sm: '2rem', md: '2.25rem' } }}>
                  {displayName}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {headlineSubtitle || user.email}
                </Typography>
                <Stack
                  direction="row"
                  flexWrap="wrap"
                  useFlexGap
                  spacing={1.5}
                  alignItems="center"
                  justifyContent={{ xs: 'center', md: 'flex-start' }}
                  sx={{ rowGap: 1 }}
                >
               
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary' }}>
                    <Iconify icon="solar:calendar-bold" width={18} />
                    <Typography variant="body2">Member since {fDate(user.createdAt) || '—'}</Typography>
                  </Stack>
                </Stack>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ pt: 0.5, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <Label color={normalizedStatus === 'active' ? 'success' : 'error'} variant="soft">
                    {statusLabel}
                  </Label>
                  {user.isVerified && (
                    <Label color="success" variant="soft" startIcon={<Iconify icon="solar:verified-check-bold" width={14} />}>
                      Verified
                    </Label>
                  )}
                </Stack>
              </Stack>

              <Stack
                direction="row"
                flexWrap="wrap"
                useFlexGap
                spacing={1}
                alignItems="flex-start"
                sx={{ pt: { md: 5 }, flexShrink: 0, alignSelf: { xs: 'center', md: 'flex-start' } }}
              >
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={<Iconify icon="solar:pen-bold" width={20} />}
                  onClick={() => setIsEditMode(true)}
                  sx={{ fontWeight: 700 }}
                >
                  Edit
                </Button>
              </Stack>
            </Stack>

            <Divider sx={{ my: { xs: 2.5, sm: 3 } }} />

            <Grid container spacing={{ xs: 2.5, md: 3 }}>
              <Grid xs={12} md={4}>
                <Stack spacing={2.5}>
                  <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1, color: 'text.secondary' }}>
                    Contact
                  </Typography>

                  <Stack spacing={1.75}>
                    <Stack direction="row" spacing={1.25} alignItems="flex-start">
                      <Iconify icon="solar:letter-bold" width={22} sx={{ color: 'text.disabled', mt: 0.25 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Email
                          </Typography>
                          {showEmailVerified && (
                            <Box
                              component="span"
                              aria-label="Verified"
                              title="Verified"
                              sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0, color: 'success.main' }}
                            >
                              <Iconify icon="solar:verified-check-bold" width={18} />
                            </Box>
                          )}
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                          {user.email}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.25} alignItems="flex-start">
                      <Iconify icon="solar:phone-bold" width={22} sx={{ color: 'text.disabled', mt: 0.25 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 0.25 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                            Contact number
                          </Typography>
                          {showContactVerified && (
                            <Box
                              component="span"
                              aria-label="Verified"
                              title="Verified"
                              sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0, color: 'success.main' }}
                            >
                              <Iconify icon="solar:verified-check-bold" width={18} />
                            </Box>
                          )}
                        </Stack>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {user.contactNumber || user.phoneNumber || '—'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>

                  <Button
                    fullWidth
                    component={RouterLink}
                    href={paths.contact}
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<Iconify icon="solar:chat-round-dots-bold" width={22} />}
                    sx={{ borderRadius: 2, py: 1.25, fontWeight: 700 }}
                  >
                    Contact us
                  </Button>
                </Stack>
              </Grid>

              <Grid xs={12} md={8}>
                <Stack spacing={2.5}>
                  <Grid container spacing={2}>
                    <Grid xs={12} md={8}>
                      <Box
                        sx={{
                          position: 'relative',
                          borderRadius: 2,
                          overflow: 'hidden',
                          minHeight: { xs: 200, sm: 220 },
                          p: { xs: 2.5, sm: 3 },
                          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
                          border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.2)}`,
                        }}
                      >
                        <Typography
                          variant="h2"
                          sx={{
                            position: 'absolute',
                            right: 16,
                            top: 8,
                            fontWeight: 900,
                            opacity: 0.08,
                            lineHeight: 1,
                            pointerEvents: 'none',
                            userSelect: 'none',
                          }}
                        >
                          Introduction
                        </Typography>
                        <Stack spacing={1.5} sx={{ position: 'relative' }}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            Welcome to {CONFIG.site.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                            This is your public-facing profile shell. Keep your details up to date, then use Persona & learning so we can
                            tailor courses and content to how you work best.
                          </Typography>
                        </Stack>
                      </Box>
                    </Grid>
                    <Grid xs={12} md={4}>
                      <Box
                        component={!isAdmin ? RouterLink : 'div'}
                        href={!isAdmin ? paths.profile.persona : undefined}
                        sx={{
                          display: 'block',
                          height: 1,
                          minHeight: { xs: 160, sm: 220 },
                          p: 2.5,
                          borderRadius: 2,
                          textDecoration: 'none',
                          color: 'inherit',
                          bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12),
                          border: (t) => `1px solid ${alpha(t.palette.secondary.main, 0.28)}`,
                          transition: (t) => t.transitions.create(['transform', 'box-shadow']),
                          ...(!isAdmin && {
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: theme.shadows[4],
                            },
                          }),
                        }}
                      >
                        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1, color: 'secondary.darker' }}>
                          Persona
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                          <Iconify icon="solar:widget-4-bold-duotone" width={56} sx={{ color: 'secondary.main', opacity: 0.9 }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                          Goals, tone, and learning preferences.
                        </Typography>
                        {!isAdmin && (
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ fontWeight: 700, color: 'secondary.dark' }}>
                            <span>Open</span>
                            <Iconify icon="solar:arrow-right-linear" width={18} />
                          </Stack>
                        )}
                        {isAdmin && (
                          <Typography variant="caption" color="text.secondary">
                            Admin accounts use the dashboard tools.
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Card>
      </Stack>
    </ContentWrapper>
  );
}
