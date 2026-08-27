const DEV_LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://localhost:3000',
  'https://localhost:3003',
  'http://localhost:3030',
  'http://localhost:8080',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'https://127.0.0.1:3000',
  'https://127.0.0.1:3003',
  'http://127.0.0.1:3030',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5173',
];

const COMMITTED_EXAMPLE_JWT_SECRET = '0HCuUNNZHfU0e9gC';

export function requireJwtSecret(): string {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required. Set a strong random value (32+ characters).');
  }
  if (secret === COMMITTED_EXAMPLE_JWT_SECRET || secret === 'student-verification-secret') {
    throw new Error('JWT_SECRET is a known placeholder. Generate a new secret and rotate all sessions.');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters.');
  }
  return secret;
}

export function getAllowedCorsOrigins(): string[] {
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
  const intlOrigin = process.env.INTL_FRONTEND_URL?.trim().replace(/\/$/, '') || '';
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

  const configuredFlowisePort = (process.env.FLOWISE_PORT || '3002').trim();
  const productionFlowiseOrigins =
    nodeEnv === 'production'
      ? [`https://${host}:${configuredFlowisePort}`, `http://${host}:${configuredFlowisePort}`]
      : [];

  return Array.from(
    new Set([
      ...baseAllowedOrigins,
      ...extraCorsOrigins,
      ...(intlOrigin ? [intlOrigin] : []),
      ...originsFromFlowiseEnv,
      ...productionFlowiseOrigins,
      ...(nodeEnv === 'production' && prodDefaultOrigin ? [prodDefaultOrigin] : []),
      ...(isDevelopment ? DEV_LOCAL_ORIGINS : []),
    ]),
  );
}

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  return getAllowedCorsOrigins().includes(origin);
}

export function getSocketIoCors() {
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isAllowedCorsOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  };
}
