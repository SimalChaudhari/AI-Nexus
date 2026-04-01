import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter, useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { promptCatalogService } from 'src/services/prompt-catalog.service';

export function PromptProviderDetailsView() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const rows = await promptCatalogService.getAdminProviderProfiles();
        const found = rows.find((row) => String(row.id) === String(id));
        setProvider(found || null);
      } catch (error) {
        toast.error(error?.message || 'Failed to load provider');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingScreen />;

  if (!provider) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          title="Provider not found!"
          action={
            <Button component={RouterLink} href={paths.admin.promptCatalog.providers} startIcon={<Iconify width={16} icon="eva:arrow-ios-back-fill" />} sx={{ mt: 3 }}>
              Back to list
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Provider Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'Provider', href: paths.admin.promptCatalog.providers },
          { name: provider.title || provider.provider },
        ]}
        action={
          <Button component={RouterLink} href={paths.admin.promptCatalog.providerEdit(provider.id)} variant="contained" startIcon={<Iconify icon="solar:pen-bold" />}>
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Provider Information
            </Typography>
            <Box rowGap={3} columnGap={2} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }}>
              <Detail label="Provider" value={provider.provider} />
              <Detail label="Title" value={provider.title} />
              <Detail label="Color" value={provider.color} />
              <Detail label="Icon" value={provider.icon} />
              <Detail label="Redirect URL" value={provider.redirectUrl} />
              <Detail label="Detail Title" value={provider.detailTitle} />
              <Detail label="Active" value={provider.isActive ? 'Yes' : 'No'} />
            </Box>
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Detail label="Description" value={provider.description} />
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

function Detail({ label, value, multiline = false }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: multiline ? 'pre-line' : 'normal' }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

