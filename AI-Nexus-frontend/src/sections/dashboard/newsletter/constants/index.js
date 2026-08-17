import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const NEWSLETTER_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;

export const NEWSLETTER_LIST_FILTER_DEFAULTS = {
  name: '',
};

export const NEWSLETTER_LIST_QUERY_MAP = {
  name: (value) => value?.trim() || undefined,
};

export const NEWSLETTER_LIST_TABLE_HEAD = [
  { id: 'title', label: 'Newsletter' },
  { id: 'format', label: 'Format', width: 120 },
  { id: 'publishAt', label: 'Publish at', width: 200 },
  { id: 'isActive', label: 'Status', width: 140 },
  { id: 'sortOrder', label: 'Order', width: 88 },
  { id: 'action', label: 'Action', width: 88 },
];
