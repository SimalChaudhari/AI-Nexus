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

function formatLimitLabel(mb: number): string {
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
}

/** Map unknown errors (multer, body-parser, etc.) to a consistent API error body. */
export function resolveApiErrorBody(exception: unknown, request: Request): ApiErrorBody {
  const path = request.url;
  const timestamp = new Date().toISOString();
  const upload = isUploadPath(path);

  const multer = exception as { code?: string; field?: string };
  if (multer?.code === 'LIMIT_FILE_SIZE') {
    const maxMb =
      upload && /ceo-launch-video|upload-video/i.test(path)
        ? getMaxVideoUploadMb()
        : getMaxImageUploadMb();
    return {
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      error: 'Payload Too Large',
      message: `This file is too large. Maximum allowed size is ${formatLimitLabel(maxMb)}.`,
      code: 'UPLOAD_FILE_TOO_LARGE',
      path,
      timestamp,
    };
  }

  if (multer?.code === 'LIMIT_UNEXPECTED_FILE') {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: 'Invalid file upload. Please try selecting the file again.',
      code: 'UPLOAD_UNEXPECTED_FIELD',
      path,
      timestamp,
    };
  }

  const entity = exception as { type?: string; status?: number };
  if (entity?.type === 'entity.too.large' || entity?.status === 413) {
    return {
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      error: 'Payload Too Large',
      message: upload
        ? 'This file is too large. Please upload a smaller video or contact your administrator.'
        : 'This file is too large.',
      code: 'REQUEST_ENTITY_TOO_LARGE',
      path,
      timestamp,
    };
  }

  if (exception instanceof Error) {
    const msg = exception.message || '';
    if (/unsupported media|file type|mimetype|Validation failed/i.test(msg)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'This file type is not supported. Please use MP4, WebM, MOV, or another allowed format.',
        code: 'UPLOAD_INVALID_FILE_TYPE',
        path,
        timestamp,
      };
    }
    if (/file.*required|no video|no file/i.test(msg)) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Please select a file to upload.',
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
      ? 'Upload failed. Please try again.'
      : 'Something went wrong. Please try again.',
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

  let message = '';
  if (typeof body === 'string') {
    message = body;
  } else if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    const raw = record.message;
    if (typeof raw === 'string') message = raw;
    else if (Array.isArray(raw)) message = raw.map(String).join(', ');
  }

  if (status === HttpStatus.PAYLOAD_TOO_LARGE || status === 413) {
    const maxMb = getMaxVideoUploadMb();
    return {
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      error: 'Payload Too Large',
      message:
        message && !/payload too large/i.test(message)
          ? message
          : `This file is too large. Maximum allowed size is ${formatLimitLabel(maxMb)}.`,
      code: 'UPLOAD_FILE_TOO_LARGE',
      path,
      timestamp,
    };
  }

  if (status === HttpStatus.UNAUTHORIZED) {
    return {
      statusCode: status,
      error: 'Unauthorized',
      message: 'Your session has expired. Please sign in again.',
      code: 'UNAUTHORIZED',
      path,
      timestamp,
    };
  }

  if (status === HttpStatus.FORBIDDEN) {
    return {
      statusCode: status,
      error: 'Forbidden',
      message: 'You do not have permission to do this.',
      code: 'FORBIDDEN',
      path,
      timestamp,
    };
  }

  if (status === HttpStatus.BAD_REQUEST && upload) {
    return {
      statusCode: status,
      error: 'Bad Request',
      message: message || 'Upload failed. Please check the file and try again.',
      code: 'UPLOAD_BAD_REQUEST',
      path,
      timestamp,
    };
  }

  if (status === HttpStatus.NOT_FOUND) {
    return {
      statusCode: status,
      error: 'Not Found',
      message: 'This action is not available. Please contact your administrator.',
      code: 'NOT_FOUND',
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
    message: message || 'Something went wrong. Please try again.',
    code: 'HTTP_ERROR',
    path,
    timestamp,
  };
}
