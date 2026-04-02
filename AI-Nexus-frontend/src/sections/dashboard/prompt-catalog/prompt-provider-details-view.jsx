import { useEffect, useState } from 'react';

import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { ViewHtmlContent } from 'src/components/html-content';
import { promptCatalogService } from 'src/services/prompt-catalog.service';

// ----------------------------------------------------------------------

const richTextSx = {
  typography: 'body1',
  fontSize: '1rem',
  lineHeight: 1.8,
  color: 'text.primary',
};

function looksLikeHtml(str) {
  if (!str || typeof str !== 'string') return false;
  return /<[a-z][\s\S]*>/i.test(str.trim());
}

function renderDescription(str) {
  if (!str || !String(str).trim()) return '-';
  const trimmed = String(str).trim();
  if (looksLikeHtml(trimmed)) {
    return <ViewHtmlContent html={trimmed} sx={richTextSx} />;
  }
  return (
    <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-line', mt: 0.25 }}>
      {trimmed}
    </Typography>
  );
}

// ----------------------------------------------------------------------

export function PromptProviderDetailsView() {
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
          filled
          title="Provider not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.promptCatalog.providers}
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

  const displayTitle = provider.title || provider.provider || '-';
  const initials =
    displayTitle
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const headerChips = [
    {
      label: provider.isActive ? 'Active' : 'Inactive',
      color: provider.isActive ? 'success' : 'default',
      variant: 'soft',
    },
    provider.icon && {
      label: provider.provider || 'Provider',
      icon: provider.icon,
      variant: 'soft',
      color: 'info',
    },
  ].filter(Boolean);

  const sections = [
    {
      title: 'Provider information',
      icon: 'solar:server-square-bold',
      fullWidth: true,
      rows: [
        { label: 'Provider', value: provider.provider || '-' },
        { label: 'Title', value: provider.title || '-' },
        { label: 'Detail title', value: provider.detailTitle || '-' },
        {
          label: 'Color',
          value: provider.color ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: 0.5,
                  bgcolor: provider.color,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                }}
              />
              <Typography variant="body2" component="span">
                {provider.color}
              </Typography>
            </Box>
          ) : (
            '-'
          ),
        },
        {
          label: 'Icon',
          value: provider.icon ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Iconify icon={provider.icon} width={22} />
              <Typography variant="body2" component="span" sx={{ color: 'text.secondary' }}>
                {provider.icon}
              </Typography>
            </Box>
          ) : (
            '-'
          ),
        },
        { label: 'Redirect URL', value: provider.redirectUrl || '-' },
        {
          label: 'Active',
          value: (
            <Chip
              size="small"
              label={provider.isActive ? 'Yes' : 'No'}
              color={provider.isActive ? 'success' : 'default'}
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          ),
        },
      ],
    },
    provider.description && {
      title: 'Description',
      icon: 'solar:document-text-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Details',
          value: renderDescription(provider.description),
        },
      ],
    },
  ].filter(Boolean);

  return (
    <EntityDetailsLayout
      heading="Provider details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'AI Resource', href: paths.admin.workflow.list },
        { name: 'Providers', href: paths.admin.promptCatalog.providers },
        { name: displayTitle },
      ]}
      editHref={paths.admin.promptCatalog.providerEdit(provider.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        title: displayTitle,
        subtitle: provider.provider ? `Provider: ${provider.provider}` : undefined,
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}
