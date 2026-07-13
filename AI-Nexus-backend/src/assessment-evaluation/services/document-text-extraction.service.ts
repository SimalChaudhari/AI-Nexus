import { Injectable, Logger } from '@nestjs/common';
import { extname } from 'path';

import { isZipBuffer, listReadableZipEntries } from '../../course/zip-entry.util';

export type ExtractedDocument = {
  fileName: string;
  mimeType: string;
  text: string;
  couldRead: boolean;
};

@Injectable()
export class DocumentTextExtractionService {
  private readonly logger = new Logger(DocumentTextExtractionService.name);

  async extractFromBuffer(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    maxChars = 50000,
  ): Promise<ExtractedDocument> {
    const ext = this.getExtension(fileName, mimeType);

    if (isZipBuffer(fileName, mimeType) || ext === '.zip') {
      return this.extractZipText(buffer, fileName, mimeType, maxChars);
    }

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const text = await this.extractPdfText(buffer);
      return this.buildResult(fileName, mimeType, text, maxChars);
    }

    if (ext === '.docx' || mimeType.includes('wordprocessingml')) {
      const text = await this.extractDocxText(buffer);
      return this.buildResult(fileName, mimeType, text, maxChars);
    }

    if (ext === '.doc' || mimeType === 'application/msword') {
      const text = await this.extractDocText(buffer);
      return this.buildResult(fileName, mimeType, text, maxChars);
    }

    if (
      ext === '.xlsx' ||
      ext === '.xlsm' ||
      ext === '.xls' ||
      mimeType.includes('spreadsheetml') ||
      mimeType.includes('ms-excel')
    ) {
      const text = await this.extractXlsxText(buffer);
      return this.buildResult(fileName, mimeType, text, maxChars);
    }

    if (ext === '.txt' || mimeType === 'text/plain') {
      const text = String(buffer.toString('utf8') || '').trim();
      return this.buildResult(fileName, mimeType, text, maxChars);
    }

