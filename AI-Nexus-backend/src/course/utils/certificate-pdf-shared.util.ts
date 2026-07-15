import { existsSync } from 'fs';
import { join } from 'path';

export type CertificatePdfTranscriptSection = {
  sectionId?: string;
  sectionTitle?: string;
  isCompleted?: boolean;
  completedAt?: string | null;
};

export type CertificatePdfTranscriptModule = {
  moduleId?: string;
  moduleTitle?: string;
  courseTitle?: string;
  pillarIndex?: number | null;
  completedSections?: number;
  totalSections?: number;
  isModuleComplete?: boolean;
  cpeHours?: number | null;
  sections?: CertificatePdfTranscriptSection[];
};

export type CertificatePdfPillarCpe = {
  pillarIndex: number;
  earnedCpeHours: number;
};

export type BuildCertificatePdfInput = {
  certificateNo: string;
  learnerName: string;
  courseTitle: string;
  completedAt: Date | string;
  earnedCpeHours?: number | null;
  allocatedCpeHours?: number | null;
  /** Programme pillar CPE breakdown (Pillar 1 / 2 / 3). */
  pillarCpeHours?: CertificatePdfPillarCpe[];
  logoUrl?: string | null;
  transcript?: CertificatePdfTranscriptModule[];
  issuerName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
};

export const CERT_COLORS = {
  border: '#1A365D',
  text: '#333333',
  muted: '#777777',
  nameGold: '#C5A059',
  line: '#B5B5B5',
  headerBlue: '#003366',
  white: '#FFFFFF',
};

export const CERT_BRAND = {
  iscaRed: '#E31C23',
  iscaBlue: '#003B70',
  srGreen: '#6B9B2D',
  srText: '#4A4A4A',
  divider: '#9AA0A6',
};

export const CERT_CONTACT = {
  orgName: 'INSTITUTE OF SINGAPORE CHARTERED ACCOUNTANTS',
  orgLines: [
    'INSTITUTE OF',
    'SINGAPORE',
    'CHARTERED',
    'ACCOUNTANTS',
  ] as const,
  address1: '60 Cecil Street, ISCA House',
  address2: 'Singapore 049709',
  tel: 'Tel: 65 6749 8060',
  web: 'isca.org.sg',
};

export function formatCompletedDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Date + time for transcript completion columns (e.g. 13 Jul 2026, 3:42 PM). */
export function formatCompletedDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = formatCompletedDate(date);
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return day ? `${day}, ${time}` : '';
}

export function formatCpeNumber(hours?: number | null): string {
  if (hours == null || hours === undefined) return '—';
  const value = Number(hours);
  if (!Number.isFinite(value) || value < 0) return '—';
  // Half-hour steps display as 0.0 / 0.5 / 1.0 / 1.5 …
  return `${value.toFixed(1)} h`;
}

export function resolveFontPath(fileName: string): string | null {
  const candidates = [
    join(process.cwd(), 'assets', 'fonts', fileName),
    join(process.cwd(), 'public', 'certificate', 'fonts', fileName),
  ];
  return candidates.find((path) => existsSync(path)) || null;
}

export function resolveCertificateMarkPath(): string | null {
  const candidates = [
    join(process.cwd(), 'public', 'certificate', 'certificate.png'),
    join(process.cwd(), 'public', 'uploads', 'certificate', 'certificate.png'),
  ];
  return candidates.find((path) => existsSync(path)) || null;
}

export function tryRegisterFont(doc: PDFKit.PDFDocument, name: string, fileName: string) {
  const path = resolveFontPath(fileName);
  if (!path) return;
  try {
    doc.registerFont(name, path);
  } catch {
    // keep built-in fallback
  }
}

