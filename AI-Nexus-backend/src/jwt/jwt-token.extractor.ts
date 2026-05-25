import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth-cookie.util';

/** Read JWT from HttpOnly cookie first, then Authorization Bearer (migration / API clients). */
export function extractAccessTokenFromRequest(request: Request): string | null {
  const fromCookie = request.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.trim()) {
    return fromCookie.trim();
  }

  const authHeader = request.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token?.trim()) {
    return token.trim();
  }

  return null;
}
