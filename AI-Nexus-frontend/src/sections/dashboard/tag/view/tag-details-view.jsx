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

  const displayName = tag.title || '-';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const headerChips = [
    {
      label: 'Tag',
      icon: 'solar:hashtag-bold',
      color: 'secondary',
      variant: 'soft',
    },
  ];

  const sections = [
    {
      title: 'Tag information',
      icon: 'solar:hashtag-bold',
      rows: [{ label: 'Title', value: displayName }],
    },
    {
      title: 'Meta',
      icon: 'solar:clock-circle-bold',
      rows: [
        {
          label: 'Created At',
          value: tag.createdAt
            ? fDateTime(tag.createdAt, 'DD MMM YYYY h:mm A')
            : '-',
        },
        {
          label: 'Updated At',
          value: tag.updatedAt
            ? fDateTime(tag.updatedAt, 'DD MMM YYYY h:mm A')
            : '-',
        },
      ],
    },
  ];

  return (
    <EntityDetailsLayout
      heading="Tag Details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Tag', href: paths.admin.tag.list },
        { name: displayName },
      ]}
      editHref={paths.admin.tag.edit(tag?.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        title: displayName,
        subtitle: tag.createdAt
          ? `Created ${fDateTime(tag.createdAt, 'DD MMM YYYY h:mm A')}`
          : undefined,
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}
