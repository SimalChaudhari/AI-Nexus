import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { Image } from 'src/components/image';
import { RichTextContent } from 'src/components/html-content';

// ----------------------------------------------------------------------

export function WorkflowDetailsView({ workflow, loading, error }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !workflow) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="AI resource not found"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.workflow.list}
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
        heading="AI resource details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'AI Resource', href: paths.admin.workflow.list },
          { name: workflow?.title },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.admin.workflow.edit(workflow?.id)}
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
          <Card sx={{ p: 3 }}>
            {workflow.image && (
              <Box sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Image
                  alt={workflow.title}
                  src={workflow.image}
                  ratio="16/9"
                  sx={{ borderRadius: 2 }}
                />
              </Box>
            )}

            <Typography variant="h6" sx={{ mb: 2 }}>
              {workflow.title}
            </Typography>

            {workflow.label && (
              <Chip
                label={workflow.label.name || workflow.label.title}
                color="primary"
                variant="soft"
                sx={{ mb: 2 }}
              />
            )}

            {workflow.tags && workflow.tags.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                {workflow.tags.map((tag) => (
                  <Chip
                    key={tag.id}
                    label={tag.title}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              AI resource information
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
                  {workflow.title || '-'}
                </Typography>
              </Box>

              {workflow.label && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Label
                  </Typography>
                  <Chip
                    label={workflow.label.name || workflow.label.title}
                    size="small"
                    color="primary"
                    variant="soft"
                  />
                </Box>
              )}

              {workflow.tags && workflow.tags.length > 0 && (
                <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {workflow.tags.map((tag) => (
                      <Chip
                        key={tag.id}
                        label={tag.title}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {workflow.description && (
                <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Description
                  </Typography>
                  <RichTextContent html={workflow.description} sx={{ color: 'text.secondary' }} />
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Created At
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {workflow.createdAt ? new Date(workflow.createdAt).toLocaleString() : '-'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Updated At
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {workflow.updatedAt ? new Date(workflow.updatedAt).toLocaleString() : '-'}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

