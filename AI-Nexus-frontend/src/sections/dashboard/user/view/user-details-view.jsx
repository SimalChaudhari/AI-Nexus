import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';


import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';

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

  const fullName = user.name || `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || '-';
  const statusColor =
    (user.status === 'Active' && 'success') ||
    (user.status === 'Banned' && 'error') ||
    'warning';

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  const headerChips = [
    {
      label: user.status || '-',
      color: statusColor,
    },
    {
      label: user.role || 'User',
      color: 'info',
    },
  ];

  const sections = [
    {
      title: 'Personal Information',
      icon: 'solar:user-id-bold',
      rows: [
        { label: 'First Name', value: user.firstname || '-' },
        { label: 'Last Name', value: user.lastname || '-' },
        { label: 'Username', value: user.username || '-' },
        { label: 'Email', value: user.email || '-' },
      ],
    },
    {
      title: 'Account Details',
      icon: 'solar:shield-check-bold',
      rows: [
        { label: 'User Role', value: user.role || '-' },
        {
          label: 'Status',
          value: (
            <Chip
              label={user.status || '-'}
              color={statusColor}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          ),
        },
      ],
    },
  ];

  return (
    <EntityDetailsLayout
      heading="User Details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'User', href: paths.admin.user.list },
        { name: fullName },
      ]}
      editHref={paths.admin.user.edit(user?.id)}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        avatarSrc: user.avatarUrl || undefined,
        title: fullName,
        subtitle: user.email || '-',
        chips: headerChips,
      }}
      sections={sections}
    />
  );
}
