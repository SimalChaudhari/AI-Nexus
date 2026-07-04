import { USER_STATUS_OPTIONS } from 'src/_mock';
import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const USER_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;
export const USER_LIST_FILTER_DEFAULTS = { name: '', status: 'all' };
export const USER_LIST_QUERY_MAP = {
  name: (value) => value || undefined,
  status: (value) => (value !== 'all' ? String(value).toLowerCase() : undefined),
};

export const USER_LIST_STATUS_OPTIONS = [{ value: 'all', label: 'All' }, ...USER_STATUS_OPTIONS];

export const USER_LIST_TABLE_HEAD = [
  { id: 'name', label: 'Name' },
  { id: 'username', label: 'Username', width: 160 },
  { id: 'companyCode', label: 'Company Code', width: 150 },
  { id: 'contactNumber', label: 'Contact', width: 140 },
  // { id: 'company', label: 'Company', width: 220 },
  { id: 'authProvider', label: 'Auth provider', width: 140 },
  { id: 'createdAt', label: 'Created', width: 120 },
  { id: 'isVerified', label: 'Email verified', width: 130 },
  { id: 'feeWaiverJobVerified', label: 'Job / HR', width: 150 },
  { id: 'status', label: 'Status', width: 100 },
  { id: 'action', label: 'Action', width: 88 },
];

