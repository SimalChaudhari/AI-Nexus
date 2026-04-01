import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmptyContent } from 'src/components/empty-content';
import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import { promptCatalogService } from 'src/services/prompt-catalog.service';

export function PromptCatalogDetailsView() {
  const { id } = useParams();
  const router = useRouter();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const rows = await promptCatalogService.getAdminRows();
        setRow(rows.find((item) => item.id === id) || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <LoadingScreen />;

  if (!row) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Prompt row not found!"
          action={
            <Button onClick={() => router.push(paths.admin.promptCatalog.list)} sx={{ mt: 2 }}>
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
        heading="Prompt Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: 'Prompt Catalog', href: paths.admin.promptCatalog.list },
          { name: row.sectionTitle || 'Details' },
        ]}
        action={
          <Button variant="contained" onClick={() => router.push(paths.admin.promptCatalog.edit(row.id))}>
            Edit
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Providers
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {(row.providers || []).map((provider) => (
                <Chip
                  key={`${row.id}-${provider?.value || provider?.label}`}
                  size="small"
                  icon={provider?.icon ? <Iconify icon={provider.icon} width={14} /> : undefined}
                  label={provider?.label || provider?.value || '-'}
                  variant="outlined"
                />
              ))}
            </Box>
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Prompt Information
            </Typography>

            <Box rowGap={2} columnGap={2} display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}>
              <Box>
                <Typography variant="subtitle2">Category</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {row.category || row.packId || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Section Title</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {row.sectionTitle || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Section Order</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {row.sectionOrder ?? '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Item Order</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {row.itemOrder ?? '-'}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="subtitle2">Use Case</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {row.useCase || '-'}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="subtitle2">Prompt</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {row.prompt || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Status</Typography>
                <Chip size="small" label={row.isActive ? 'Active' : 'Inactive'} color={row.isActive ? 'success' : 'default'} />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

