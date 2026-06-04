import { INestApplication, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/** SPA origins used when the site is on :443 and the API is on :5000. */
const DEFAULT_PRODUCTION_SPA_ORIGINS = [
  'https://ainexus.isca.org.sg',
  'http://ainexus.isca.org.sg',
];

function parseOriginList(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowed(requestOrigin: string, allowedOrigins: string[]): boolean {
  if (!requestOrigin) return false;
  if (allowedOrigins.includes(requestOrigin)) return true;

  try {
    const requestHost = new URL(requestOrigin).hostname.toLowerCase();
    return allowedOrigins.some((allowed) => {
      try {
        return new URL(allowed).hostname.toLowerCase() === requestHost;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

/** Shared CORS policy for main.ts and Vercel serverless (api/index.ts). */
export function buildAllowedOrigins(nodeEnv = process.env.NODE_ENV): string[] {
  const isDevelopment = nodeEnv === 'development';
  const host = process.env.APP_HOST?.trim() || 'localhost';

  const configuredOrigins = parseOriginList(process.env.FRONTEND_URLS);
  const extraCorsOrigins = parseOriginList(process.env.CORS_EXTRA_ORIGINS);
  const fallbackOrigin = process.env.FRONTEND_URL?.trim();
  const prodDefaultOrigin = nodeEnv === 'production' ? 'https://ainexus.isca.org.sg' : '';
  const baseAllowedOrigins = configuredOrigins.length
    ? configuredOrigins
    : [fallbackOrigin || prodDefaultOrigin].filter(Boolean);

  const originsFromFlowiseEnv: string[] = [];
  for (const key of ['FLOWISE_URL', 'VITE_FLOWISE_URL', 'FLOWISE_INTERNAL_URL'] as const) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    try {
      originsFromFlowiseEnv.push(new URL(raw).origin);
    } catch {
      // ignore invalid URL
    }
  }

  const devLocalOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3030',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3030',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
  ];
  const configuredFlowisePort = (process.env.FLOWISE_PORT || '3002').trim();
  const productionFlowiseOrigins = !isDevelopment
    ? [`https://${host}:${configuredFlowisePort}`, `http://${host}:${configuredFlowisePort}`]
    : [];

  const productionSpaOrigins = parseOriginList(process.env.CORS_SPA_ORIGINS);
  const mergedProductionSpa =
    productionSpaOrigins.length > 0 ? productionSpaOrigins : DEFAULT_PRODUCTION_SPA_ORIGINS;

  return Array.from(
    new Set([
      ...baseAllowedOrigins,
      ...extraCorsOrigins,
      ...originsFromFlowiseEnv,
      ...productionFlowiseOrigins,
      ...(nodeEnv === 'production' && prodDefaultOrigin ? [prodDefaultOrigin] : []),
      ...(!isDevelopment ? mergedProductionSpa : []),
      ...(isDevelopment ? devLocalOrigins : []),
    ]),
  );
}

/** Ensures CORS headers on error responses (401/413) so the browser does not report a false CORS failure. */
export function createCorsHeadersMiddleware(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';

    if (origin && isOriginAllowed(origin, allowedOrigins)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Accept, X-Requested-With, Cookie',
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).send();
    }

    next();
  };
}

export function enableAppCors(app: INestApplication, logger = new Logger('CORS')): void {
  const allowedOrigins = buildAllowedOrigins();
  const allowAnyOrigin = allowedOrigins.length === 0;

  const httpAdapter = app.getHttpAdapter();
  const expressApp = httpAdapter.getInstance();
  expressApp.use(createCorsHeadersMiddleware(allowedOrigins));

  app.enableCors({
    origin: (origin, callback) => {
      if (allowAnyOrigin) {
        callback(null, origin || true);
        return;
      }
      if (!origin) {
        callback(null, true);
        return;
      }
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, origin);
        return;
      }
      logger.warn(
        `CORS denied for origin: ${origin} (allowed=${allowedOrigins.slice(0, 5).join(', ')}${allowedOrigins.length > 5 ? '…' : ''})`,
      );
      callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cookie'],
    credentials: !allowAnyOrigin,
  });

  if (!isDevelopment() && allowedOrigins.length > 0) {
    logger.log(`CORS enabled for ${allowedOrigins.length} origin(s)`);
  }
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
