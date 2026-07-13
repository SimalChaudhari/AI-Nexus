const fs = require('fs');
const path = 'src/course/utils/certificate-pdf.util.ts';
let s = fs.readFileSync(path, 'utf8');

const start = s.indexOf('function drawDoubleBorder');
const transcriptStart = s.indexOf('function drawTranscriptHeader');
const buildStart = s.indexOf('export async function buildCourseCertificatePdf');
if (start < 0 || transcriptStart < 0 || buildStart < 0) {
  console.error('markers', start, transcriptStart, buildStart);
  process.exit(1);
}
const middle = s.slice(start, transcriptStart);
const buildFn = s.slice(buildStart);

const header = `import PDFDocument from 'pdfkit';
import {
  BuildCertificatePdfInput,
  CERT_BRAND as BRAND,
  CERT_COLORS as COLORS,
  fontOrFallback,
  formatCompletedDate,
  registerCertificateFonts,
  resolveCertificateMarkPath,
} from './certificate-pdf-shared.util';
import { drawTranscriptPage } from './transcript-pdf.util';

export type {
  BuildCertificatePdfInput,
  CertificatePdfTranscriptModule,
  CertificatePdfTranscriptSection,
} from './certificate-pdf-shared.util';

`;

fs.writeFileSync(path, header + middle + buildFn);
console.log('ok', fs.statSync(path).size);
