import { existsSync, readFileSync } from 'fs';
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
  /** Header logos left → center → right (img2, img1, img3). Only the center slot is drawn. */
  logoUrls?: (string | null | undefined)[];
  signatureUrl?: string | null;
  transcript?: CertificatePdfTranscriptModule[];
  titleLine1?: string;
  titleLine2Left?: string;
  titleLine2Right?: string;
  awardedToLabel?: string;
  sessionLabel?: string;
  /** Programme track shown above Cat 5 CPE hours: AI Proficient or AI Champion. */
  programmeLevel?: string;
  /** Programme name on the certificate (supports a second line). */
  programmeTitle?: string;
  cpeSectionLabel?: string;
  issuerName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  /** Transcript page programme title (supports new lines). */
  transcriptTitle?: string;
};

export const CERTIFICATE_TEMPLATE_DEFAULTS = {
  titleLine1: 'CERTIFICATE',
  titleLine2Left: 'OF',
  titleLine2Right: 'PARTICIPATION',
  awardedToLabel: 'has been awarded to',
  sessionLabel: 'for attending of the session',
  cpeSectionLabel: 'Cat 5 CPE Hours: {hours} Hour',
  signatoryName: 'Sign off: Fann Kor',
  signatoryTitle: 'CHIEF EXECUTIVE OFFICER',
  issuerName: 'ISCA ACADEMY PTE LTD',
  transcriptTitle: 'AI FLUENCY',
  programmeTitle: 'AI Fluency\n(AIxAccountancy)',
} as const;

/** Programme name stamped on certificate + transcript — same copy for AI Nexus and International. */
export const CERTIFICATE_PROGRAMME_DISPLAY_TITLE = CERTIFICATE_TEMPLATE_DEFAULTS.programmeTitle;
export const CERTIFICATE_PROGRAMME_LEVEL_FLUENCY = 'AI Proficient';
export const CERTIFICATE_PROGRAMME_LEVEL_CHAMPION = 'AI Champion';
/** Earned CPE below this is AI Proficient; 30 hours or more is AI Champion. */
export const CERTIFICATE_CHAMPION_CPE_HOURS_THRESHOLD = 30;

export function resolveCertificateProgrammeLevel(earnedCpeHours?: number | null): string {
  const hours = Number(earnedCpeHours);
  if (Number.isFinite(hours) && hours >= CERTIFICATE_CHAMPION_CPE_HOURS_THRESHOLD) {
    return CERTIFICATE_PROGRAMME_LEVEL_CHAMPION;
  }
  return CERTIFICATE_PROGRAMME_LEVEL_FLUENCY;
}

export type CertificateTemplatePdfSettings = Partial<
  Pick<
    BuildCertificatePdfInput,
    | 'titleLine1'
    | 'titleLine2Left'
    | 'titleLine2Right'
    | 'awardedToLabel'
    | 'sessionLabel'
    | 'cpeSectionLabel'
    | 'signatoryName'
    | 'signatoryTitle'
    | 'issuerName'
    | 'transcriptTitle'
    | 'programmeTitle'
    | 'logoUrls'
    | 'signatureUrl'
  >
>;

export function resolveUploadAssetPath(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/uploads/')) {
    const path = join(process.cwd(), 'public', trimmed);
    return existsSync(path) ? path : null;
  }
  return null;
}

function pickTemplateText(
  value: string | null | undefined,
  fallback: string,
): string {
  const cleaned = String(value ?? '').trim();
  return cleaned || fallback;
}

function normalizeProgrammeTitleKey(value: string | null | undefined): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const KNOWN_PROGRAMME_DISPLAY_TITLES = new Set(
  [
    CERTIFICATE_PROGRAMME_DISPLAY_TITLE,
    'AI Fluency\nAIX Accountancy',
    'AI Fluency AIX Accountancy',
    'AI Fluency\n(AI×Accountancy)',
    'AI Fluency (AI×Accountancy)',
    'AI Fluency (AIxAccountancy)',
  ].map((title) => normalizeProgrammeTitleKey(title)),
);

