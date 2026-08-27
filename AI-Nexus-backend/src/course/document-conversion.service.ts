import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { tmpdir } from 'os';
import { join, basename, extname } from 'path';
import { promises as fs } from 'fs';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { randomBytes } from 'crypto';

const execFile = promisify(execFileCb);

const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'odt',
  'odp',
  'ods',
  'txt',
  'rtf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'tif',
  'tiff',
  'bmp',
]);

@Injectable()
export class DocumentConversionService {
  private async writeTempFile(file: Express.Multer.File): Promise<string> {
    const mime = (file.mimetype || '').toLowerCase();
    const rawExt = (file.originalname.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const mimeExt = mime.startsWith('image/') ? mime.split('/')[1]?.replace('jpeg', 'jpg') : '';
    const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : ALLOWED_EXTENSIONS.has(mimeExt) ? mimeExt : '';
    if (!ext) {
      throw new BadRequestException('Unsupported file type');
    }
    const name = `${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
    const fullPath = join(tmpdir(), name);
    await fs.writeFile(fullPath, file.buffer);
    return fullPath;
  }

  async convertToImages(file: Express.Multer.File): Promise<string[]> {
    const mime = (file.mimetype || '').toLowerCase();

    if (mime.startsWith('image/')) {
      const imgPath = await this.writeTempFile(file);
      return [imgPath];
    }

    const srcPath = await this.writeTempFile(file);
    const baseName = basename(srcPath, extname(srcPath));
    const pdfPath = join(tmpdir(), `${baseName}.pdf`);

    try {
      await execFile(
        'soffice',
        ['--headless', '--convert-to', 'pdf', '--outdir', tmpdir(), srcPath],
        { windowsHide: true, timeout: 120_000 },
      );

      const imgPattern = join(tmpdir(), `${baseName}-%03d.png`);
      await execFile(
        'convert',
        ['-density', '150', pdfPath, '-quality', '90', imgPattern],
        { windowsHide: true, timeout: 120_000 },
      );

      const files = await fs.readdir(tmpdir());
      const images = files
        .filter((name) => name.startsWith(`${baseName}-`) && name.endsWith('.png'))
        .map((name) => join(tmpdir(), name));

      if (!images.length) {
        throw new Error('No images generated from document');
      }

      return images;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to convert document to images');
    } finally {
      await fs.unlink(srcPath).catch(() => {});
      await fs.unlink(pdfPath).catch(() => {});
    }
  }
}
