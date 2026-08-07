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

function isNonMemberValue(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ');
  return normalized === 'non member';
}

/**
 * Member class display (based only on salesforceMemberClass / nexus memberClass):
 * - Non-member (e.g. "Non member") → "AI Fluency Learner".
 * - Otherwise → show the member class as-is (e.g. CA).
 */
function resolveMemberClassDisplay(memberClass) {
  const value = String(memberClass || '').trim();

  if (!value || isNonMemberValue(value)) {
    return { text: 'AI Fluency Learner', color: 'info' };
  }

  return { text: value, color: memberClassLabelColor(value) };
}

function booleanLabelColor(value) {
  if (value === true) return 'success';
  if (value === false) return 'default';
  return 'warning';
}

function BooleanValue({ value }) {
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

function readRawField(raw, keys = []) {
  if (!raw || typeof raw !== 'object') return undefined;
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
      return raw[key];
    }
  }
  return undefined;
}

function toDisplayText(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return formatNullableBoolean(value);
  return String(value).trim();
}

/**
 * Merge dedicated Salesforce columns with `/services/apexrest/userinfonexus` raw payload.
 * Corporate sync may nest nexus under `salesforceUserInfoRaw.nexus`.
 */
export function resolveSalesforceNexusProfile(user) {
  if (!user || typeof user !== 'object') {
    return {};
  }

  const rawRoot =
    user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
      ? user.salesforceUserInfoRaw
      : null;
  const nested =
    rawRoot?.nexus && typeof rawRoot.nexus === 'object'
      ? rawRoot.nexus
      : null;
  const raw = nested || rawRoot || {};
  const snapshot =
    user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
      ? user.eligibilitySnapshot
      : {};

  const pick = (...keys) => {
    for (const key of keys) {
      const columnValue = user[key];
      if (columnValue !== undefined && columnValue !== null && String(columnValue).trim() !== '') {
        return columnValue;
      }
    }
    const fromSnapshot = readRawField(snapshot, keys);
    if (fromSnapshot !== undefined) return fromSnapshot;
    return readRawField(raw, keys);
  };

  const firstName = String(
    pick('firstname', 'firstName') || readRawField(raw, ['firstName', 'firstname']) || ''
  ).trim();
  const lastName = String(
    pick('lastname', 'lastName') || readRawField(raw, ['lastName', 'lastname']) || ''
  ).trim();

  return {
    username: String(
      pick('salesforceUsername', 'username') || readRawField(raw, ['username']) || ''
    ).trim(),
    email: String(pick('email') || readRawField(raw, ['email']) || '').trim(),
    firstName,
    lastName,
    salutation: String(pick('salutation') || '').trim(),
    nameAsPerId: String(pick('nameAsPerId', 'name_as_per_id') || '').trim(),
    department: String(pick('department') || '').trim(),
    phone: String(
      pick('contactNumber', 'phoneNumber', 'mobile', 'phone') ||
        readRawField(raw, ['mobile', 'Mobile', 'phone', 'Phone', 'mobilePhone']) ||
        ''
    ).trim(),
    nricNumber: String(
      pick('nricFin', 'nricNumber') ||
        readRawField(raw, ['NRIC_Number', 'nric_Number', 'nricNumber', 'nricFin']) ||
        ''
    ).trim(),
    idType: String(pick('idType', 'id_type') || readRawField(raw, ['idType', 'id_type', 'IDType']) || '').trim(),
    jobFunction: String(
      pick('jobFunctionLabel', 'jobFunction') || readRawField(raw, ['jobFunction', 'job_function']) || ''
    ).trim(),
    company: String(
      pick('companyName', 'company') || readRawField(raw, ['company', 'companyName']) || ''
    ).trim(),
    countryOfResidence: String(
      pick('countryOfResidence') ||
        readRawField(raw, ['countryOfResidence', 'country_of_residence']) ||
        ''
    ).trim(),
    yearsOfExperience: (() => {
      const value = readRawField(raw, [
        'noOfYearOfRelevantWorkExperience',
        'yearsOfRelevantWorkExperience',
        'yearsOfExperience',
      ]);
      if (value === undefined || value === null || value === '') return '';
      return String(value);
    })(),
    memberClass: String(
      pick('salesforceMemberClass') || readRawField(raw, ['memberClass']) || ''
    ).trim(),
    accountType: String(
      pick('salesforceAccountType') || readRawField(raw, ['accountType']) || ''
    ).trim(),
    accountId: String(
      pick('salesforceAccountId') || readRawField(raw, ['accountID', 'accountId']) || ''
    ).trim(),
    isSCAQCandidate:
      typeof user.isSCAQCandidate === 'boolean'
        ? user.isSCAQCandidate
        : typeof raw.isSCAQCandidate === 'boolean'
          ? raw.isSCAQCandidate
          : null,
    isAssociateMember:
      typeof user.isAssociateMember === 'boolean'
        ? user.isAssociateMember
        : typeof raw.isAssociateMember === 'boolean'
          ? raw.isAssociateMember
          : null,
    isAINexusUser:
      typeof raw.isAINexusUser === 'boolean'
        ? raw.isAINexusUser
        : typeof raw.isAiNexusUser === 'boolean'
          ? raw.isAiNexusUser
          : null,
    isAuthorisedSubmit:
      typeof raw.isAuthorisedSubmit === 'boolean' ? raw.isAuthorisedSubmit : null,
    isPaid:
      typeof raw.Is_paid === 'boolean'
        ? raw.Is_paid
        : typeof raw.isPaid === 'boolean'
          ? raw.isPaid
          : null,
    syncedAt: user.salesforceSyncedAt || null,
  };
}

