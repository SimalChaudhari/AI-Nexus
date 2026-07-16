import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const AI_FORUM_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;

export const AI_FORUM_LIST_FILTER_DEFAULTS = {
  name: '',
};

export const AI_FORUM_LIST_QUERY_MAP = {
  name: (value) => value?.trim() || undefined,
};

export const AI_FORUM_LIST_TABLE_HEAD = [
  { id: 'title', label: 'Title' },
  { id: 'viewCount', label: 'Views', width: 120 },
  { id: 'action', label: 'Action', width: 88 },
];
