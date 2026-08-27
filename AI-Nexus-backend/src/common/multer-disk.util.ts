import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { diskStorage, StorageEngine } from 'multer';

/** Stream large uploads to disk instead of buffering them in the Node heap. */
export function largeUploadDiskStorage(subfolder: string): StorageEngine {
  const dest = join(process.cwd(), 'tmp-uploads', subfolder);
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  return diskStorage({
    destination: dest,
    filename: (_req, file, cb) => {
      const ext = extname(String(file.originalname || '')).slice(0, 12) || '.bin';
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  });
}
