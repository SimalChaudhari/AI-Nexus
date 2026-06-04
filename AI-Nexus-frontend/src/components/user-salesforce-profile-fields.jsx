import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { formatNullableBoolean } from 'src/utils/format-boolean';
import { isSalesforceCaMemberClass } from 'src/utils/membership-application-ca';

// ----------------------------------------------------------------------

function memberClassLabelColor(memberClass) {
  if (isSalesforceCaMemberClass(memberClass)) return 'success';
  const normalized = String(memberClass || '').trim().toLowerCase();
  if (normalized.includes('associate')) return 'info';
  if (normalized.includes('member')) return 'primary';
  return 'default';
}

function booleanLabelColor(value) {
  if (value === true) return 'success';
  if (value === false) return 'default';
  return 'warning';
}

function BooleanValue({ value }) {
  const theme = useTheme();
  const text = formatNullableBoolean(value);
  const isYes = value === true;
  const isNo = value === false;

  if (isYes || isNo) {
    return (
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Iconify
          icon={isYes ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
          width={18}
          sx={{ color: isYes ? 'success.main' : 'text.disabled' }}
        />
        <Typography variant="body2" sx={{ fontWeight: 700, color: isYes ? 'success.darker' : 'text.secondary' }}>
          {text}
        </Typography>
      </Stack>
    );
  }

  return (
    <Label color={booleanLabelColor(value)} variant="soft">
      {text}
    </Label>
  );
}

function InlineField({ label, children, index, total }) {
  const theme = useTheme();
  const line = `1px solid ${alpha(theme.palette.divider, 0.8)}`;
  const isLeftCol = index % 2 === 0;
  const isTopRow = index < 2;

  return (
    <Box
      sx={{
        flex: { md: '1 1 0' },
        minWidth: 0,
        px: { xs: 2, md: 2.5 },
        py: { xs: 1.75, md: 2 },
        borderRight: {
          xs: isLeftCol && index < total - 1 ? line : 'none',
          md: index < total - 1 ? line : 'none',
        },
        borderBottom: {
          xs: isTopRow ? line : 'none',
          md: 'none',
        },
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>{children}</Box>
    </Box>
  );
}

export function hasSalesforceProfileData(user) {
  if (!user || typeof user !== 'object') return false;

  return Boolean(
    user.salesforceAccountId
    || user.salesforceAccountType
    || user.salesforceMemberClass
    || user.isSCAQCandidate === true
    || user.isSCAQCandidate === false
    || user.isAssociateMember === true
    || user.isAssociateMember === false
  );
}

function MembershipDetailsTable({ user }) {
  const theme = useTheme();

  const rows = [
    {
      key: 'memberClass',
      label: 'Member class',
      value: user.salesforceMemberClass ? (
        <Label color={memberClassLabelColor(user.salesforceMemberClass)} variant="soft" sx={{ fontWeight: 800, fontSize: '0.8125rem', py: 0.75, px: 1.25 }}>
          {user.salesforceMemberClass}
        </Label>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          —
        </Typography>
      ),
    },
    {
      key: 'accountType',
      label: 'Account type',
      value: user.salesforceAccountType ? (
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {user.salesforceAccountType}
        </Typography>
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          —
        </Typography>
      ),
    },
    {
      key: 'scaq',
      label: 'SCAQ candidate',
      value: <BooleanValue value={user.isSCAQCandidate} />,
    },
    {
      key: 'associate',
      label: 'Associate member',
      value: <BooleanValue value={user.isAssociateMember} />,
    },
  ];

  return (
    <Box
      sx={{
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
        boxShadow: (t) =>
          t.palette.mode === 'dark' ? 'none' : `0 1px 3px ${alpha(theme.palette.grey[500], 0.1)}`,
      }}
    >
      <Box
        sx={{
          display: { xs: 'grid', md: 'flex' },
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'none' },
        }}
      >
        {rows.map((row, index) => (
          <InlineField key={row.key} label={row.label} index={index} total={rows.length}>
            {row.value}
          </InlineField>
        ))}
      </Box>
    </Box>
  );
}

function SalesforceAccountIdHeader({ accountId }) {
  if (!accountId) return null;

  return (
    <Box
      sx={{
        textAlign: { xs: 'left', sm: 'right' },
        maxWidth: { xs: 1, sm: 320 },
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
        Salesforce account ID
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mt: 0.25,
          fontFamily: 'monospace',
          fontSize: '0.8125rem',
          fontWeight: 600,
          letterSpacing: 0.2,
          wordBreak: 'break-all',
          lineHeight: 1.45,
        }}
      >
        {accountId}
      </Typography>
    </Box>
  );
}

function IscaEservicesPanel({ user }) {
  const theme = useTheme();
  const hasData = hasSalesforceProfileData(user);

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        p: { xs: 2.5, sm: 3 },
        bgcolor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.14 : 0.08),
        border: (t) => `1px solid ${alpha(t.palette.info.main, 0.22)}`,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ position: 'relative', mb: hasData ? 2.5 : 0 }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: alpha(theme.palette.info.main, 0.2),
            }}
          >
            <Iconify icon="solar:shield-check-bold-duotone" width={32} sx={{ color: 'info.main' }} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 1, color: 'info.dark' }}>
              ISCA eServices
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25, mt: 0.25 }}>
              Membership status
            </Typography>
          </Box>
        </Stack>

        <SalesforceAccountIdHeader accountId={user.salesforceAccountId} />
      </Stack>

      {!hasData ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{
            position: 'relative',
            p: 2,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.4 : 0.72),
            border: `1px dashed ${alpha(theme.palette.info.main, 0.35)}`,
          }}
        >
          <Iconify icon="solar:link-round-angle-bold" width={28} sx={{ color: 'info.main', flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              No membership data yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sign in with ISCA eServices to show your member class, account type, and related details on this profile.
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Box sx={{ position: 'relative' }}>
          <MembershipDetailsTable user={user} />
        </Box>
      )}
    </Box>
  );
}

/**
 * ISCA eServices membership block for profile pages.
 */
export function UserSalesforceProfileCard({ user, layout: _layout = 'wide', sx }) {
  return (
    <Box sx={sx}>
      <IscaEservicesPanel user={user} />
    </Box>
  );
}

/** @deprecated */
export function UserSalesforceProfileFields({ user }) {
  return <UserSalesforceProfileCard user={user} />;
}

/** Rows for admin EntityDetailsLayout */
export function buildSalesforceProfileDetailRows(user) {
  if (!hasSalesforceProfileData(user)) {
    return [{ label: 'Status', value: 'No eServices data synced' }];
  }

  return [
    {
      label: 'Member class',
      value: user.salesforceMemberClass ? (
        <Label color={memberClassLabelColor(user.salesforceMemberClass)} variant="soft" sx={{ fontWeight: 800 }}>
          {user.salesforceMemberClass}
        </Label>
      ) : (
        '—'
      ),
    },
    {
      label: 'Account type',
      value: user.salesforceAccountType ? (
        <Typography variant="subtitle2" component="span" sx={{ fontWeight: 700 }}>
          {user.salesforceAccountType}
        </Typography>
      ) : (
        '—'
      ),
    },
    {
      label: 'SCAQ candidate',
      value: <BooleanValue value={user.isSCAQCandidate} />,
    },
    {
      label: 'Associate member',
      value: <BooleanValue value={user.isAssociateMember} />,
    },
    {
      label: 'Salesforce account ID',
      value: user.salesforceAccountId ? (
        <Typography
          variant="body2"
          component="span"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          {user.salesforceAccountId}
        </Typography>
      ) : (
        '—'
      ),
    },
  ];
}
