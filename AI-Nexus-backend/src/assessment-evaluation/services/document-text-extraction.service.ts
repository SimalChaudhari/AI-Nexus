import { Injectable, Logger } from '@nestjs/common';
import { extname } from 'path';

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

    if (ext === '.txt' || mimeType === 'text/plain') {
      const text = String(buffer.toString('utf8') || '').trim();
      return this.buildResult(fileName, mimeType, text, maxChars);
    }

    this.logger.warn(`Unsupported document type for extraction: ${fileName} (${mimeType})`);
    return { fileName, mimeType, text: '', couldRead: false };
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
    if (mimeType === 'text/plain') return '.txt';
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