export function hasSalesforceProfileData(user) {
  if (!user || typeof user !== 'object') return false;
  const profile = resolveSalesforceNexusProfile(user);

  return Boolean(
    profile.accountId
    || profile.accountType
    || profile.memberClass
    || profile.username
    || profile.nricNumber
    || profile.jobFunction
    || profile.company
    || profile.isSCAQCandidate === true
    || profile.isSCAQCandidate === false
    || profile.isAssociateMember === true
    || profile.isAssociateMember === false
    || profile.isAINexusUser === true
    || profile.isAINexusUser === false
    || profile.isPaid === true
    || profile.isPaid === false
  );
}

function ProfileField({ label, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}
      >
        {label}
      </Typography>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function TextValue({ value, monospace = false }) {
  const text = toDisplayText(value) || '—';
  return (
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        wordBreak: 'break-word',
        ...(monospace
          ? { fontFamily: 'monospace', fontSize: '0.8125rem', letterSpacing: 0.2 }
          : {}),
      }}
    >
      {text}
    </Typography>
  );
}

function MembershipDetailsTable({ user }) {
  const theme = useTheme();
  const profile = resolveSalesforceNexusProfile(user);
  const memberClassDisplay = resolveMemberClassDisplay(profile.memberClass);

  const rows = [
    { key: 'username', label: 'eServices username', value: <TextValue value={profile.username} /> },
    { key: 'email', label: 'eServices email', value: <TextValue value={profile.email} /> },
    { key: 'salutation', label: 'Salutation', value: <TextValue value={profile.salutation} /> },
    { key: 'firstName', label: 'First name', value: <TextValue value={profile.firstName} /> },
    { key: 'lastName', label: 'Last name', value: <TextValue value={profile.lastName} /> },
    {
      key: 'nameAsPerId',
      label: 'Name as per ID',
      value: <TextValue value={profile.nameAsPerId} />,
    },
    {
      key: 'nric',
      label: 'NRIC number',
      value: <TextValue value={profile.nricNumber} monospace />,
    },
    { key: 'idType', label: 'ID type', value: <TextValue value={profile.idType} /> },
    { key: 'company', label: 'Company', value: <TextValue value={profile.company} /> },
    { key: 'department', label: 'Department', value: <TextValue value={profile.department} /> },
    { key: 'jobFunction', label: 'Job function', value: <TextValue value={profile.jobFunction} /> },
    {
      key: 'years',
      label: 'Years of experience',
      value: <TextValue value={profile.yearsOfExperience} />,
    },
    {
      key: 'country',
      label: 'Country of residence',
      value: <TextValue value={profile.countryOfResidence} />,
    },
    {
      key: 'memberClass',
      label: 'Member class',
      value: (
        <Label color={memberClassDisplay.color} variant="soft" sx={{ fontWeight: 800 }}>
          {memberClassDisplay.text}
        </Label>
      ),
    },
    {
      key: 'accountType',
      label: 'Account type',
      value: <TextValue value={profile.accountType} />,
    },
    {
      key: 'accountId',
      label: 'Salesforce account ID',
      value: <TextValue value={profile.accountId} monospace />,
    },
    {
      key: 'isPaid',
      label: 'Paid (Is_paid)',
      value: <BooleanValue value={profile.isPaid} />,
    },
    {
      key: 'isAINexusUser',
      label: 'AI Nexus user',
      value: <BooleanValue value={profile.isAINexusUser} />,
    },
    {
      key: 'scaq',
      label: 'SCAQ candidate',
      value: <BooleanValue value={profile.isSCAQCandidate} />,
    },
    {
      key: 'associate',
      label: 'Associate member',
      value: <BooleanValue value={profile.isAssociateMember} />,
    },
    {
      key: 'authorised',
      label: 'Authorised submit',
      value: <BooleanValue value={profile.isAuthorisedSubmit} />,
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
        p: { xs: 2, sm: 2.5 },
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(3, minmax(0, 1fr))',
        },
        gap: { xs: 2, sm: 2.25 },
      }}
    >
      {rows.map((row) => (
        <ProfileField key={row.key} label={row.label}>
          {row.value}
        </ProfileField>
      ))}
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
  const profile = resolveSalesforceNexusProfile(user);

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
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Synced from userinfonexus
              {profile.syncedAt
                ? ` · ${new Date(profile.syncedAt).toLocaleString('en-GB')}`
                : ''}
            </Typography>
          </Box>
        </Stack>

        <SalesforceAccountIdHeader accountId={profile.accountId} />
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

  const profile = resolveSalesforceNexusProfile(user);
  const memberClassDisplay = resolveMemberClassDisplay(profile.memberClass);

  return [
    { label: 'eServices username', value: profile.username || '—' },
    { label: 'eServices email', value: profile.email || '—' },
    { label: 'Salutation', value: profile.salutation || '—' },
    { label: 'First name', value: profile.firstName || '—' },
    { label: 'Last name', value: profile.lastName || '—' },
    { label: 'Name as per ID', value: profile.nameAsPerId || '—' },
    {
      label: 'NRIC number',
      value: profile.nricNumber ? (
        <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {profile.nricNumber}
        </Typography>
      ) : (
        '—'
      ),
    },
    { label: 'ID type', value: profile.idType || '—' },
    { label: 'Company', value: profile.company || '—' },
    { label: 'Department', value: profile.department || '—' },
    { label: 'Job function', value: profile.jobFunction || '—' },
    { label: 'Years of experience', value: profile.yearsOfExperience || '—' },
    { label: 'Country of residence', value: profile.countryOfResidence || '—' },
    {
      label: 'Member class',
      value: (
        <Label color={memberClassDisplay.color} variant="soft" sx={{ fontWeight: 800 }}>
          {memberClassDisplay.text}
        </Label>
      ),
    },
    { label: 'Account type', value: profile.accountType || '—' },
    {
      label: 'Salesforce account ID',
      value: profile.accountId ? (
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
          {profile.accountId}
        </Typography>
      ) : (
        '—'
      ),
    },
    { label: 'Paid (Is_paid)', value: <BooleanValue value={profile.isPaid} /> },
    { label: 'AI Nexus user', value: <BooleanValue value={profile.isAINexusUser} /> },
    { label: 'SCAQ candidate', value: <BooleanValue value={profile.isSCAQCandidate} /> },
    { label: 'Associate member', value: <BooleanValue value={profile.isAssociateMember} /> },
    { label: 'Authorised submit', value: <BooleanValue value={profile.isAuthorisedSubmit} /> },
  ];
}
