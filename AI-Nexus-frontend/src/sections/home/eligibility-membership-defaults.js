// ----------------------------------------------------------------------

export const ELIGIBILITY_MEMBERSHIP_QUESTIONS_MAX = 4;
export const ELIGIBILITY_MEMBERSHIP_BENEFITS_MAX = 4;

export const ELIGIBILITY_MEMBERSHIP_CTA_ELIGIBILITY = '#eligibility-check';

export const ELIGIBILITY_MEMBERSHIP_EXPLORE_URL =
  'https://isca.org.sg/membership/become-a-member';

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function createEligibilityMembershipItemId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeItemId(value) {
  const id = String(value ?? '').trim();
  return UUID_RE.test(id) ? id : '';
}

export const DEFAULT_ELIGIBILITY_MEMBERSHIP_CONTENT = {
  leftPanel: {
    heading: 'Am I Eligible?',
    subtitle: 'Find the right pathway for you.',
    heroImageUrl: '',
    questions: [
      {
        id: 'q-isca-member',
        icon: 'solar:user-bold-duotone',
        iconColor: 'blue',
        text: 'Are you an ISCA member?',
      },
      {
        id: 'q-student-professional',
        icon: 'solar:shield-user-bold-duotone',
        iconColor: 'red',
        text: 'Are you a student or professional?',
      },
      {
        id: 'q-experience',
        icon: 'solar:lightbulb-bolt-bold-duotone',
        iconColor: 'blue',
        text: 'Years of professional experience?',
      },
      {
        id: 'q-citizenship',
        icon: 'solar:flag-bold-duotone',
        iconColor: 'red',
        text: 'Are you a Singapore Citizen / PR?',
      },
    ],
    ctaLabel: 'Start Eligibility Check',
    ctaHref: ELIGIBILITY_MEMBERSHIP_CTA_ELIGIBILITY,
  },
  rightPanel: {
    eyebrow: 'Not an ISCA Member Yet?',
    heading: 'Unlock more with ISCA Membership',
    benefits: [
      {
        id: 'b-ai-programme',
        icon: 'solar:calendar-bold-duotone',
        label: 'Access to AI Fluency Programme',
      },
      {
        id: 'b-network',
        icon: 'solar:users-group-rounded-bold-duotone',
        label: 'Professional Network & Community',
      },
      {
        id: 'b-career',
        icon: 'solar:chart-2-bold-duotone',
        label: 'Career Advancement Support',
      },
      {
        id: 'b-insights',
        icon: 'solar:target-bold-duotone',
        label: 'Industry Insights & Events',
      },
    ],
    primaryCtaLabel: 'Explore Membership Options',
    primaryCtaHref: ELIGIBILITY_MEMBERSHIP_EXPLORE_URL,
    secondaryCtaLabel: 'Learn More',
    secondaryCtaHref: '',
  },
};

function normalizeIconColor(value) {
  const raw = String(value || '').trim().toLowerCase();
  return raw === 'red' ? 'red' : 'blue';
}

function normalizeQuestion(row) {
  return {
    id: normalizeItemId(row?.id) || createEligibilityMembershipItemId(),
    icon: String(row?.icon ?? '').trim() || 'solar:user-bold-duotone',
    iconColor: normalizeIconColor(row?.iconColor),
    text: row?.text != null ? String(row.text) : '',
  };
}

function normalizeBenefit(row) {
  return {
    id: normalizeItemId(row?.id) || createEligibilityMembershipItemId(),
    icon: String(row?.icon ?? '').trim() || 'solar:star-bold-duotone',
    label: row?.label != null ? String(row.label) : '',
  };
}

