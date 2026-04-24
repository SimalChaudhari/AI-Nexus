import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const LABEL_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;

export const LABEL_LIST_FILTER_DEFAULTS = {
  name: '',
};

export const LABEL_LIST_QUERY_MAP = {
  name: (value) => value?.trim() || undefined,
};

export const LABEL_LIST_TABLE_HEAD = [
  { id: 'name', label: 'Name' },
  { id: 'action', label: 'Action', width: 88 },
];
