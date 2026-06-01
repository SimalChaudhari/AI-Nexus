import { BadRequestException, Injectable } from '@nestjs/common';
import { createReadStream, createWriteStream, existsSync } from 'fs';
import { copyFile, mkdir, readFile, rename, rm, stat, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { once } from 'events';
import { LocalStorageService } from '../service/local-storage.service';

const TMP_ROOT = join(process.cwd(), 'public', 'uploads', '.tmp-section-videos');
const CHUNK_FILE_PREFIX = 'chunk-';

type SessionMeta = {
  fileName: string;
  totalChunks: number;
  mimeType?: string;
};

@Injectable()
export class SectionVideoChunkUploadService {
  private parseEnvPositiveNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private get maxVideoBytes(): number {
    return this.parseEnvPositiveNumber(process.env.UPLOAD_SECTION_VIDEO_MAX_GB, 20) * 1024 * 1024 * 1024;
  }

  private get maxChunkBytes(): number {
    return this.parseEnvPositiveNumber(process.env.UPLOAD_SECTION_VIDEO_CHUNK_MB, 4) * 1024 * 1024;
  }

  private sessionDir(uploadId: string): string {
    return join(TMP_ROOT, uploadId);
  }

  private metaPath(uploadId: string): string {
    return join(this.sessionDir(uploadId), 'meta.json');
  }

  private chunkPath(uploadId: string, chunkIndex: number): string {
    return join(this.sessionDir(uploadId), `${CHUNK_FILE_PREFIX}${String(chunkIndex).padStart(6, '0')}`);
  }

  private assertUploadId(uploadId: string): void {
    if (!/^[0-9a-f-]{36}$/i.test(String(uploadId || '').trim())) {
      throw new BadRequestException('Invalid uploadId');
    }
  }

  async saveChunk(params: {
    uploadId: string;
    chunkIndex: number;
    totalChunks: number;
    fileName: string;
    mimeType?: string;
    tempFilePath: string;
  }): Promise<void> {
    const { uploadId, chunkIndex, totalChunks, fileName, mimeType, tempFilePath } = params;
    this.assertUploadId(uploadId);

    if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= totalChunks) {
      throw new BadRequestException('Invalid chunk index');
    }
    if (!Number.isInteger(totalChunks) || totalChunks < 1) {
      throw new BadRequestException('Invalid totalChunks');
    }

    const maxChunks = Math.ceil(this.maxVideoBytes / this.maxChunkBytes) + 1;
    if (totalChunks > maxChunks) {
      throw new BadRequestException(`Too many chunks (max ${maxChunks})`);
    }

    const safeName = String(fileName || '').trim();
    if (!/\.(mp4|webm|mov|avi|mkv)$/i.test(safeName)) {
      throw new BadRequestException('Unsupported video file name');
    }

    const chunkStat = await stat(tempFilePath);
    if (chunkStat.size > this.maxChunkBytes + 1024) {
      throw new BadRequestException(`Chunk exceeds ${this.maxChunkBytes} bytes`);
    }

    await mkdir(this.sessionDir(uploadId), { recursive: true });
    const meta: SessionMeta = { fileName: safeName, totalChunks, mimeType };
    await writeFile(this.metaPath(uploadId), JSON.stringify(meta), 'utf8');

    const dest = this.chunkPath(uploadId, chunkIndex);
    try {
      await rename(tempFilePath, dest);
    } catch {
      await copyFile(tempFilePath, dest);
      await unlink(tempFilePath).catch(() => undefined);
    }
  }

  async complete(uploadId: string, localStorage: LocalStorageService): Promise<string> {
    this.assertUploadId(uploadId);
    if (!existsSync(this.metaPath(uploadId))) {
      throw new BadRequestException('Upload session not found');
    }

    const meta = JSON.parse(await readFile(this.metaPath(uploadId), 'utf8')) as SessionMeta;
    const { fileName, totalChunks } = meta;

    for (let i = 0; i < totalChunks; i += 1) {
      if (!existsSync(this.chunkPath(uploadId, i))) {
        throw new BadRequestException(`Missing chunk ${i + 1} of ${totalChunks}`);
      }
    }

    const mergedPath = join(this.sessionDir(uploadId), `merged-${randomUUID()}${extname(fileName) || '.mp4'}`);
    const writeStream = createWriteStream(mergedPath);

    try {
      for (let i = 0; i < totalChunks; i += 1) {
        const readStream = createReadStream(this.chunkPath(uploadId, i));
        readStream.pipe(writeStream, { end: false });
        await once(readStream, 'end');
      }
      writeStream.end();
      await once(writeStream, 'finish');
    } catch (err) {
      writeStream.destroy();
      await unlink(mergedPath).catch(() => undefined);
      throw err;
    }

    const mergedStat = await stat(mergedPath);
    if (mergedStat.size > this.maxVideoBytes) {
      await unlink(mergedPath).catch(() => undefined);
      throw new BadRequestException('Video exceeds maximum allowed size');
    }

    const multerLike = {
      path: mergedPath,
      originalname: fileName,
      mimetype: meta.mimeType || 'video/mp4',
    } as Express.Multer.File;

    try {
      return await localStorage.saveFile(multerLike, 'course-section-video');
    } finally {
      await rm(this.sessionDir(uploadId), { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