function normalizeLeftPanel(source) {
  const defaults = DEFAULT_ELIGIBILITY_MEMBERSHIP_CONTENT.leftPanel;
  const panel = source && typeof source === 'object' ? source : {};
  const rawQuestions = Array.isArray(panel.questions) ? panel.questions : defaults.questions;
  return {
    heading: panel.heading != null ? String(panel.heading) : defaults.heading,
    subtitle: panel.subtitle != null ? String(panel.subtitle) : defaults.subtitle,
    heroImageUrl: panel.heroImageUrl != null ? String(panel.heroImageUrl) : '',
    questions: rawQuestions
      .slice(0, ELIGIBILITY_MEMBERSHIP_QUESTIONS_MAX)
      .map(normalizeQuestion),
    ctaLabel: panel.ctaLabel != null ? String(panel.ctaLabel) : defaults.ctaLabel,
    ctaHref: panel.ctaHref != null ? String(panel.ctaHref) : defaults.ctaHref,
  };
}

function normalizeRightPanel(source) {
  const defaults = DEFAULT_ELIGIBILITY_MEMBERSHIP_CONTENT.rightPanel;
  const panel = source && typeof source === 'object' ? source : {};
  const rawBenefits = Array.isArray(panel.benefits) ? panel.benefits : defaults.benefits;
  return {
    eyebrow: panel.eyebrow != null ? String(panel.eyebrow) : defaults.eyebrow,
    heading: panel.heading != null ? String(panel.heading) : defaults.heading,
    benefits: rawBenefits
      .slice(0, ELIGIBILITY_MEMBERSHIP_BENEFITS_MAX)
      .map(normalizeBenefit),
    primaryCtaLabel:
      panel.primaryCtaLabel != null ? String(panel.primaryCtaLabel) : defaults.primaryCtaLabel,
    primaryCtaHref:
      panel.primaryCtaHref != null ? String(panel.primaryCtaHref) : defaults.primaryCtaHref,
    secondaryCtaLabel:
      panel.secondaryCtaLabel != null ? String(panel.secondaryCtaLabel) : defaults.secondaryCtaLabel,
    secondaryCtaHref:
      panel.secondaryCtaHref != null ? String(panel.secondaryCtaHref) : defaults.secondaryCtaHref,
  };
}

export function normalizeEligibilityMembershipContent(source) {
  if (!source || typeof source !== 'object') {
    return {
      leftPanel: normalizeLeftPanel(null),
      rightPanel: normalizeRightPanel(null),
    };
  }
  return {
    leftPanel: normalizeLeftPanel(source.leftPanel),
    rightPanel: normalizeRightPanel(source.rightPanel),
  };
}

export function hasEligibilityMembershipContent(content) {
  const c = normalizeEligibilityMembershipContent(content);
  const left = c.leftPanel || {};
  const right = c.rightPanel || {};
  if (String(left.heading || '').trim()) return true;
  if (String(left.subtitle || '').trim()) return true;
  if (String(left.heroImageUrl || '').trim()) return true;
  if (String(left.ctaLabel || '').trim()) return true;
  if (String(right.eyebrow || '').trim()) return true;
  if (String(right.heading || '').trim()) return true;
  if ((left.questions || []).some((q) => String(q?.text || '').trim())) return true;
  if ((right.benefits || []).some((b) => String(b?.label || '').trim())) return true;
  if (String(right.primaryCtaLabel || '').trim()) return true;
  if (String(right.secondaryCtaLabel || '').trim()) return true;
  return false;
}

export function resolveEligibilityMembershipContent(source) {
  const normalized = normalizeEligibilityMembershipContent(source);
  if (hasEligibilityMembershipContent(normalized)) {
    return normalized;
  }
  return normalizeEligibilityMembershipContent(null);
}

export function shouldOpenEligibilityModal(href) {
  const h = String(href || '').trim().toLowerCase();
  return !h || h === ELIGIBILITY_MEMBERSHIP_CTA_ELIGIBILITY || h === '#eligibility-check';
}

/** Resolve Explore Membership CTA — replaces legacy in-app membership application links. */
export function resolveMembershipExploreHref(href) {
  const trimmed = String(href || '').trim();
  if (!trimmed) return ELIGIBILITY_MEMBERSHIP_EXPLORE_URL;
  if (/\/auth\/membership\/application\/?$/i.test(trimmed)) {
    return ELIGIBILITY_MEMBERSHIP_EXPLORE_URL;
  }
  return trimmed;
}
