// src/auth/oauth-auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { UserEntity, AuthProvider, UserRole, UserStatus } from '../user/users.entity';
import { normalizeEmail } from '../utils/auth.utils';

const ACCESS_TOKEN_EXPIRY = '10d';

export interface IdPUserInfo {
  user_id?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: unknown;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string; // IdP may send it; we do not use it
  token_type?: string;
  expires_in?: number;
}

export interface ProcessOAuthResult {
  user: UserEntity;
  accessToken: string;
  isNewUser: boolean;
}

@Injectable()
export class OAuthAuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  private get baseUrl(): string {
    const url = process.env.OAUTH_INSTANCE_URL || '';
    return url.replace(/\/$/, '');
  }

  private get redirectUri(): string {
    return process.env.OAUTH_REDIRECT_URI || '';
  }

  private get clientId(): string {
    return process.env.OAUTH_CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return process.env.OAUTH_CLIENT_SECRET || '';
  }

  private get authPath(): string {
    const p = process.env.OAUTH_AUTHORIZATION_PATH || '/services/oauth2/authorize';
    return p.startsWith('/') ? p : `/${p}`;
  }

  private get tokenPath(): string {
    const p = process.env.OAUTH_TOKEN_PATH || '/services/oauth2/token';
    return p.startsWith('/') ? p : `/${p}`;
  }

  private get userinfoPath(): string {
    const p = process.env.OAUTH_USERINFO_PATH || '/services/oauth2/userinfo';
    return p.startsWith('/') ? p : `/${p}`;
  }

  private get revokePath(): string {
    // Common path for Salesforce/IdP revoke
    const p = process.env.OAUTH_REVOKE_PATH || '/services/oauth2/revoke';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get deepLinkScheme(): string {
    return process.env.MOBILE_DEEP_LINK_SCHEME || 'yourapp://auth';
  }

  /**
   * Browser SPA callback: where to redirect after backend handles IdP `code`.
   * Prefer OAUTH_WEB_CALLBACK_URL; else FRONTEND_URL + /auth/oauth/callback (matches frontend routes).
   */
  get webOAuthCallbackUrl(): string | null {
    const explicit = process.env.OAUTH_WEB_CALLBACK_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, '');
    const front = process.env.FRONTEND_URL?.trim();
    if (front) return `${front.replace(/\/$/, '')}/auth/oauth/callback`;
    return null;
  }

  /**
   * After OAuth callback on the API, send the user here with query params (web) or deep link (mobile-only).
   */
  createPostOAuthRedirectUrl(params: Record<string, string>): string {
    const web = this.webOAuthCallbackUrl;
    if (web) {
      const search = new URLSearchParams(params).toString();
      return search ? `${web}?${search}` : web;
    }
    return this.createMobileRedirectUrl(params);
  }

  /** Build authorization URL for IdP. */
  generateAuthUrl(): { authUrl: string } {
    const base = this.baseUrl;
    const path = this.authPath;
    const clientId = this.clientId;
    const redirectUri = this.redirectUri;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
    });
    const authUrl = `${base}${path}?${params.toString()}`;
    return { authUrl };
  }

  /** Exchange authorization code for IdP tokens. */
  async exchangeCodeForToken(code: string): Promise<OAuthTokens> {
    const url = `${this.baseUrl}${this.tokenPath}`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });
    try {
      const res = await axios.post<OAuthTokens>(url, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });
      return res.data;
    } catch (err: unknown) {
      const msg = this.mapTokenError(err);
      throw new UnauthorizedException(msg);
    }
  }

  private mapTokenError(err: unknown): string {
    if (axios.isAxiosError(err) && err.response?.data) {
      const data = err.response.data as { error?: string; error_description?: string };
      const error = (data.error || '').toLowerCase();
      const desc = data.error_description || '';
      if (error === 'invalid_grant') {
        return 'Invalid authorization code or it has expired. Please try logging in again.';
      }
      if (error === 'invalid_client') {
        return 'Invalid client credentials. Please contact support.';
      }
      if (error === 'redirect_uri_mismatch' || desc.toLowerCase().includes('redirect')) {
        return 'Redirect URI mismatch. Please contact support.';
      }
      if (desc) return desc;
    }
    return 'Failed to exchange authorization code. Please try again.';
  }

  /** Get user info from IdP using access_token. */
  async getUserInfo(accessToken: string): Promise<IdPUserInfo> {
    const url = `${this.baseUrl}${this.userinfoPath}`;
    try {
      const res = await axios.get<IdPUserInfo>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      });
      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        throw new UnauthorizedException('Invalid or expired IdP access token.');
      }
      throw new UnauthorizedException('Failed to fetch user info from identity provider.');
    }
  }

  /** Create or update user from IdP data and issue our access token only (no refresh token). */
  async processOAuthAuthentication(
    idpUserInfo: IdPUserInfo,
    idpAccessToken: string,
    syncFn?: (userId: string) => Promise<unknown>,
  ): Promise<ProcessOAuthResult> {
    const email = normalizeEmail(idpUserInfo.email || idpUserInfo.sub || '');
    if (!email) {
      throw new UnauthorizedException('Identity provider did not return an email.');
    }
    const socialId = idpUserInfo.user_id || idpUserInfo.sub || '';
    const firstName = idpUserInfo.given_name || idpUserInfo.first_name || idpUserInfo.name || '';
    const lastName = idpUserInfo.family_name || idpUserInfo.last_name || '';

    let user = await this.userRepository.findOne({ where: { email } });
    const isNewUser = !user;

    if (!user) {
      const username = await this.generateUniqueUsername(email, firstName, lastName);
      const newUserPartial: DeepPartial<UserEntity> = {
        username,
        firstname: firstName || 'User',
        lastname: lastName || email.split('@')[0],
        email,
        password: null,
        authProvider: AuthProvider.OAUTH,
        socialId: socialId || null,
        socialAccessToken: idpAccessToken,
        isVerified: true,
        role: UserRole.User,
        status: UserStatus.Active,
      };
      user = this.userRepository.create(newUserPartial);
    } else {
      user.authProvider = AuthProvider.OAUTH;
      user.socialId = socialId || user.socialId || null;
      user.socialAccessToken = idpAccessToken;
      user.isVerified = true;
      if (firstName) user.firstname = firstName;
      if (lastName) user.lastname = lastName;
    }

    const payload = { id: user.id, email: user.email, role: user.role, type: 'access' };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    await this.userRepository.save(user);

    if (syncFn) {
      try {
        await syncFn(user.id);
      } catch (syncErr) {
        console.error('SSO sync failed (non-fatal):', syncErr);
      }
    }

    return { user, accessToken, isNewUser };
  }

  private async generateUniqueUsername(email: string, first: string, last: string): Promise<string> {
    const base = [first, last].filter(Boolean).join('').replace(/\s+/g, '') || email.split('@')[0];
    const sanitized = base.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 20) || 'user';
    let username = sanitized;
    let n = 0;
    while (await this.userRepository.findOne({ where: { username } })) {
      username = `${sanitized}${++n}`;
    }
    return username;
  }

  /** Build redirect URL for mobile deep link (success or error). */
  createMobileRedirectUrl(params: Record<string, string>): string {
    const scheme = this.deepLinkScheme.replace(/\/$/, '').split('?')[0];
    const search = new URLSearchParams(params).toString();
    return search ? `${scheme}?${search}` : scheme;
  }

  /** Revoke IdP token (e.g. Salesforce). Do not throw on failure. */
  async revokeIdpToken(accessToken: string): Promise<void> {
    const url = `${this.baseUrl}${this.revokePath}`;
    try {
      await axios.post(
        url,
        new URLSearchParams({ token: accessToken }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        },
      );
    } catch (err) {
      console.warn('IdP token revoke failed (non-fatal):', err);
    }
  }

  /** Load user by id (for logout/sync). */
  async getUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}
