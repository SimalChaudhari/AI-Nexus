import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';

import { buildSalesforceProfileDetailRows } from 'src/components/user-salesforce-profile-fields';
import { getJobRoleAuditStatus, UserFeeWaiverAuditPanel } from './user-fee-waiver-audit-panel';

// ----------------------------------------------------------------------

export function UserDetailsView({ user, loading, error, onRefresh }) {
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

  const snapshot = user?.eligibilitySnapshot || {};
  const jobRoleStatus = getJobRoleAuditStatus(user);

  const headerChips = [
    { label: user.status || '-', color: statusColor },
    { label: user.role || 'User', color: 'info' },
    {
      label: `Job role: ${jobRoleStatus.label}`,
      color: jobRoleStatus.color,
    },
  ];

  const profileRows = [
    { label: 'First name', value: user.firstname || '-' },
    { label: 'Last name', value: user.lastname || '-' },
    { label: 'Username', value: user.username || '-' },
    { label: 'Email', value: user.email || '-' },
    { label: 'Contact number', value: user.contactNumber || user.phoneNumber || '—' },
    { label: 'Company code', value: user.companyCode || '—' },
    { label: 'Company (signup)', value: snapshot.companyName || '—' },
    {
      label: 'Job function',
      value: snapshot.jobFunctionLabel || snapshot.jobFunction || '—',
    },
    { label: 'Country of residence', value: snapshot.countryOfResidence || '—' },
  ];

  const sections = [
    {
      title: 'Personal information',
      icon: 'solar:user-id-bold',
      fullWidth: true,
      layout: 'grid',
      rows: profileRows,
    },
    {
      title: 'Account details',
      icon: 'solar:shield-check-bold',
      fullWidth: true,
      layout: 'grid',
      rows: [
        { label: 'User role', value: user.role || '-' },
        {
          label: 'Email verified',
          value: (
            <Chip
              label={user.isVerified ? 'Yes' : 'No'}
              color={user.isVerified ? 'success' : 'warning'}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          ),
        },
        {
          label: 'Account status',
          value: (
            <Chip
              label={user.status || '-'}
              color={statusColor}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          ),
        },
        {
          label: 'Registered on',
          value: user.createdAt ? new Date(user.createdAt).toLocaleString() : '—',
        },
        {
          label: 'Job role / HR verification',
          value: (
            <Chip
              label={jobRoleStatus.label}
              color={jobRoleStatus.color}
              size="small"
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          ),
        },
      ],
    },
    {
      title: 'ISCA eServices',
      icon: 'solar:cloud-bold-duotone',
      fullWidth: true,
      layout: 'grid',
      rows: buildSalesforceProfileDetailRows(user),
    },
  ];

  return (
    <EntityDetailsLayout
      heading="User details"
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: 'Users', href: paths.admin.user.list },
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
      footer={<UserFeeWaiverAuditPanel user={user} onRefresh={onRefresh} />}
    />
  );
}
