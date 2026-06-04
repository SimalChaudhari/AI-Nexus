import { memoryStorage } from 'multer';

/** Express JSON / urlencoded body parser limit. */
export const BODY_PARSER_LIMIT = '500mb';

/** Default multer single-file cap (500 MB). */
export const MULTER_MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

export function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Read upload max size in MB from env, capped at MULTER_MAX_FILE_SIZE_BYTES. */
export function uploadMaxBytesFromMbEnv(envValue: string | undefined, defaultMb: number): number {
  const mb = parsePositiveNumber(envValue, defaultMb);
  const bytes = mb * 1024 * 1024;
  return Math.min(bytes, MULTER_MAX_FILE_SIZE_BYTES);
}

/** Multer memory storage with a file size limit (defaults to 500 MB). */
export function multerMemoryOptions(fileSizeBytes = MULTER_MAX_FILE_SIZE_BYTES) {
  return {
    storage: memoryStorage(),
    limits: { fileSize: fileSizeBytes },
  };
}
