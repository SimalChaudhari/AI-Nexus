export const DEFAULT_FUNDING_ELIGIBILITY_CONTENT = {
  eyebrow: '',
  heading: '',
  items: [],
};

export const FUNDING_ELIGIBILITY_ITEMS_MAX = 6;

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function createFundingEligibilityCardId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeCardId(value) {
  const id = String(value ?? '').trim();
  return UUID_RE.test(id) ? id : '';
}

function normalizeCard(row) {
  return {
    id: normalizeCardId(row?.id),
    icon: String(row?.icon ?? '').trim() || 'solar:flag-bold-duotone',
    title: row?.title != null ? String(row.title) : '',
    description: row?.description != null ? String(row.description) : '',
  };
}

function collectLegacyItems(source) {
  const top = Array.isArray(source?.topRow) ? source.topRow : [];
  const bottom = Array.isArray(source?.bottomRow) ? source.bottomRow : [];
  return [...top, ...bottom];
}

export function normalizeFundingEligibilityContent(source) {
  if (!source || typeof source !== 'object') {
    return { ...DEFAULT_FUNDING_ELIGIBILITY_CONTENT, items: [] };
  }
  const rawItems = Array.isArray(source.items) ? source.items : collectLegacyItems(source);
  return {
    eyebrow: source.eyebrow != null ? String(source.eyebrow) : '',
    heading: source.heading != null ? String(source.heading) : '',
    items: rawItems.slice(0, FUNDING_ELIGIBILITY_ITEMS_MAX).map(normalizeCard),
  };
}

export function hasFundingEligibilityContent(content) {
  const c = content || {};
  if (String(c.eyebrow || '').trim()) return true;
  if (String(c.heading || '').trim()) return true;
  const items = Array.isArray(c.items) ? c.items : collectLegacyItems(c);
  return items.some((r) => String(r?.title || '').trim() || String(r?.description || '').trim());
}

export function resolveFundingEligibilityContent(source) {
  return normalizeFundingEligibilityContent(source);
}
