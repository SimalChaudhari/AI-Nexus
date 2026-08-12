import { USER_STATUS_OPTIONS } from 'src/_mock';
import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const USER_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;
export const USER_LIST_FILTER_DEFAULTS = { name: '', status: 'all' };
export const USER_LIST_QUERY_MAP = {
  name: (value) => value || undefined,
  status: (value) => (value !== 'all' ? String(value).toLowerCase() : undefined),
};

export const USER_LIST_STATUS_OPTIONS = [{ value: 'all', label: 'All' }, ...USER_STATUS_OPTIONS];

export const USER_PROGRESS_FILTER_OPTIONS = [
  { value: 'all', label: 'All progress' },
  {
    value: 'pillars_current',
    label: 'All pillars (current)',
    shortDescription: 'Learners who meet today’s programme completion rules.',
    description:
      'Shows users who completed the current programme requirements: Pillar 1 fully done, plus the required Pillar 2 progress (one qualifying module with quiz/assessment).',
    icon: 'solar:flag-bold',
    color: 'info',
  },
  {
    value: 'badge_certificate',
    label: 'Badge & certificate',
    shortDescription: 'Learners who already earned both credentials.',
    description:
      'Shows users with an active badge and certificate on record (not blocked or deleted). Useful for credential audits and completion reporting.',
    icon: 'solar:medal-ribbons-star-bold',
    color: 'warning',
  },
  {
    value: 'pillars_100',
    label: 'All pillars 100%',
    shortDescription: 'Learners who finished every pillar completely.',
    description:
      'Shows users who fully completed all pillars at 100% — videos plus quiz/assessment requirements for each pillar in the programme.',
    icon: 'solar:cup-star-bold',
    color: 'success',
  },
];

export const USER_EXPORT_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'firstname', label: 'First name' },
  { key: 'lastname', label: 'Last name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'contactNumber', label: 'Contact number' },
  { key: 'company', label: 'Company' },
  { key: 'companyCode', label: 'Company code' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'authProvider', label: 'OAuth / Auth' },
  { key: 'isVerified', label: 'Email verified' },
  { key: 'feeWaiverJobVerified', label: 'Job / HR verified' },
  { key: 'persona', label: 'Persona' },
  { key: 'financeRole', label: 'Finance role' },
  { key: 'createdAt', label: 'Created at' },
  { key: 'lastLoginAt', label: 'Last login' },
  { key: 'hasBadgeCertificate', label: 'Badge & certificate' },
  { key: 'certificateNo', label: 'Certificate no' },
  { key: 'pillarsCurrent', label: 'Pillars current complete' },
  { key: 'pillars100', label: 'All pillars 100%' },
  { key: 'pillar1Percent', label: 'Pillar 1 %' },
  { key: 'pillar2Percent', label: 'Pillar 2 %' },
  { key: 'pillar3Percent', label: 'Pillar 3 %' },
];

export const USER_EXPORT_DEFAULT_FIELDS = [
  'name',
  'firstname',
  'lastname',
  'email',
];

export const USER_LIST_TABLE_HEAD = [
  { id: 'name', label: 'Name', width: 240 },
  { id: 'authProvider', label: 'OAuth', width: 110 },
  { id: 'isVerified', label: 'Email verified', width: 130 },
  { id: 'feeWaiverJobVerified', label: 'Job / HR', width: 150 },
  { id: 'status', label: 'Status', width: 100 },
  { id: 'createdAt', label: 'Created', width: 180 },
  { id: 'action', label: 'Action', width: 88 },
];
