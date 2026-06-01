import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync } from 'fs';
import { mkdir, readdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';

type SaveFileOptions = {
  fileName?: string;
};

@Injectable()
export class LocalStorageService {
  private readonly uploadRootDir = join(process.cwd(), 'public', 'uploads');

  async saveFile(
    file: Express.Multer.File,
    folder: string,
    options: SaveFileOptions = {}
  ): Promise<string> {
    const normalizedFolder = this.normalizeFolder(folder);
    const targetDir = join(this.uploadRootDir, normalizedFolder);

    await mkdir(targetDir, { recursive: true });

    const extension = this.getExtension(file);
    const fileName = options.fileName
      ? `${this.sanitizeFileName(options.fileName)}${extension}`
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;

    await writeFile(join(targetDir, fileName), file.buffer);

    return `/uploads/${normalizedFolder}/${fileName}`;
  }

  async saveFiles(files: Express.Multer.File[], folder: string): Promise<string[]> {
    const uploads = files.map((file) => this.saveFile(file, folder));
    return Promise.all(uploads);
  }

  async deleteFileByUrl(fileUrl?: string | null): Promise<void> {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
      return;
    }

    const relativePath = fileUrl.replace(/^\/uploads\//, '');
    const absolutePath = join(this.uploadRootDir, relativePath);

    if (!existsSync(absolutePath)) {
      return;
    }

    await unlink(absolutePath).catch(() => undefined);
  }

  async clearFolder(folder: string): Promise<void> {
    const normalizedFolder = this.normalizeFolder(folder);
    const targetDir = join(this.uploadRootDir, normalizedFolder);

    if (!existsSync(targetDir)) {
      return;
    }

    const files = await readdir(targetDir);

    await Promise.all(files.map((fileName) => unlink(join(targetDir, fileName)).catch(() => undefined)));
  }

  private normalizeFolder(folder: string) {
    return folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') || 'temp';
  }

  private sanitizeFileName(fileName: string) {
    return fileName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private getExtension(file: Express.Multer.File) {
    const fileExtension = extname(file.originalname || '').toLowerCase();

    if (fileExtension) {
      return fileExtension;
    }

    if (file.mimetype === 'image/svg+xml') return '.svg';
    if (file.mimetype === 'image/webp') return '.webp';
    if (file.mimetype === 'image/gif') return '.gif';
    if (file.mimetype === 'image/png') return '.png';
    if (file.mimetype === 'image/jpeg') return '.jpg';
    if (file.mimetype === 'video/mp4') return '.mp4';
    if (file.mimetype === 'video/webm') return '.webm';
    if (file.mimetype === 'video/quicktime') return '.mov';
    if (file.mimetype === 'video/x-msvideo') return '.avi';
    if (file.mimetype === 'video/x-matroska') return '.mkv';

    throw new BadRequestException('Unsupported file type');
  }
}
