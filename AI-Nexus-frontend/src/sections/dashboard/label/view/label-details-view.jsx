import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';
import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export function LabelDetailsView({ label, loading, error }) {
  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !label) {
    return (
      <DashboardContent sx={{ pt: 5 }}>
        <EmptyContent
          filled
          title="Label not found!"
          action={
            <Button
              component={RouterLink}
              href={paths.admin.label.list}
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

  const displayName = label.name || label.title || '-';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const headerChips = [
    {
      label: 'Label',
      icon: 'solar:tag-bold',
      color: 'info',
      variant: 'soft',
    },
  ];

  const sections = [
    {
      title: 'Label information',
      icon: 'solar:tag-bold',
      rows: [{ label: 'Name', value: displayName }],
    },
    {
      title: 'Meta',
      icon: 'solar:clock-circle-bold',
      rows: [
        {
          label: 'Created At',
          value: label.createdAt
            ? fDateTime(label.createdAt, 'DD MMM YYYY h:mm A')
            : '-',
        },
        {
          label: 'Updated At',
          value: label.updatedAt
            ? fDateTime(label.updatedAt, 'DD MMM YYYY h:mm A')
            : '-',
        },
      ],
    },
  ];

  return (
    <EntityDetailsLayout
      heading="Label Details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Label', href: paths.admin.label.list },
        { name: displayName },
      ]}
      editHref={paths.admin.label.edit(label?.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        title: displayName,
        subtitle: label.createdAt
          ? `Created ${fDateTime(label.createdAt, 'DD MMM YYYY h:mm A')}`
          : undefined,
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}
