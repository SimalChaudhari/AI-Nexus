import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'src/routes/hooks';
import { useAuthContext } from 'src/auth/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { DashboardContent } from 'src/layouts/dashboard';

import { syncApiUserToSession } from 'src/auth/utils/normalize-user-session';
import { useGetUser, useGetUserProfile } from 'src/actions/user';
import { formatNullableBoolean } from 'src/utils/format-boolean';
import { UserNewEditForm } from '../user-new-edit-form';

// ----------------------------------------------------------------------

export function UserProfileDetailView({ isOwnProfile = false }) {
  const router = useRouter();
  const { user: currentAuthUser, checkUserSession } = useAuthContext();
  const { id } = useParams();

  const userId = isOwnProfile ? '' : id;

  const profileHook = useGetUserProfile(isOwnProfile);
  const userHook = useGetUser(userId);

  const { user: fetchedUser, userLoading, userError, refresh: refreshUser } = isOwnProfile ? profileHook : userHook;

  const user = fetchedUser;

  useEffect(() => {
    if (!isOwnProfile || !fetchedUser?.id) return;
    syncApiUserToSession(fetchedUser);
    checkUserSession?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when API user id changes only
  }, [isOwnProfile, fetchedUser?.id]);

  const [isEditMode, setIsEditMode] = useState(false);

  // Handle successful profile update
  const handleEditSuccess = async (updatedUser) => {
    setIsEditMode(false);

    // Refresh user data
    if (refreshUser) {
      refreshUser();
    }

    if (isOwnProfile && updatedUser) {
      syncApiUserToSession(updatedUser);
      if (checkUserSession) {
        await checkUserSession();
      }
    }
  };

  if (userLoading) {
    return <LoadingScreen />;
  }

  if (userError || !user) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Profile"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Profile' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {userError || 'User not found'}
          </Typography>
        </Card>
      </DashboardContent>
    );
  }

  const displayName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.name || user.username || 'User';
  const canEdit = isOwnProfile || currentAuthUser?.role === 'Admin';

  if (isEditMode) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Edit Profile"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: isOwnProfile ? 'My Profile' : 'Profile', href: isOwnProfile ? paths.dashboard.user.profile : paths.admin.user.details(user.id) },
            { name: 'Edit' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <UserNewEditForm
          currentUser={user}
          onCancel={() => setIsEditMode(false)}
          onSuccess={handleEditSuccess}
          isProfileEdit
          isAdminProfile={false}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={isOwnProfile ? 'My Profile' : 'Profile'}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: isOwnProfile ? 'My Profile' : 'Profile' },
        ]}
        action={
          canEdit && (
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={() => setIsEditMode(true)}
            >
              Edit Profile
            </Button>
          )
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 4 }}>
        <Stack spacing={4} alignItems="center" sx={{ mb: 4 }}>
          <Avatar
            src={user.avatarUrl}
            alt={displayName}
            sx={{ width: 120, height: 120, fontSize: '3rem', bgcolor: 'grey.300' }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 600 }}>
              {displayName}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ mb: 4 }} />

        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Account Information
        </Typography>

        <Grid container spacing={3}>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              First Name
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.firstname || '-'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Last Name
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.lastname || '-'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Username
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.username || '-'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Email
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.email || '-'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Company code
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.companyCode || '—'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Account Created
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '-'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              SCAQ candidate
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {formatNullableBoolean(user.isSCAQCandidate)}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Associate member
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {formatNullableBoolean(user.isAssociateMember)}
            </Typography>
          </Grid>
        </Grid>
      </Card>
    </DashboardContent>
  );
}