export function resolveCertificateProgrammeTitle(
  template?: Pick<CertificateTemplatePdfSettings, 'programmeTitle'> | null,
): string {
  return pickTemplateText(template?.programmeTitle, CERTIFICATE_PROGRAMME_DISPLAY_TITLE);
}

export function mergeCertificateTemplateIntoInput(
  input: BuildCertificatePdfInput,
  template?: CertificateTemplatePdfSettings | null,
): BuildCertificatePdfInput {
  const t = template || {};
  const logoUrls =
    Array.isArray(input.logoUrls) && input.logoUrls.some((u) => String(u || '').trim())
      ? input.logoUrls
      : Array.isArray(t.logoUrls)
        ? t.logoUrls
        : undefined;
  return {
    ...input,
    titleLine1: pickTemplateText(input.titleLine1 ?? t.titleLine1, CERTIFICATE_TEMPLATE_DEFAULTS.titleLine1),
    titleLine2Left: pickTemplateText(
      input.titleLine2Left ?? t.titleLine2Left,
      CERTIFICATE_TEMPLATE_DEFAULTS.titleLine2Left,
    ),
    titleLine2Right: pickTemplateText(
      input.titleLine2Right ?? t.titleLine2Right,
      CERTIFICATE_TEMPLATE_DEFAULTS.titleLine2Right,
    ),
    awardedToLabel: pickTemplateText(
      input.awardedToLabel ?? t.awardedToLabel,
      CERTIFICATE_TEMPLATE_DEFAULTS.awardedToLabel,
    ),
    sessionLabel: pickTemplateText(
      input.sessionLabel ?? t.sessionLabel,
      CERTIFICATE_TEMPLATE_DEFAULTS.sessionLabel,
    ),
    cpeSectionLabel: pickTemplateText(
      input.cpeSectionLabel ?? t.cpeSectionLabel,
      CERTIFICATE_TEMPLATE_DEFAULTS.cpeSectionLabel,
    ),
    signatoryName: pickTemplateText(
      input.signatoryName ?? t.signatoryName,
      CERTIFICATE_TEMPLATE_DEFAULTS.signatoryName,
    ),
    signatoryTitle: pickTemplateText(
      input.signatoryTitle ?? t.signatoryTitle,
      CERTIFICATE_TEMPLATE_DEFAULTS.signatoryTitle,
    ),
    issuerName: pickTemplateText(input.issuerName ?? t.issuerName, CERTIFICATE_TEMPLATE_DEFAULTS.issuerName),
    transcriptTitle: pickTemplateText(
      input.transcriptTitle ?? t.transcriptTitle,
      CERTIFICATE_TEMPLATE_DEFAULTS.transcriptTitle,
    ),
    programmeTitle: pickTemplateText(
      input.programmeTitle ?? t.programmeTitle,
      CERTIFICATE_TEMPLATE_DEFAULTS.programmeTitle,
    ),
    courseTitle: KNOWN_PROGRAMME_DISPLAY_TITLES.has(normalizeProgrammeTitleKey(input.courseTitle))
      ? pickTemplateText(t.programmeTitle, CERTIFICATE_PROGRAMME_DISPLAY_TITLE)
      : input.courseTitle,
    logoUrls,
    signatureUrl:
      input.signatureUrl != null && String(input.signatureUrl).trim()
        ? input.signatureUrl
        : t.signatureUrl ?? input.signatureUrl ?? null,
  };
}

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

/** Center header logo slot (left=0, center=1, right=2). */
export const CERTIFICATE_CENTER_LOGO_INDEX = 1;
export const CERTIFICATE_CENTER_LOGO_FILE = 'img1.png';

