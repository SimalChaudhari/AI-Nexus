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

import { paths } from 'src/routes/paths';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { DashboardContent } from 'src/layouts/dashboard';

import { useGetAdminProfile } from 'src/actions/user';
import { UserNewEditForm } from '../../user/user-new-edit-form';

// ----------------------------------------------------------------------

export function AdminProfileView() {
  const router = useRouter();
  const { user: currentAuthUser, checkUserSession } = useAuthContext();

  // Fetch admin profile data
  const { user: fetchedUser, userLoading, userError, refresh: refreshUser } = useGetAdminProfile();

  // Prefer auth user data if available, otherwise use fetched
  const user = currentAuthUser ? {
    id: currentAuthUser.id || currentAuthUser._id,
    username: currentAuthUser.username || fetchedUser?.username,
    firstname: currentAuthUser.firstname || fetchedUser?.firstname,
    lastname: currentAuthUser.lastname || fetchedUser?.lastname,
    email: currentAuthUser.email || fetchedUser?.email,
    status: currentAuthUser.status || fetchedUser?.status || 'Active',
    role: currentAuthUser.role || fetchedUser?.role || 'Admin',
    isVerified: currentAuthUser.isVerified || fetchedUser?.isVerified || false,
    avatarUrl: currentAuthUser.avatarUrl || fetchedUser?.avatarUrl || null,
    phoneNumber: currentAuthUser.phoneNumber || fetchedUser?.phoneNumber,
    company: currentAuthUser.company || fetchedUser?.company,
    name: [currentAuthUser.firstname, currentAuthUser.lastname].filter(Boolean).join(' ') || currentAuthUser.name || fetchedUser?.name,
  } : fetchedUser;

  const [isEditMode, setIsEditMode] = useState(false);

  // Handle successful profile update
  const handleEditSuccess = async (updatedUser) => {
    setIsEditMode(false);

    // Refresh user data
    if (refreshUser) {
      refreshUser();
    }

    // Update session storage with new user data
    if (updatedUser) {
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        try {
          const currentUser = JSON.parse(userStr);
          const updatedUserData = {
            ...currentUser,
            ...updatedUser,
            // Ensure status is capitalized for display
            status: updatedUser.status ? updatedUser.status.charAt(0).toUpperCase() + updatedUser.status.slice(1) : currentUser.status,
          };
          sessionStorage.setItem('user', JSON.stringify(updatedUserData));
        } catch (error) {
          console.error('Error updating user in sessionStorage:', error);
        }
      }
    }

    // Refresh auth context
    if (checkUserSession) {
      await checkUserSession();
    }
  };

  if (userLoading) {
    return <LoadingScreen />;
  }

  if (userError || !user) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Admin Profile"
          links={[
            { name: 'Admin', href: paths.admin.root },
            { name: 'Profile' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" color="error">
            {userError || 'Admin profile not found'}
          </Typography>
        </Card>
      </DashboardContent>
    );
  }

  const displayName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.name || user.username || 'Admin';

  if (isEditMode) {
    return (
      <DashboardContent>
        <CustomBreadcrumbs
          heading="Edit Admin Profile"
          links={[
            { name: 'Admin', href: paths.admin.root },
            { name: 'My Profile', href: paths.admin.profile },
            { name: 'Edit' },
          ]}
          sx={{ mb: { xs: 3, md: 5 } }}
        />
        <UserNewEditForm
          currentUser={user}
          onCancel={() => setIsEditMode(false)}
          onSuccess={handleEditSuccess}
          isProfileEdit
          isAdminProfile
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Admin Profile"
        links={[
          { name: 'Admin', href: paths.admin.root },
          { name: 'My Profile' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={() => setIsEditMode(true)}
          >
            Edit Profile
          </Button>
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
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 1 }}>
              <Label color="info" variant="soft">
                {user.role || 'Admin'}
              </Label>
              <Label color={user.status === 'Active' ? 'success' : 'error'} variant="soft">
                {user.status || 'Active'}
              </Label>
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
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
              Role
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.role || 'Admin'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Status
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.status || 'Active'}
            </Typography>
          </Grid>
          <Grid xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Email Verified
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {user.isVerified ? 'Yes' : 'No'}
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
        </Grid>
      </Card>
    </DashboardContent>
  );
}

