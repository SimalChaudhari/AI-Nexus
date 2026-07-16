import { ADMIN_TABLE_DEFAULTS } from 'src/sections/dashboard/constants/admin-table-defaults';

export const PROMPT_LIST_DEFAULTS = ADMIN_TABLE_DEFAULTS;

/** “Prompts for …” screen: 10 items per page from the API. */
export const PROMPT_ITEMS_PAGE_DEFAULTS = {
  page: ADMIN_TABLE_DEFAULTS.page,
  rowsPerPage: 10,
};

export const PROMPT_LIST_FILTER_DEFAULTS = { name: '' };

export const PROMPT_LIST_QUERY_MAP = {
  name: (value) => value?.trim() || undefined,
};

/** Master table: all providers on one line per row; categories deduped by display name. */
export const PROMPT_CATEGORY_TABLE_HEAD = [
  { id: 'providers', label: 'Providers', width: 300 },
  { id: 'category', label: 'Category', minWidth: 280 },
];

/** Detail table: use case, prompt, and row actions (provider/category fixed by selection above). */
export const PROMPT_DETAIL_TABLE_HEAD = [
  { id: 'useCase', label: 'Use Case', width: 260 },
  { id: 'prompt', label: 'Prompt' },
  { id: 'action', label: 'Action', width: 88 },
];

/** Sort keys valid on catalog rows (detail headers + catalog ordering). */
export const PROMPT_ADMIN_ROW_SORT_IDS = new Set([
  'sectionOrder',
  'providers',
  ...PROMPT_DETAIL_TABLE_HEAD.filter((h) => h.id !== 'action').map((h) => h.id),
]);

export const PROMPT_PROVIDER_LABEL = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
};

/** Label `color` per provider (distinct soft tags in the table). */
export const PROMPT_PROVIDER_LABEL_COLOR = {
  chatgpt: 'success',
  claude: 'warning',
  gemini: 'info',
};
