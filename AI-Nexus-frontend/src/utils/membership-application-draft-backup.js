import { getMembershipApplicationDraftKey } from 'src/utils/membership-application-pathway';

// ----------------------------------------------------------------------

const LEGACY_DRAFT_KEY = 'membershipApplicationFormDraft';

function getBackupKey(pathway) {
  return `${getMembershipApplicationDraftKey(pathway)}_backup`;
}

export function backupMembershipApplicationDraft(draft, pathway) {
  if (typeof window === 'undefined' || !draft) return;
  try {
    sessionStorage.setItem(
      getBackupKey(pathway),
      JSON.stringify({ draft, savedAt: new Date().toISOString() })
    );
  } catch {
    // ignore quota errors
  }
}

export function readMembershipApplicationDraftBackup(pathway) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getBackupKey(pathway));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.draft || typeof parsed.draft !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMembershipApplicationDraftBackup(pathway) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(getBackupKey(pathway));
  } catch {
    // ignore
  }
}

function countSubmittedTabs(submittedTabs) {
  return Object.keys(submittedTabs || {}).filter((key) => Boolean(submittedTabs[key])).length;
}

function readLegacyDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/** Prefer the draft snapshot with the most completed tabs. */
export function mergeMembershipApplicationDraftSources(primary, pathway) {
  const backup = readMembershipApplicationDraftBackup(pathway);
  const legacy = readLegacyDraft();

  let merged = primary && typeof primary === 'object' ? { ...primary } : null;

  const candidates = [backup?.draft, legacy].filter(Boolean);
  candidates.forEach((candidate) => {
    if (!merged) {
      merged = { ...candidate };
      return;
    }
    const mergedCount = countSubmittedTabs(merged.submittedTabs);
    const candidateCount = countSubmittedTabs(candidate.submittedTabs);
    const base = candidateCount >= mergedCount ? candidate : merged;
    const overlay = candidateCount >= mergedCount ? merged : candidate;
    merged = {
      ...base,
      ...overlay,
      submittedTabs: {
        ...(candidate.submittedTabs || {}),
        ...(merged.submittedTabs || {}),
      },
      personal: {
        ...(base.personal || {}),
        ...(overlay.personal || {}),
      },
      billing: {
        ...(base.billing || {}),
        ...(overlay.billing || {}),
      },
    };
  });

  return merged;
}