export function formatActualCpeHours(hours?: number | null): string {
  const value = Number(hours);
  if (!Number.isFinite(value) || value < 0) return '0';
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export function resolveCertificateCpeHours(input: {
  earnedCpeHours?: number | null;
  pillarCpeHours?: CertificatePdfPillarCpe[];
}): number {
  if (input.earnedCpeHours != null && Number.isFinite(Number(input.earnedCpeHours))) {
    return Math.max(0, Number(input.earnedCpeHours));
  }
  if (Array.isArray(input.pillarCpeHours) && input.pillarCpeHours.length > 0) {
    return input.pillarCpeHours.reduce(
      (sum, pillar) => sum + Math.max(0, Number(pillar.earnedCpeHours) || 0),
      0,
    );
  }
  return 0;
}

/** Heading like "Cat 5 CPE Hours: 8 Hour". `{hours}` is replaced with earned CPE. */
export function formatCpeSectionHeading(label: string | null | undefined, hours?: number | null): string {
  const hoursText = formatActualCpeHours(hours);
  const template = String(label || '').trim();
  if (template.includes('{hours}')) {
    return template.replace(/\{hours\}/g, hoursText);
  }
  return `Cat 5 CPE Hours: ${hoursText} Hour`;
}

export function resolveFontPath(fileName: string): string | null {
  // Prefer module-relative paths so Nest `dist/` and different CWDs still resolve.
  const candidates = [
    join(__dirname, '..', '..', '..', 'assets', 'fonts', fileName),
    join(__dirname, '..', '..', '..', '..', 'assets', 'fonts', fileName),
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

export function resolvePublicCertificateAsset(...parts: string[]): string | null {
  const path = join(process.cwd(), 'public', 'certificate', ...parts);
  return existsSync(path) ? path : null;
}

/** Read PNG/JPEG pixel size (pdfkit openImage is untyped). */
export function readRasterImageSize(
  filePath: string,
): { width: number; height: number } | null {
  try {
    const buf = readFileSync(filePath);
    if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < buf.length) {
        if (buf[offset] !== 0xff) break;
        const marker = buf[offset + 1];
        const size = buf.readUInt16BE(offset + 2);
        if (marker === 0xc0 || marker === 0xc2) {
          return {
            height: buf.readUInt16BE(offset + 5),
            width: buf.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + size;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Centered header logo only (img1 / centre slot). Left and right logos are not drawn.
 */
export function drawTripleLogoHeader(
  doc: PDFKit.PDFDocument,
  top = 52,
  logoHeight = 38,
  logoUrls?: (string | null | undefined)[],
): number {
  const pageWidth = doc.page.width;
  const customPath = resolveUploadAssetPath(logoUrls?.[CERTIFICATE_CENTER_LOGO_INDEX]);
  const path = customPath || resolvePublicCertificateAsset(CERTIFICATE_CENTER_LOGO_FILE);
  if (!path) {
    return top + logoHeight + 26;
  }

  const size = readRasterImageSize(path);
  const width = size?.height ? (size.width / size.height) * logoHeight : logoHeight;
  const x = (pageWidth - width) / 2;

  try {
    doc.image(path, x, top, { height: logoHeight });
  } catch {
    // skip
  }

  return top + logoHeight + 28;
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
  // Design fonts: Crimson Pro (title), Amithen (learner name), Open Sans (body)
  tryRegisterFont(doc, 'CertSerif', 'CrimsonPro-Regular.ttf');
  tryRegisterFont(doc, 'CertSerif-Bold', 'CrimsonPro-Bold.ttf');
  tryRegisterFont(doc, 'CertScript', 'Amithen.ttf');
  tryRegisterFont(doc, 'CertSans', 'OpenSans-Regular.ttf');
  tryRegisterFont(doc, 'CertSans-Bold', 'OpenSans-Bold.ttf');
  tryRegisterFont(doc, 'CertSans-Semi', 'OpenSans-Semibold.ttf');
  // Vertical "Certificate" — Pinyon Script (bundled assets/fonts, SIL OFL)
  tryRegisterFont(doc, 'CertVerticalScript', 'PinyonScript-Regular.ttf');
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
    const courseTitle = String(module.courseTitle || '')
      .replace(/\s+/g, ' ')
      .trim();
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
