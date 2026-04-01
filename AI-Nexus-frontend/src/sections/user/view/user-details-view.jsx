import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export function UserDetailsView({ user, loading, error }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !user) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="User not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.user.list}
              startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />}
              sx={{ mt: 3 }}
            >
              Back to list
            </Button>
          }
          sx={{ py: 10, height: 'auto', flexGrow: 'unset' }}
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="User Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'User', href: paths.admin.user.list },
          { name: user?.name || `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || '-' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.user.edit(user?.id)}
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ mb: 3 }}>
              <Label
                color={
                  (user.status === 'Active' && 'success') ||
                  (user.status === 'Banned' && 'error') ||
                  (user.status === 'Inactive' && 'info') ||
                  'warning'
                }
                sx={{ mb: 2 }}
              >
                {user.status}
              </Label>
            </Box>

            <Typography variant="h6" sx={{ mb: 1 }}>
              {user.name || `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || '-'}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              {user.email}
            </Typography>

            <Box sx={{ textAlign: 'left', mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Username
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {user.username || '-'}
              </Typography>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Role
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {user.role || '-'}
              </Typography>
            </Box>
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              User Information
            </Typography>

            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  First Name
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.firstname || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Last Name
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.lastname || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Username
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.username || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Email
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.email || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Role
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.role || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Status
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {user.status || '-'}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