export function registerCertificateFonts(doc: PDFKit.PDFDocument) {
  tryRegisterFont(doc, 'CertSerif', 'times.ttf');
  tryRegisterFont(doc, 'CertSerif-Bold', 'timesbd.ttf');
  tryRegisterFont(doc, 'CertScript', 'script.ttf');
  tryRegisterFont(doc, 'CertScript', 'segoesc.ttf');
  tryRegisterFont(doc, 'CertSans', 'arial.ttf');
  tryRegisterFont(doc, 'CertSans-Bold', 'arialbd.ttf');
}

export function fontOrFallback(
  doc: PDFKit.PDFDocument,
  preferred: string,
  fallback: string,
): string {
  try {
    doc.font(preferred);
    return preferred;
  } catch {
    doc.font(fallback);
    return fallback;
  }
}

export function flattenTranscriptModules(
  transcript: CertificatePdfTranscriptModule[] = [],
): Array<{
  title: string;
  courseTitle: string;
  pillarIndex: number | null;
  completedAt: string;
  cpeHours: string;
  isCourseHeader?: boolean;
}> {
  const modules = transcript.filter(
    (module) => module?.isModuleComplete || (module?.completedSections || 0) > 0,
  );

  type ModuleRow = {
    title: string;
    courseTitle: string;
    pillarIndex: number | null;
    completedAt: string;
    cpeHours: string;
    completedAtMs: number | null;
  };

  type Group = {
    key: string;
    headerTitle: string;
    courseTitle: string;
    pillarIndex: number | null;
    modules: ModuleRow[];
  };

  const groups: Group[] = [];
  const groupByKey = new Map<string, Group>();

  modules.forEach((module) => {
    const courseTitle = String(module.courseTitle || '').trim();
    const pillarIndex =
      module.pillarIndex != null && Number(module.pillarIndex) > 0
        ? Number(module.pillarIndex)
        : null;
    const key = pillarIndex
      ? `pillar-${pillarIndex}`
      : `course-${courseTitle || 'default'}`;

    if (!groupByKey.has(key)) {
      const headerTitle = pillarIndex
        ? `Pillar ${pillarIndex}${courseTitle ? ` — ${courseTitle}` : ''}`
        : courseTitle || 'Course';
      const group: Group = {
        key,
        headerTitle,
        courseTitle,
        pillarIndex,
        modules: [],
      };
      groupByKey.set(key, group);
      groups.push(group);
    }

    const sectionDates = (module.sections || [])
      .filter((section) => section.isCompleted && section.completedAt)
      .map((section) => new Date(String(section.completedAt)).getTime())
      .filter((value) => Number.isFinite(value));
    const latestMs =
      sectionDates.length > 0 ? Math.max(...sectionDates) : null;

    groupByKey.get(key)!.modules.push({
      title: module.moduleTitle || 'Module',
      courseTitle,
      pillarIndex,
      completedAt: formatCompletedDateTime(
        latestMs != null ? new Date(latestMs) : null,
      ),
      completedAtMs: latestMs,
      cpeHours: formatCpeNumber(module.cpeHours),
    });
  });

  const rows: Array<{
    title: string;
    courseTitle: string;
    pillarIndex: number | null;
    completedAt: string;
    cpeHours: string;
    isCourseHeader?: boolean;
  }> = [];

  groups.forEach((group) => {
    const courseDateMs = group.modules
      .map((row) => row.completedAtMs)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const courseCompletedAt =
      courseDateMs.length > 0
        ? formatCompletedDateTime(new Date(Math.max(...courseDateMs)))
        : '';

    if (group.courseTitle || group.pillarIndex) {
      rows.push({
        title: group.headerTitle,
        courseTitle: group.courseTitle,
        pillarIndex: group.pillarIndex,
        completedAt: courseCompletedAt,
        cpeHours: '',
        isCourseHeader: true,
      });
    }

    group.modules.forEach((row) => {
      rows.push({
        title: row.title,
        courseTitle: row.courseTitle,
        pillarIndex: row.pillarIndex,
        completedAt: row.completedAt,
        cpeHours: row.cpeHours,
      });
    });
  });

  return rows;
}
