export const ENROL_OPTIONS_CARDS_MAX = 6;

export const DEFAULT_ENROL_OPTIONS_CONTENT = {
  heading: 'How would you like to enrol?',
  subtitle: 'Choose the option that best describes you.',
  comparePrompt: 'Not sure which option is right for you?',
  compareLinkLabel: 'Compare options',
  compareHref: '#eligibility-membership',
  cards: [
    {
      id: 'isca-member',
      title: "I'm an ISCA Member",
      description: 'Continue your AI learning journey with ISCA.',
      ctaLabel: 'Continue with ISCA',
      icon: 'solar:user-rounded-bold-duotone',
      accentColor: '#E32B24',
      action: 'isca',
      href: '',
    },
    {
      id: 'sg-citizen',
      title: "I'm a Singapore Citizen / PR (Non-Members)",
      description: "Check if you're eligible for our free fee waiver.",
      ctaLabel: 'Check Eligibility',
      icon: 'solar:shield-user-bold-duotone',
      accentColor: '#3D2A7A',
      action: 'eligibility',
      href: '',
    },
    {
      id: 'international',
      title: "I'm an International Participant",
      description: 'Enrol at our standard price.',
      ctaLabel: 'Register Now',
      icon: 'solar:global-bold-duotone',
      accentColor: '#3D2A7A',
      action: 'register',
      href: '',
    },
  ],
};

const UUID_RE = /^[0-9a-f-]{36}$/i;
const ENROL_ACTIONS = new Set(['isca', 'eligibility', 'register']);

export function createEnrolOptionCardId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeCardId(value, fallback = '') {
  const id = String(value ?? '').trim();
  if (UUID_RE.test(id) || id) return id;
  return fallback;
}

function normalizeAction(value, fallback = 'eligibility') {
  const action = String(value || '')
    .trim()
    .toLowerCase();
  return ENROL_ACTIONS.has(action) ? action : fallback;
}

function normalizeHexColor(value, fallback = '') {
  const raw = String(value || '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  return fallback;
}

function normalizeCard(row, index = 0) {
  const defaults = DEFAULT_ENROL_OPTIONS_CONTENT.cards[index] || DEFAULT_ENROL_OPTIONS_CONTENT.cards[0];
  return {
    id: normalizeCardId(row?.id, defaults?.id || createEnrolOptionCardId()),
    title: row?.title != null ? String(row.title) : '',
    description: row?.description != null ? String(row.description) : '',
    ctaLabel: row?.ctaLabel != null ? String(row.ctaLabel) : '',
    icon: String(row?.icon ?? '').trim() || defaults?.icon || 'solar:user-rounded-bold-duotone',
    accentColor: normalizeHexColor(row?.accentColor, defaults?.accentColor || '#3D2A7A'),
    action: normalizeAction(row?.action, defaults?.action || 'eligibility'),
    href: row?.href != null ? String(row.href) : '',
  };
}

export function normalizeEnrolOptionsContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      ...DEFAULT_ENROL_OPTIONS_CONTENT,
      cards: DEFAULT_ENROL_OPTIONS_CONTENT.cards.map((card, index) => normalizeCard(card, index)),
    };
  }

  const rawCards = Array.isArray(source.cards) ? source.cards : [];
  const cards =
    rawCards.length > 0
      ? rawCards.slice(0, ENROL_OPTIONS_CARDS_MAX).map((row, index) => normalizeCard(row, index))
      : DEFAULT_ENROL_OPTIONS_CONTENT.cards.map((card, index) => normalizeCard(card, index));

  return {
    heading:
      source.heading != null && String(source.heading).trim()
        ? String(source.heading)
        : DEFAULT_ENROL_OPTIONS_CONTENT.heading,
    subtitle:
      source.subtitle != null && String(source.subtitle).trim()
        ? String(source.subtitle)
        : DEFAULT_ENROL_OPTIONS_CONTENT.subtitle,
    comparePrompt:
      source.comparePrompt != null && String(source.comparePrompt).trim()
        ? String(source.comparePrompt)
        : DEFAULT_ENROL_OPTIONS_CONTENT.comparePrompt,
    compareLinkLabel:
      source.compareLinkLabel != null && String(source.compareLinkLabel).trim()
        ? String(source.compareLinkLabel)
        : DEFAULT_ENROL_OPTIONS_CONTENT.compareLinkLabel,
    compareHref:
      source.compareHref != null && String(source.compareHref).trim()
        ? String(source.compareHref)
        : DEFAULT_ENROL_OPTIONS_CONTENT.compareHref,
    cards,
  };
}

export function resolveEnrolOptionsContent(source) {
  return normalizeEnrolOptionsContent(source);
}

export function hasEnrolOptionsContent(content) {
  const c = content || {};
  if (String(c.heading || '').trim()) return true;
  if (String(c.subtitle || '').trim()) return true;
  const cards = Array.isArray(c.cards) ? c.cards : [];
  return cards.some(
    (row) =>
      String(row?.title || '').trim() ||
      String(row?.description || '').trim() ||
      String(row?.ctaLabel || '').trim()
  );
}
