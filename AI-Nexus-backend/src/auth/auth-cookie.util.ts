import { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_COOKIE_PATH = '/api';
const REFRESH_COOKIE_PATH = '/api/auth';

/** Parse durations like 5s, 15m, 7d. Returns fallbackMs when missing/invalid. */
export function parseDurationMs(value: string | undefined, fallbackMs: number): number {
  const raw = value?.trim();
  if (!raw) return fallbackMs;
  const match = /^(\d+)([smhd])$/i.exec(raw);
  if (!match) return fallbackMs;
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] || fallbackMs);
}

function parseAccessMaxAgeMs(): number {
  return parseDurationMs(process.env.JWT_ACCESS_EXPIRES, 15 * 60 * 1000);
}

/** Refresh lifetime: prefer JWT_REFRESH_EXPIRES (5s, 15m, 7d); legacy JWT_REFRESH_EXPIRES_DAYS is days only. */
export function parseRefreshMaxAgeMs(): number {
  const fromDuration = parseDurationMs(process.env.JWT_REFRESH_EXPIRES, 0);
  if (fromDuration > 0) return fromDuration;

  const raw = process.env.JWT_REFRESH_EXPIRES_DAYS?.trim();
  if (raw && /^\d+$/.test(raw)) {
    const days = parseInt(raw, 10);
    if (!Number.isNaN(days) && days >= 1) {
      return Math.min(days, 90) * 24 * 60 * 60 * 1000;
    }
  }

  return 7 * 24 * 60 * 60 * 1000;
}

export function getAuthCookieBaseOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const secure =
    isProd ||
    process.env.COOKIE_SECURE === 'true' ||
    process.env.COOKIE_SECURE === '1';
  const domain = process.env.COOKIE_DOMAIN?.trim() || undefined;
  const sameSiteRaw = (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase();
  const sameSite =
    sameSiteRaw === 'none' || sameSiteRaw === 'strict' || sameSiteRaw === 'lax'
      ? (sameSiteRaw as 'lax' | 'strict' | 'none')
      : 'lax';

  return {
    httpOnly: true,
    secure: sameSite === 'none' ? true : secure,
    sameSite,
    domain,
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const base = getAuthCookieBaseOptions();
  const refreshMaxAgeMs = parseRefreshMaxAgeMs();

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...base,
    path: ACCESS_COOKIE_PATH,
    maxAge: parseAccessMaxAgeMs(),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...base,
    path: REFRESH_COOKIE_PATH,
    maxAge: refreshMaxAgeMs,
  });
}

export function clearAuthCookies(res: Response): void {
  const base = getAuthCookieBaseOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...base, path: ACCESS_COOKIE_PATH });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...base, path: REFRESH_COOKIE_PATH });
}
