<<<<<<< HEAD
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
  // Prefer module-relative paths so Nest `dist/` and different CWDs still resolve.
  const candidates = [
    join(__dirname, '..', '..', '..', 'assets', 'fonts', fileName),
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
 * Centered header: img2 | img1 | img3 (ISCA | OCC | Charity Council) with thin dividers.
 * Same lockup on certificate page 1 and transcript.
 */
export function drawTripleLogoHeader(
  doc: PDFKit.PDFDocument,
  top = 52,
  logoHeight = 38,
): number {
  const pageWidth = doc.page.width;
  const gap = 4;
  const dividerGap = 4;
  const dividerH = Math.max(24, logoHeight - 6);

  const files = ['img2.png', 'img1.png', 'img3.png'];
  const present = files
    .map((file) => {
      const path = resolvePublicCertificateAsset(file);
      if (!path) return null;
      const size = readRasterImageSize(path);
      if (!size || size.height <= 0) return null;
      return { path, width: (size.width / size.height) * logoHeight };
    })
    .filter((item): item is { path: string; width: number } => item != null);

  if (present.length === 0) {
    return top + logoHeight + 26;
  }

  const logosWidth = present.reduce((sum, l) => sum + l.width, 0);
  const dividersWidth = Math.max(0, present.length - 1) * (dividerGap * 2 + 1);
  const totalWidth = logosWidth + gap * Math.max(0, present.length - 1) + dividersWidth;
  let x = (pageWidth - totalWidth) / 2;
  const logoY = top;

  present.forEach((logo, index) => {
    if (index > 0) {
      x += gap;
      const dx = x + dividerGap;
      const dy = logoY + (logoHeight - dividerH) / 2;
      doc
        .moveTo(dx, dy)
        .lineTo(dx, dy + dividerH)
        .strokeColor('#9AA0A6')
        .lineWidth(0.7)
        .stroke();
      x += dividerGap * 2 + 1;
    }

    try {
      doc.image(logo.path, x, logoY, { height: logoHeight });
    } catch {
      // skip
    }
    x += logo.width;
  });

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
=======
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
  // Prefer module-relative paths so Nest `dist/` and different CWDs still resolve.
  const candidates = [
    join(__dirname, '..', '..', '..', 'assets', 'fonts', fileName),
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
 * Centered header: img2 | img1 | img3 (ISCA | OCC | Charity Council) with thin dividers.
 * Same lockup on certificate page 1 and transcript.
 */
export function drawTripleLogoHeader(
  doc: PDFKit.PDFDocument,
  top = 52,
  logoHeight = 38,
): number {
  const pageWidth = doc.page.width;
  const gap = 4;
  const dividerGap = 4;
  const dividerH = Math.max(24, logoHeight - 6);

  const files = ['img2.png', 'img1.png', 'img3.png'];
  const present = files
    .map((file) => {
      const path = resolvePublicCertificateAsset(file);
      if (!path) return null;
      const size = readRasterImageSize(path);
      if (!size || size.height <= 0) return null;
      return { path, width: (size.width / size.height) * logoHeight };
    })
    .filter((item): item is { path: string; width: number } => item != null);

  if (present.length === 0) {
    return top + logoHeight + 26;
  }

  const logosWidth = present.reduce((sum, l) => sum + l.width, 0);
  const dividersWidth = Math.max(0, present.length - 1) * (dividerGap * 2 + 1);
  const totalWidth = logosWidth + gap * Math.max(0, present.length - 1) + dividersWidth;
  let x = (pageWidth - totalWidth) / 2;
  const logoY = top;

  present.forEach((logo, index) => {
    if (index > 0) {
      x += gap;
      const dx = x + dividerGap;
      const dy = logoY + (logoHeight - dividerH) / 2;
      doc
        .moveTo(dx, dy)
        .lineTo(dx, dy + dividerH)
        .strokeColor('#9AA0A6')
        .lineWidth(0.7)
        .stroke();
      x += dividerGap * 2 + 1;
    }

    try {
      doc.image(logo.path, x, logoY, { height: logoHeight });
    } catch {
      // skip
    }
    x += logo.width;
  });

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
>>>>>>> 77824e39b799c567de95e0752cc504d0a0a4c3d1
