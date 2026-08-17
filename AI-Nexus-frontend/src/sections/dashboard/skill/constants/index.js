import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const SKILL_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;

export const SKILL_LIST_FILTER_DEFAULTS = {
  name: '',
};

export const SKILL_LIST_QUERY_MAP = {
  name: (value) => value?.trim() || undefined,
};

export const SKILL_LIST_TABLE_HEAD = [
  { id: 'title', label: 'Skill' },
  { id: 'name', label: 'Name', width: 160 },
  { id: 'isActive', label: 'Status', width: 120 },
  { id: 'sortOrder', label: 'Order', width: 88 },
  { id: 'action', label: 'Action', width: 88 },
];
