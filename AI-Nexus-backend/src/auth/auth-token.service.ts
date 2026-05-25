import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { Response, Request } from 'express';

import { UserEntity } from '../user/users.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import {
  clearAuthCookies,
  parseRefreshMaxAgeMs,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from './auth-cookie.util';

export type AuthTokenUserPayload = {
  id: string;
  email?: string | null;
  role: string;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
};

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  private get accessExpires(): string {
    return process.env.JWT_ACCESS_EXPIRES?.trim() || '15m';
  }

  private get refreshExpiresMs(): number {
    return parseRefreshMaxAgeMs();
  }

  buildAccessPayload(user: AuthTokenUserPayload | UserEntity) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      type: 'access',
    };
  }

  signAccessToken(user: AuthTokenUserPayload | UserEntity): string {
    return this.jwtService.sign(this.buildAccessPayload(user), {
      secret: process.env.JWT_SECRET,
      expiresIn: this.accessExpires,
    });
  }

  private hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async createRefreshToken(userId: string, req?: Request): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    const tokenHash = this.hashRefreshToken(raw);
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    await this.refreshTokenRepository.save({
      userId,
      tokenHash,
      expiresAt,
      revokedAt: null,
      userAgent: req?.headers?.['user-agent']?.toString()?.slice(0, 512) || null,
    });

    return raw;
  }

  /**
   * Issue access + refresh tokens. Sets HttpOnly cookies unless deferredAuth is true
   * (recognition membership — platform login happens after application).
   */
  async issueTokenPair(
    user: AuthTokenUserPayload | UserEntity,
    res?: Response,
    options?: { deferredAuth?: boolean; req?: Request },
  ): Promise<{ accessToken: string; refreshToken: string | null }> {
    const accessToken = this.signAccessToken(user);
    if (options?.deferredAuth) {
      return { accessToken, refreshToken: null };
    }

    const refreshToken = await this.createRefreshToken(user.id, options?.req);
    if (res) {
      setAuthCookies(res, accessToken, refreshToken);
    }
    return { accessToken, refreshToken };
  }

  async refreshSession(
    rawRefreshToken: string,
    res: Response,
    req?: Request,
  ): Promise<{ user: Partial<UserEntity> }> {
    const tokenHash = this.hashRefreshToken(rawRefreshToken);
    const existing = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    existing.revokedAt = new Date();
    await this.refreshTokenRepository.save(existing);

    const user = await this.userRepository.findOne({ where: { id: existing.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.signAccessToken(user);
    const newRefreshToken = await this.createRefreshToken(user.id, req);
    setAuthCookies(res, accessToken, newRefreshToken);

    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword };
  }

  async revokeRefreshToken(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken?.trim()) return;
    const tokenHash = this.hashRefreshToken(rawRefreshToken.trim());
    const existing = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
    });
    if (!existing) return;
    existing.revokedAt = new Date();
    await this.refreshTokenRepository.save(existing);
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  clearAuthCookies(res: Response): void {
    clearAuthCookies(res);
  }

  readRefreshTokenFromRequest(req: Request): string | null {
    const value = req.cookies?.[REFRESH_TOKEN_COOKIE];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  verifyAccessToken(token: string): { id: string } {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as { id?: string };
      if (!decoded?.id) {
        throw new UnauthorizedException('Invalid token payload');
      }
      return { id: decoded.id };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
