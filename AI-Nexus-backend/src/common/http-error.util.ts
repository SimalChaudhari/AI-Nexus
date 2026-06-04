import { HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

export type ApiErrorBody = {
  statusCode: number;
  error: string;
  message: string;
  code: string;
  path?: string;
  timestamp: string;
};

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getMaxVideoUploadMb(): number {
  const sectionGb = parsePositiveNumber(process.env.UPLOAD_SECTION_VIDEO_MAX_GB, 20);
  const sectionMb = sectionGb * 1024;
  const ceoMb = parsePositiveNumber(process.env.UPLOAD_VIDEO_MAX_MB, 100);
  return Math.max(sectionMb, ceoMb);
}

export function getMaxImageUploadMb(): number {
  return parsePositiveNumber(process.env.UPLOAD_IMAGE_MAX_MB, 50);
}

function isUploadPath(path: string): boolean {
  return /\/upload/i.test(path);
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

/** Map unknown errors (multer, body-parser, etc.) to a consistent API error body. */
export function resolveApiErrorBody(exception: unknown, request: Request): ApiErrorBody {
  const path = request.url;
  const timestamp = new Date().toISOString();
  const upload = isUploadPath(path);

  const multer = exception as { code?: string; field?: string; message?: string };
  if (multer?.code === 'LIMIT_FILE_SIZE') {
    const maxMb = upload && /ceo-launch-video|upload-video/i.test(path)
      ? getMaxVideoUploadMb()
      : getMaxImageUploadMb();
    return {
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      error: 'Payload Too Large',
      message: `Uploaded file is too large. Maximum allowed size is ${formatMb(maxMb * 1024 * 1024)} for this endpoint.`,
      code: 'UPLOAD_FILE_TOO_LARGE',
      path,
      timestamp,
    };
  }

  if (multer?.code === 'LIMIT_UNEXPECTED_FILE') {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: `Unexpected file field "${multer.field || 'unknown'}". Check the form field name matches the API (e.g. video, logo, image).`,
      code: 'UPLOAD_UNEXPECTED_FIELD',
      path,
      timestamp,
    };
  }

  const entity = exception as { type?: string; status?: number; limit?: number };
  if (entity?.type === 'entity.too.large' || entity?.status === 413) {
    return {
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      error: 'Payload Too Large',
      message: upload
        ? `Request body exceeds the server limit (${formatMb(entity.limit || 50 * 1024 * 1024)}). For large videos, ensure nginx client_max_body_size is high enough (e.g. 500M) on the API port.`
        : 'Request payload is too large.',
      code: 'REQUEST_ENTITY_TOO_LARGE',
      path,
      timestamp,
    };
  }

  if (exception instanceof Error) {
    const msg = exception.message || '';
    if (/unsupported media|file type|mimetype/i.test(msg)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: msg,
        code: 'UPLOAD_INVALID_FILE_TYPE',
        path,
        timestamp,
      };
    }
    if (/file.*required|no video|no file/i.test(msg)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: msg,
        code: 'UPLOAD_FILE_REQUIRED',
        path,
        timestamp,
      };
    }
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'Internal Server Error',
    message: upload
      ? 'Video or file upload failed on the server. Please try again or contact support.'
      : 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR',
    path,
    timestamp,
  };
}

export function normalizeHttpExceptionBody(
  status: number,
  body: string | object,
  request: Request,
): ApiErrorBody {
  const path = request.url;
  const timestamp = new Date().toISOString();
  const upload = isUploadPath(path);

  let message = 'Request failed';
  let code = 'HTTP_ERROR';

  if (typeof body === 'string') {
    message = body;
  } else if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    const raw = record.message;
    if (typeof raw === 'string') message = raw;
    else if (Array.isArray(raw)) message = raw.map(String).join(', ');
    if (typeof record.error === 'string' && status === HttpStatus.PAYLOAD_TOO_LARGE) {
      code = 'UPLOAD_FILE_TOO_LARGE';
    }
  }

  if (status === HttpStatus.PAYLOAD_TOO_LARGE || status === 413) {
    const maxMb = getMaxVideoUploadMb();
    return {
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      error: 'Payload Too Large',
      message:
        message && message !== 'Payload Too Large'
          ? message
          : `File is too large. Maximum for video uploads is about ${formatMb(maxMb * 1024 * 1024)}.`,
      code: 'UPLOAD_FILE_TOO_LARGE',
      path,
      timestamp,
    };
  }

  if (status === HttpStatus.UNAUTHORIZED) {
    return {
      statusCode: status,
      error: 'Unauthorized',
      message: upload
        ? 'Authentication required. Sign in on the same API host before uploading.'
        : message || 'Unauthorized',
      code: 'UNAUTHORIZED',
      path,
      timestamp,
    };
  }

  if (status === HttpStatus.FORBIDDEN) {
    return {
      statusCode: status,
      error: 'Forbidden',
      message: message || 'You do not have permission to perform this action.',
      code: 'FORBIDDEN',
      path,
      timestamp,
    };
  }

  if (status === HttpStatus.BAD_REQUEST && upload) {
    return {
      statusCode: status,
      error: 'Bad Request',
      message: message || 'Invalid upload request.',
      code: 'UPLOAD_BAD_REQUEST',
      path,
      timestamp,
    };
  }

  const errorLabel =
    status === HttpStatus.BAD_REQUEST
      ? 'Bad Request'
      : status >= 500
        ? 'Internal Server Error'
        : 'Error';

  return {
    statusCode: status,
    error: errorLabel,
    message,
    code,
    path,
    timestamp,
  };
}
