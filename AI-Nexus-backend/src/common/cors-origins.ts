import type { Request, Response } from 'express';

/** Build allowed browser origins (same rules as main.ts CORS). */
export function buildAllowedOrigins(): string[] {
  const nodeEnv = process.env.NODE_ENV;
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

/** Apply CORS headers on error responses so the browser can read JSON bodies. */
export function applyCorsHeadersIfAllowed(request: Request, response: Response): void {
  const origin = request.headers.origin;
  if (!origin || typeof origin !== 'string') return;

  const allowedOrigins = buildAllowedOrigins();
  const allowAnyOrigin = allowedOrigins.length === 0;
  if (!allowAnyOrigin && !allowedOrigins.includes(origin)) return;

  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Vary', 'Origin');
}
