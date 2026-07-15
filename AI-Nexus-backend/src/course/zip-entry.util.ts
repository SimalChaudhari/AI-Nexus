import { extname } from 'path';

export type ZipEntryPayload = {
  fileName: string;
  buffer: Buffer;
  mimeType: string;
};

const MAX_ZIP_ENTRIES = 40;
const MAX_ENTRY_BYTES = 25 * 1024 * 1024;

const SKIP_ENTRY =
  /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/i;

const READABLE_ENTRY_EXT =
  /\.(png|jpe?g|gif|webp|bmp|pdf|doc|docx|xls|xlsx|xlsm|pptx|txt)$/i;

function guessMimeFromName(fileName: string): string {
  const ext = extname(String(fileName || '')).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.bmp':
      return 'image/bmp';
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xlsm':
      return 'application/vnd.ms-excel.sheet.macroEnabled.12';
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.txt':
      return 'text/plain';
    case '.zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

export function isZipBuffer(fileName: string, mimeType?: string): boolean {
  const name = String(fileName || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  return /\.zip$/i.test(name) || /zip|x-zip-compressed/i.test(mime);
}

/** Flatten one level of ZIP entries into readable payloads (skips nested ZIPs). */
export function listReadableZipEntries(buffer: Buffer): ZipEntryPayload[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const AdmZip = require('adm-zip') as new (buf: Buffer) => {
    getEntries: () => Array<{
      isDirectory: boolean;
      entryName: string;
      header?: { size?: number };
      getData: () => Buffer;
    }>;
  };

  const zip = new AdmZip(buffer);
  const out: ZipEntryPayload[] = [];

  for (const entry of zip.getEntries()) {
    if (out.length >= MAX_ZIP_ENTRIES) break;
    if (entry.isDirectory) continue;
    const entryName = String(entry.entryName || '');
    if (SKIP_ENTRY.test(entryName)) continue;

    const baseName = entryName.split(/[/\\]/).pop() || entryName;
    if (!READABLE_ENTRY_EXT.test(baseName)) continue;
    if (/\.zip$/i.test(baseName)) continue; // no nested zips

    const size = Number(entry.header?.size || 0);
    if (size > MAX_ENTRY_BYTES) continue;

    let data: Buffer;
    try {
      data = entry.getData();
    } catch {
      continue;
    }
    if (!data?.length || data.length > MAX_ENTRY_BYTES) continue;

    out.push({
      fileName: baseName,
      buffer: data,
      mimeType: guessMimeFromName(baseName),
    });
  }

  return out;
}
