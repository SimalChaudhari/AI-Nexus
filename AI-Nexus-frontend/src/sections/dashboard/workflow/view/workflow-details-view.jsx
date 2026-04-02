import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { ViewHtmlContent } from 'src/components/html-content';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { fDateTime } from 'src/utils/format-time';

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

  const title = workflow.title || '-';
  const initials =
    title
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const headerChips = [
    workflow.label && {
      label: workflow.label.name || workflow.label.title,
      color: 'primary',
      variant: 'soft',
    },
    ...(workflow.tags || []).slice(0, 4).map((tag) => ({
      label: tag.title,
      variant: 'outlined',
    })),
  ].filter(Boolean);

  const sections = [
    {
      title: 'AI resource information',
      icon: 'solar:widget-5-bold',
      rows: [
        { label: 'Title', value: title },
        workflow.label && {
          label: 'Label',
          value: (
            <Chip
              label={workflow.label.name || workflow.label.title}
              size="small"
              color="primary"
              variant="soft"
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          ),
        },
        (workflow.tags || []).length > 0 && {
          label: 'Tags',
          value: (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {workflow.tags.map((tag) => (
                <Chip key={tag.id} label={tag.title} size="small" variant="outlined" />
              ))}
            </Stack>
          ),
        },
      ].filter(Boolean),
    },
    {
      title: 'Meta',
      icon: 'solar:clock-circle-bold',
      rows: [
        {
          label: 'Created At',
          value: workflow.createdAt
            ? fDateTime(workflow.createdAt, 'DD MMM YYYY h:mm A')
            : '-',
        },
        {
          label: 'Updated At',
          value: workflow.updatedAt
            ? fDateTime(workflow.updatedAt, 'DD MMM YYYY h:mm A')
            : '-',
        },
      ],
    },
    workflow.description && {
      title: 'Description',
      icon: 'solar:document-text-bold',
      fullWidth: true,
      rows: [
        {
          label: 'Content',
          value: (
            <ViewHtmlContent
              html={workflow.description}
              sx={{
                typography: 'body1',
                fontSize: '1rem',
                lineHeight: 1.8,
                color: 'text.primary',
              }}
            />
          ),
        },
      ],
    },
  ].filter(Boolean);

  return (
    <EntityDetailsLayout
      heading="AI resource details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'AI Resource', href: paths.admin.workflow.list },
        { name: title },
      ]}
      editHref={paths.admin.workflow.edit(workflow?.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarSrc: workflow.image || undefined,
        avatarText: initials,
        avatarAlt: title,
        title,
        subtitle: workflow.createdAt
          ? `Created ${fDateTime(workflow.createdAt, 'DD MMM YYYY h:mm A')}`
          : undefined,
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}
