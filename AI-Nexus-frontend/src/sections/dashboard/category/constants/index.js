import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const CATEGORY_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;

export const CATEGORY_LIST_FILTER_DEFAULTS = {
  name: '',
};

export const CATEGORY_LIST_QUERY_MAP = {
  name: (value) => value?.trim() || undefined,
};

export const CATEGORY_LIST_TABLE_HEAD = [
  { id: 'title', label: 'Title' },
  { id: 'slug', label: 'Slug', width: 200 },
  { id: 'status', label: 'Status', width: 120 },
  { id: 'action', label: 'Action', width: 88 },
];
