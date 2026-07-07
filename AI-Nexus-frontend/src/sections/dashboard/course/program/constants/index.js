import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const PROGRAM_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;
export const PROGRAM_LIST_FILTER_DEFAULTS = { name: '' };
export const PROGRAM_LIST_QUERY_MAP = { name: (value) => value?.trim() || undefined };

export const PROGRAM_LIST_TABLE_HEAD = [
  { id: 'title', label: 'Program' },
  { id: 'courses', label: 'Linked courses', width: 280 },
  { id: 'status', label: 'Status', width: 100 },
  { id: 'action', label: 'Action', width: 88 },
];
