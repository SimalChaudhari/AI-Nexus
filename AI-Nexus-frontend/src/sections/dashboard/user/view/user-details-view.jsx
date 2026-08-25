import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useTabs } from 'src/hooks/use-tabs';

import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { Iconify } from 'src/components/iconify';
import { EntityDetailsLayout } from 'src/components/entity-details-layout';

import { buildSalesforceProfileDetailRows } from 'src/components/user-salesforce-profile-fields';
import { getJobRoleAuditStatus, UserFeeWaiverAuditPanel } from './user-fee-waiver-audit-panel';
import { UserTrackingPanel } from './user-tracking-panel';
import { UserCertificatesPanel } from './user-certificates-panel';

// ----------------------------------------------------------------------

const DETAIL_TABS = [
  {
    value: 'profile',
    label: 'Profile',
    icon: <Iconify icon="solar:user-id-bold" width={20} />,
  },
  {
    value: 'tracking',
    label: 'Tracking',
    icon: <Iconify icon="solar:graph-up-bold" width={20} />,
  },
  {
    value: 'certificates',
    label: 'Certificates',
    icon: <Iconify icon="solar:diploma-verified-bold" width={20} />,
  },
];

// ----------------------------------------------------------------------

export function UserDetailsView({
  user,
  loading,
  error,
  onRefresh,
  listHref = paths.admin.user.list,
  listLabel = 'Users',
  heading = 'User details',
  showEdit = true,
}) {
  const tabs = useTabs('profile');

  const fullName = useMemo(() => {
    if (!user) return '-';
    return user.name || `${user?.firstname || ''} ${user?.lastname || ''}`.trim() || '-';
  }, [user]);

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
              href={listHref}
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
  const matriculationId = String(snapshot.matriculationId || '').trim();
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
    ...(matriculationId
      ? [{ label: 'Matriculation ID', value: matriculationId }]
      : []),
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

  const isProfile = tabs.value === 'profile';
  const isTracking = tabs.value === 'tracking';
  const isCertificates = tabs.value === 'certificates';

  return (
    <EntityDetailsLayout
      heading={heading}
      links={[
        { name: 'Dashboard', href: paths.dashboard.root },
        { name: listLabel, href: listHref },
        { name: fullName },
      ]}
      editHref={showEdit ? paths.admin.user.edit(user?.id) : undefined}
      header={{
        backgroundImage: '/assets/profilebg.jpg',
        avatarText: initials,
        avatarSrc: user.avatarUrl || undefined,
        title: fullName,
        subtitle: user.email || '-',
        chips: headerChips,
      }}
      belowHeader={
        <Card sx={{ px: { xs: 1, sm: 2 } }}>
          <Tabs value={tabs.value} onChange={tabs.onChange}>
            {DETAIL_TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Card>
      }
      sections={isProfile ? sections : []}
      content={
        isTracking ? (
          <Box>
            <UserTrackingPanel userId={user.id} />
          </Box>
        ) : isCertificates ? (
          <Box>
            <UserCertificatesPanel userId={user.id} />
          </Box>
        ) : null
      }
      footer={isProfile ? <UserFeeWaiverAuditPanel user={user} onRefresh={onRefresh} /> : null}
    />
  );
}
