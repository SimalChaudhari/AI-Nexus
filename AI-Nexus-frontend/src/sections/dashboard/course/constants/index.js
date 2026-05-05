import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const COURSE_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;

export const COURSE_LIST_FILTER_DEFAULTS = {
  name: '',
  level: '',
  type: '',
};

export const COURSE_LIST_QUERY_MAP = {
  name: (value) => value?.trim() || undefined,
  level: (value) => value || undefined,
  type: (value) => value || undefined,
};

export const COURSE_LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];

export const COURSE_LEVEL_LABELS = {
  Beginner: 'Beginner',
  Intermediate: 'Intermediate',
  Advanced: 'Advanced',
};

export const COURSE_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'free', label: 'AI Fluency' },
  { value: 'paid', label: 'Paid' },
];

export const COURSE_LIST_TABLE_HEAD = [
  { id: 'title', label: 'Course' },
  { id: 'level', label: 'Level', width: 140 },
  { id: 'category', label: 'Category', width: 180 },
  { id: 'type', label: 'Type', width: 120 },
  { id: 'isBundle', label: 'Bundle', width: 168 },
  { id: 'action', label: 'Action', width: 88 },
];
