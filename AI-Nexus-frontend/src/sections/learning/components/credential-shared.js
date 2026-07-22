import {
  DEFAULT_DIGITAL_BADGE_IMAGE,
  DEFAULT_DIGITAL_BADGE_ISSUER,
  getDigitalBadgeImage,
  getDigitalBadgeIssuer,
} from 'src/utils/digital-badge';

/** @deprecated Prefer getDigitalBadgeImage() — kept for static fallbacks. */
export const BADGE_IMAGE = DEFAULT_DIGITAL_BADGE_IMAGE;
/** @deprecated Prefer getDigitalBadgeIssuer() — kept for static fallbacks. */
export const CERTIFICATE_ISSUER = DEFAULT_DIGITAL_BADGE_ISSUER;

export { getDigitalBadgeImage, getDigitalBadgeIssuer };

function formatCredentialDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const formatted = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return formatted.replace(/\s(AM|PM)$/i, (_, meridiem) => ` ${meridiem.toLowerCase()}`);
}

export function formatIssuedOnDate(dateStr) {
  return formatCredentialDateTime(dateStr);
}

export function formatCompletedDate(dateStr) {
  return formatCredentialDateTime(dateStr);
}

export function formatCpeHoursLabel(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
  return `${text} CPE Hour${rounded === 1 ? '' : 's'}`;
}

export function resolveCertificateBadgeUrl() {
  const src = getDigitalBadgeImage();
  if (typeof window === 'undefined') return src;
  return new URL(src, window.location.origin).href;
}

export function mapCertificateRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id,
    courseId: row.courseId,
    programId: row.programId || null,
    courseTitle: row.courseTitle || 'Untitled Course',
    programTitle: row.programTitle || '',
    certificateNo: row.certificateNo || '',
    learnerName: row.learnerName || 'Learner',
    completedAt: row.completedAt ? formatCompletedDate(row.completedAt) : '—',
    issuedOn: formatIssuedOnDate(row.completedAt),
    earnedCpeHours: Number(row.earnedCpeHours) || 0,
    allocatedCpeHours: row.allocatedCpeHours != null ? Number(row.allocatedCpeHours) : null,
    watchedTime: row.watchedTime || '',
    transcript: Array.isArray(row.transcript) ? row.transcript : [],
    completedModules: Array.isArray(row.completedModules) ? row.completedModules : [],
    pdfUrl: row.pdfUrl || null,
  }));
}

export function formatPillarLabel(pillarIndex) {
  const value = Number(pillarIndex);
  if (!Number.isFinite(value) || value < 1) return null;
  return `Pillar ${value}`;
}

export function resolvePillarIndexFromCourse(course = {}) {
  const fromField = Number(course.programPillarIndex);
  if (Number.isFinite(fromField) && fromField >= 1 && fromField <= 3) return fromField;
  const level = String(course.level || '').trim().toLowerCase();
  if (level.includes('beginner') || level.includes('foundation') || level === 'basic') return 1;
  if (level.includes('intermediate') || level.includes('workflow')) return 2;
  if (level.includes('advanced') || level.includes('builder') || level === 'advance') return 3;
  return null;
}

export function getCompletedTranscriptModules(transcript = []) {
  return (Array.isArray(transcript) ? transcript : []).filter(
    (module) => module?.completedSections > 0 || module?.isModuleComplete
  );
}

export function getTranscriptModuleKey(module) {
  return `${module?.pillarIndex ?? 'course'}-${module?.courseId ?? ''}-${module?.moduleId ?? module?.moduleTitle ?? 'module'}`;
}

/** Group transcript modules by pillar (programme) or single course for clearer certificates. */
export function groupTranscriptByPillar(transcript = []) {
  const modules = getCompletedTranscriptModules(transcript);
  if (!modules.length) return [];

  const hasPillars = modules.some((module) => module?.pillarIndex != null && module.pillarIndex > 0);
  if (!hasPillars) {
    const courseTitle = modules[0]?.courseTitle || 'Course';
    return [
      {
        key: `course-${modules[0]?.courseId || 'default'}`,
        pillarIndex: null,
        pillarLabel: null,
        courseTitle,
        modules,
      },
    ];
  }

  const groups = new Map();
  modules.forEach((module) => {
    const pillarIndex = Number(module.pillarIndex) || 0;
    const key = String(pillarIndex);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        pillarIndex,
        pillarLabel: formatPillarLabel(pillarIndex),
        courseTitle: module.courseTitle || '',
        modules: [],
      });
    }
    groups.get(key).modules.push(module);
  });

  return [...groups.values()].sort((a, b) => (a.pillarIndex || 0) - (b.pillarIndex || 0));
}

export function formatTranscriptGroupTitle(group) {
  if (!group) return 'Course';
  if (group.pillarLabel && group.courseTitle) {
    return `${group.pillarLabel} · ${group.courseTitle}`;
  }
  return group.pillarLabel || group.courseTitle || 'Course';
}
