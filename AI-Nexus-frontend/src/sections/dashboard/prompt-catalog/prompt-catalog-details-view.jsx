import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';
import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { Iconify } from 'src/components/iconify';
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

function renderRichOrPlain(str) {
  if (!str || !String(str).trim()) return '-';
  const trimmed = String(str).trim();
  if (looksLikeHtml(trimmed)) {
    return <ViewHtmlContent html={trimmed} sx={richTextSx} />;
  }
  return (
    <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', mt: 0.25 }}>
      {trimmed}
    </Typography>
  );
}

// ----------------------------------------------------------------------

export function PromptCatalogDetailsView() {
  const { id } = useParams();
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
            <Button
              component={RouterLink}
              href={paths.admin.promptCatalog.list}
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

  const headingTitle = row.sectionTitle || 'Prompt';
  const initials =
    headingTitle
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const headerChips = [
    {
      label: row.isActive ? 'Active' : 'Inactive',
      color: row.isActive ? 'success' : 'default',
      variant: 'soft',
    },
  ];

  const sections = [
    {
      title: 'Prompt information',
      icon: 'solar:chat-round-dots-bold',
      fullWidth: true,
      rows: [
        { label: 'Category', value: row.category || row.packId || '-' },
        { label: 'Section Title', value: row.sectionTitle || '-' },
        { label: 'Section Order', value: row.sectionOrder ?? '-' },
        { label: 'Item Order', value: row.itemOrder ?? '-' },
        {
          label: 'Status',
          value: (
            <Chip
              size="small"
              label={row.isActive ? 'Active' : 'Inactive'}
              color={row.isActive ? 'success' : 'default'}
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          ),
        },
      ],
    },
    (row.providers || []).length > 0 && {
      title: 'Providers',
      icon: 'solar:server-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Connected',
          value: (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {(row.providers || []).map((provider) => (
                <Chip
                  key={`${row.id}-${provider?.value || provider?.label}`}
                  size="small"
                  icon={provider?.icon ? <Iconify icon={provider.icon} width={14} /> : undefined}
                  label={provider?.label || provider?.value || '-'}
                  variant="outlined"
                />
              ))}
            </Stack>
          ),
        },
      ],
    },
    {
      title: 'Content',
      icon: 'solar:notes-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Use case',
          value: renderRichOrPlain(row.useCase),
        },
        {
          label: 'Prompt',
          value: renderRichOrPlain(row.prompt),
        },
      ],
    },
  ].filter(Boolean);

  return (
    <EntityDetailsLayout
      heading="Prompt details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'AI Resource', href: paths.admin.workflow.list },
        { name: 'Prompt catalog', href: paths.admin.promptCatalog.list },
        { name: headingTitle },
      ]}
      editHref={paths.admin.promptCatalog.edit(row.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        title: headingTitle,
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}
