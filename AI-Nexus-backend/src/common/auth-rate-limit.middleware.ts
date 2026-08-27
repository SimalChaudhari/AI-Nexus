import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const WINDOW_MS = 60_000;
const MAX_SENSITIVE = 8;
const MAX_AUTH = 40;

const SENSITIVE_PATH =
  /\/(login|register|forgot-password|reset-password|establish-session|student-verification|verify-nric|verify-email|resend-verification)(\/|$)/i;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientKey(req: Request): string {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwarded || req.ip || req.socket.remoteAddress || 'unknown';
}

function hit(key: string, max: number): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= max;
}

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
      next();
      return;
    }

    const ip = clientKey(req);
    const sensitive = SENSITIVE_PATH.test(req.path);
    const allowed = hit(`${ip}:${sensitive ? 's' : 'a'}`, sensitive ? MAX_SENSITIVE : MAX_AUTH);
    if (!allowed) {
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests. Please wait a minute and try again.',
      });
      return;
    }
    next();
  }
}

export function authRateLimitExpress(req: Request, res: Response, next: NextFunction): void {
  new AuthRateLimitMiddleware().use(req, res, next);
}
