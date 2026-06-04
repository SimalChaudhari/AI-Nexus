import { INestApplication, Logger } from '@nestjs/common';

function isTrue(value?: string): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

/** Shared CORS policy for main.ts and Vercel serverless (api/index.ts). */
export function buildAllowedOrigins(nodeEnv = process.env.NODE_ENV): string[] {
  const isDevelopment = nodeEnv === 'development';
  const host = process.env.APP_HOST?.trim() || 'localhost';

  const configuredOrigins = (process.env.FRONTEND_URLS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const extraCorsOrigins = (process.env.CORS_EXTRA_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
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
  const productionFlowiseOrigins =
    nodeEnv === 'production'
      ? [`https://${host}:${configuredFlowisePort}`, `http://${host}:${configuredFlowisePort}`]
      : [];

  return Array.from(
    new Set([
      ...baseAllowedOrigins,
      ...extraCorsOrigins,
      ...originsFromFlowiseEnv,
      ...productionFlowiseOrigins,
      ...(nodeEnv === 'production' && prodDefaultOrigin ? [prodDefaultOrigin] : []),
      ...(isDevelopment ? devLocalOrigins : []),
    ]),
  );
}

export function enableAppCors(app: INestApplication, logger = new Logger('CORS')): void {
  const allowedOrigins = buildAllowedOrigins();
  const allowAnyOrigin = allowedOrigins.length === 0;

  app.enableCors({
    origin: (origin, callback) => {
      if (allowAnyOrigin || !origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      logger.warn(`CORS denied for origin: ${origin} (allowed count=${allowedOrigins.length})`);
      callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Cookie'],
    credentials: !allowAnyOrigin,
  });
}
