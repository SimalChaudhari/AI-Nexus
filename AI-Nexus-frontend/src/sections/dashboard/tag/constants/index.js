import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const TAG_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;

export const TAG_LIST_FILTER_DEFAULTS = {
  name: '',
};

export const TAG_LIST_QUERY_MAP = {
  name: (value) => value?.trim() || undefined,
};

export const TAG_LIST_TABLE_HEAD = [
  { id: 'title', label: 'Title' },
  { id: 'action', label: 'Action', width: 88 },
];
