// ----------------------------------------------------------------------
// CA vs Experienced Professional membership application pathways
// ----------------------------------------------------------------------


export const MEMBERSHIP_APPLICATION_PATHWAY = {
  CA: 'ca',
  EXPERIENCED: 'experienced',
};

export const MEMBERSHIP_APPLICATION_PATHWAY_KEY = 'membershipApplicationPathway';

export const RECORD_TYPE_EXPERIENCED_APPLICATION = 'Member_Application';

export const EXPERIENCED_MEMBER_TYPE_LABELS = {
  academic: 'ISCA Member (Academic)',
  business: 'ISCA Member (Business)',
  'public-sector': 'ISCA Member (Public Sector)',
};

const TAB_DEFINITIONS = {
  application: { id: 'application', label: 'Application', icon: 'solar:document-add-bold' },
  personal: { id: 'personal', label: 'Personal', icon: 'solar:user-bold' },
  'work-experience': {
    id: 'work-experience',
    label: 'Work Experience',
    icon: 'solar:case-minimalistic-bold',
  },
  qualification: {
    id: 'qualification',
    label: 'Qualification',
    icon: 'solar:diploma-verified-bold',
  },
  'character-reference': {
    id: 'character-reference',
    label: 'Character Reference',
    icon: 'solar:users-group-two-rounded-bold',
  },
  declaration: { id: 'declaration', label: 'Declaration', icon: 'solar:document-text-bold' },
  'document-upload': {
    id: 'document-upload',
    label: 'Document Upload',
    icon: 'solar:upload-bold',
  },
  'residential-declaration': {
    id: 'residential-declaration',
    label: 'Residential Declaration',
    icon: 'solar:home-2-bold',
  },
  billing: { id: 'billing', label: 'Billing', icon: 'solar:wallet-money-bold' },
};

const CA_TAB_IDS = [
  'application',
  'personal',
  'work-experience',
  'qualification',
  'character-reference',
  'declaration',
  'document-upload',
  'residential-declaration',
  'billing',
];

/** Experienced Professional — no character reference; CA pathway uses ATO + OPB. */
const EXPERIENCED_TAB_IDS = [
  'application',
  'personal',
  'work-experience',
  'qualification',
  'declaration',
  'document-upload',
  'residential-declaration',
  'billing',
];

export function normalizeMembershipApplicationPathway(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === MEMBERSHIP_APPLICATION_PATHWAY.EXPERIENCED) {
    return MEMBERSHIP_APPLICATION_PATHWAY.EXPERIENCED;
  }
  return MEMBERSHIP_APPLICATION_PATHWAY.CA;
}

export function isExperiencedMembershipApplicationPathway(pathway) {
  return normalizeMembershipApplicationPathway(pathway) === MEMBERSHIP_APPLICATION_PATHWAY.EXPERIENCED;
}

export function getMembershipApplicationTabs(pathway) {
  const normalized = normalizeMembershipApplicationPathway(pathway);
  const tabIds =
    normalized === MEMBERSHIP_APPLICATION_PATHWAY.EXPERIENCED ? EXPERIENCED_TAB_IDS : CA_TAB_IDS;
  return tabIds.map((id) => TAB_DEFINITIONS[id]).filter(Boolean);
}

export function getMembershipApplicationDraftKey(pathway) {
  return isExperiencedMembershipApplicationPathway(pathway)
    ? 'membershipApplicationFormDraft_experienced'
    : 'membershipApplicationFormDraft_ca';
}

export function getMembershipApplicationPageSubtitle(pathway) {
  if (isExperiencedMembershipApplicationPathway(pathway)) {
    return 'Experienced Professional pathway — complete each section and submit before continuing.';
  }
  return 'Chartered accountant recognition pathway — complete each section and submit before continuing.';
}

export function getExperiencedMemberTypeLabel(memberType) {
  return EXPERIENCED_MEMBER_TYPE_LABELS[memberType] || memberType || '';
}

export function readMembershipApplicationPathway() {
  if (typeof window === 'undefined') return MEMBERSHIP_APPLICATION_PATHWAY.CA;
  try {
    const fromSession = sessionStorage.getItem(MEMBERSHIP_APPLICATION_PATHWAY_KEY);
    if (fromSession) return normalizeMembershipApplicationPathway(fromSession);
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('pathway') || params.get('applicationPathway');
    if (fromQuery) return normalizeMembershipApplicationPathway(fromQuery);
  } catch {
    // ignore
  }
  return MEMBERSHIP_APPLICATION_PATHWAY.CA;
}

export function persistMembershipApplicationPathway(pathway) {
  const normalized = normalizeMembershipApplicationPathway(pathway);
  try {
    sessionStorage.setItem(MEMBERSHIP_APPLICATION_PATHWAY_KEY, normalized);
  } catch {
    // ignore
  }
  return normalized;
}

export function clearMembershipApplicationPathway() {
  try {
    sessionStorage.removeItem(MEMBERSHIP_APPLICATION_PATHWAY_KEY);
  } catch {
    // ignore
  }
}

/** Remove saved form draft from localStorage — call only after successful login. */
export function clearMembershipApplicationDraft(pathway) {
  try {
    localStorage.removeItem(getMembershipApplicationDraftKey(pathway));
  } catch {
    // ignore
  }
}
