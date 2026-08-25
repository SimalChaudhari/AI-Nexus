import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { ACCESS_TOKEN_COOKIE } from '../auth/auth-cookie.util';

const INTL_JWT_TYP = 'intl';

function collectCandidateTokens(request: Request): string[] {
  const tokens: string[] = [];
  const authHeader = request.headers.authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() === 'bearer' && token?.trim()) {
      tokens.push(token.trim());
    }
  }
  const fromCookie = request.cookies?.[ACCESS_TOKEN_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.trim()) {
    tokens.push(fromCookie.trim());
  }
  return [...new Set(tokens)];
}

@Injectable()
export class IntlJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const tokens = collectCandidateTokens(request);
    if (!tokens.length) throw new UnauthorizedException('Sign in required');

    for (const token of tokens) {
      try {
        const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET }) as {
          sub?: string;
          email?: string;
          typ?: string;
        };
        if (decoded?.typ === INTL_JWT_TYP && decoded?.sub) {
          request.user = {
            id: decoded.sub,
            email: decoded.email || '',
            typ: decoded.typ,
          };
          return true;
        }
      } catch {
        // try next candidate (Bearer international token vs LMS cookie)
      }
    }

    throw new UnauthorizedException('Invalid international session');
  }
}
