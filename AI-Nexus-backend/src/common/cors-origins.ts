/** Allowed browser origins for CORS headers on API error responses. */
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

  const devLocalOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3030',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ];

  return Array.from(
    new Set([
      ...baseAllowedOrigins,
      ...extraCorsOrigins,
      ...(nodeEnv === 'production' && prodDefaultOrigin ? [prodDefaultOrigin] : []),
      ...(isDevelopment ? devLocalOrigins : []),
    ]),
  );
}

export function applyCorsHeadersIfAllowed(
  request: { headers: { origin?: string } },
  response: { setHeader: (name: string, value: string) => void },
  allowedOrigins = buildAllowedOrigins(),
): void {
  const origin = request.headers.origin;
  if (!origin) return;
  if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Vary', 'Origin');
  }
}
