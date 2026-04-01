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

// ----------------------------------------------------------------------

export function TagDetailsView({ tag, loading, error }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !tag) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Tag not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.tag.list}
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
        heading="Tag Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Tag', href: paths.admin.tag.list },
          { name: tag?.title },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.tag.edit(tag?.id)}
            variant="contained"
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Tag Information
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
                  Title
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tag.title || '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Created At
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tag.createdAt ? new Date(tag.createdAt).toLocaleString() : '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Updated At
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {tag.updatedAt ? new Date(tag.updatedAt).toLocaleString() : '-'}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

