import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { tmpdir } from 'os';
import { join, basename } from 'path';
import { promises as fs } from 'fs';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);

@Injectable()
export class DocumentConversionService {
  private async writeTempFile(file: Express.Multer.File): Promise<string> {
    const ext = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const fullPath = join(tmpdir(), name);
    await fs.writeFile(fullPath, file.buffer);
    return fullPath;
  }

  // Convert any supported document to an array of PNG image paths.
  async convertToImages(file: Express.Multer.File): Promise<string[]> {
    const mime = (file.mimetype || '').toLowerCase();

    // Already an image: just persist to temp and return single path.
    if (mime.startsWith('image/')) {
      const imgPath = await this.writeTempFile(file);
      return [imgPath];
    }

    const srcPath = await this.writeTempFile(file);
    const baseName = basename(srcPath, '.' + (srcPath.split('.').pop() || ''));
    const pdfPath = join(tmpdir(), `${baseName}.pdf`);

    try {
      // 1) Convert input -> PDF via LibreOffice
      await exec(`soffice --headless --convert-to pdf --outdir "${tmpdir()}" "${srcPath}"`);

      // 2) Convert PDF pages -> PNG images via ImageMagick
      const imgPattern = join(tmpdir(), `${baseName}-%03d.png`);
      await exec(`convert -density 150 "${pdfPath}" -quality 90 "${imgPattern}"`);

      const files = await fs.readdir(tmpdir());
      const images = files
        .filter((name) => name.startsWith(`${baseName}-`) && name.endsWith('.png'))
        .map((name) => join(tmpdir(), name));

      if (!images.length) {
        throw new Error('No images generated from document');
      }

      return images;
    } catch (error) {
      throw new InternalServerErrorException('Failed to convert document to images');
    } finally {
      // best-effort cleanup
      await fs.unlink(srcPath).catch(() => {});
      await fs.unlink(pdfPath).catch(() => {});
    }
  }
}