    this.logger.warn(`Unsupported document type for extraction: ${fileName} (${mimeType})`);
    return { fileName, mimeType, text: '', couldRead: false };
  }

  private async extractZipText(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    maxChars: number,
  ): Promise<ExtractedDocument> {
    try {
      const entries = listReadableZipEntries(buffer);
      if (!entries.length) {
        return { fileName, mimeType, text: '', couldRead: false };
      }
      const chunks: string[] = [];
      for (const entry of entries) {
        // Skip images for blueprint text extraction (no OCR here)
        if (/^image\//i.test(entry.mimeType)) continue;
        const inner = await this.extractFromBuffer(
          entry.buffer,
          entry.fileName,
          entry.mimeType,
          Math.max(4000, Math.floor(maxChars / Math.max(entries.length, 1))),
        );
        if (inner.couldRead && inner.text.trim()) {
          chunks.push(`--- ${entry.fileName} ---\n${inner.text}`);
        }
      }
      return this.buildResult(fileName, mimeType, chunks.join('\n\n'), maxChars);
    } catch (error) {
      this.logger.warn(
        `ZIP extraction failed for ${fileName}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return { fileName, mimeType, text: '', couldRead: false };
    }
  }

  private async extractXlsxText(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const xml2js = require('xml2js') as {
        parseStringPromise: (xml: string) => Promise<unknown>;
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const AdmZip = require('adm-zip') as new (buf: Buffer) => {
        getEntries: () => Array<{ entryName: string; getData: () => Buffer }>;
      };
      const zip = new AdmZip(buffer);
      const shared: string[] = [];
      const sharedEntry = zip
        .getEntries()
        .find((e) => e.entryName === 'xl/sharedStrings.xml');
      if (sharedEntry) {
        const sharedXml = sharedEntry.getData().toString('utf8');
        const sharedParsed = (await xml2js.parseStringPromise(sharedXml)) as {
          sst?: { si?: Array<{ t?: string[]; r?: Array<{ t?: string[] }> }> };
        };
        for (const si of sharedParsed?.sst?.si || []) {
          if (si.t?.[0]) shared.push(String(si.t[0]));
          else if (si.r?.length) {
            shared.push(si.r.map((r) => String(r.t?.[0] || '')).join(''));
          }
        }
      }
      const sheetTexts: string[] = [];
      for (const entry of zip.getEntries()) {
        if (!/^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.entryName)) continue;
        const xml = entry.getData().toString('utf8');
        const parsed = (await xml2js.parseStringPromise(xml)) as {
          worksheet?: {
            sheetData?: Array<{
              row?: Array<{ c?: Array<{ $?: { t?: string }; v?: string[] }> }>;
            }>;
          };
        };
        const rows = parsed?.worksheet?.sheetData?.[0]?.row || [];
        for (const row of rows) {
          const cells = (row.c || [])
            .map((c) => {
              const value = String(c.v?.[0] || '');
              if (c.$?.t === 's') {
                const idx = Number(value);
                return Number.isFinite(idx) ? shared[idx] || '' : '';
              }
              return value;
            })
            .filter(Boolean);
          if (cells.length) sheetTexts.push(cells.join(' | '));
        }
      }
      return sheetTexts.join('\n').trim();
    } catch (error) {
      this.logger.warn(
        `XLSX extraction failed: ${error instanceof Error ? error.message : error}`,
      );
      return '';
    }
  }

  private buildResult(
    fileName: string,
    mimeType: string,
    text: string,
    maxChars: number,
  ): ExtractedDocument {
    const normalized = this.normalizeText(text, maxChars);
    return {
      fileName,
      mimeType,
      text: normalized,
      couldRead: normalized.length > 0,
    };
  }

  private normalizeText(text: string, maxChars: number): string {
    const value = String(text || '').replace(/\r\n/g, '\n').trim();
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars)}\n…[truncated]`;
  }

  private getExtension(fileName: string, mimeType: string): string {
    const fromName = extname(String(fileName || '')).toLowerCase();
    if (fromName) return fromName;
    if (mimeType === 'application/pdf') return '.pdf';
    if (mimeType.includes('wordprocessingml')) return '.docx';
    if (mimeType === 'application/msword') return '.doc';
    if (mimeType.includes('spreadsheetml')) return '.xlsx';
    if (mimeType.includes('ms-excel')) return '.xls';
    if (mimeType === 'text/plain') return '.txt';
    if (/zip/i.test(mimeType)) return '.zip';
    return '';
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse') as (data: Buffer) => Promise<{ text?: string }>;
      const result = await pdfParse(buffer);
      return String(result?.text || '').trim();
    } catch (error) {
      this.logger.warn(
        `PDF extraction failed: ${error instanceof Error ? error.message : error}`,
      );
      return '';
    }
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const mammoth = require('mammoth') as {
        extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
      };
      const { value } = await mammoth.extractRawText({ buffer });
      return String(value || '').trim();
    } catch (error) {
      this.logger.warn(
        `DOCX extraction failed: ${error instanceof Error ? error.message : error}`,
      );
      return '';
    }
  }

  private async extractDocText(buffer: Buffer): Promise<string> {
    const fs = await import('fs/promises');
    const os = await import('os');
    const path = await import('path');
    const tmp = path.join(
      os.tmpdir(),
      `assessment-doc-${Date.now()}-${Math.random().toString(36).slice(2)}.doc`,
    );
    await fs.writeFile(tmp, buffer);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const WordExtractor = require('word-extractor') as new () => {
        extract: (p: string) => Promise<{ getBody: () => string }>;
      };
      const extractor = new WordExtractor();
      const document = await extractor.extract(tmp);
      return String(document.getBody() || '').trim();
    } catch (error) {
      this.logger.warn(
        `DOC extraction failed: ${error instanceof Error ? error.message : error}`,
      );
      return '';
    } finally {
      await fs.unlink(tmp).catch(() => undefined);
    }
  }
}
