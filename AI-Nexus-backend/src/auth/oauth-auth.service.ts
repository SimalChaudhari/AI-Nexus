// src/auth/oauth-auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
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

/** Custom Salesforce Apex REST payload from /services/apexrest/userinfonexus. */
export interface SalesforceNexusUserInfo {
  username?: string;
  memberClass?: string;
  lastName?: string;
  firstName?: string;
  accountType?: string;
  accountID?: string;
  isSCAQCandidate?: boolean;
  isAssociateMember?: boolean;
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

/** Salesforce profile returned without persisting a user (SCAQ verify-only reject path). */
export interface OAuthProfileOnlyResult {
  email: string;
  firstName: string;
  lastName: string;
  isSCAQCandidate: boolean | null;
  isAssociateMember: boolean | null;
  salesforceAccountId: string;
  salesforceAccountType: string;
  salesforceMemberClass: string;
}

export type OAuthCallbackResolution =
  | { mode: 'profile-only'; profile: OAuthProfileOnlyResult }
  | { mode: 'full-login'; result: ProcessOAuthResult };

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

  /**
   * Path to the Salesforce custom Apex REST that returns member class,
   * SCAQ candidate status, associate status etc.
   * Defaults to /services/apexrest/userinfonexus on the configured IdP instance.
   */
  private get userinfoNexusPath(): string {
    const p = process.env.OAUTH_USERINFO_NEXUS_PATH || '/services/apexrest/userinfonexus';
    return p.startsWith('/') ? p : `/${p}`;
  }

  /** Full URL of the Salesforce nexus user info endpoint (instance + path). */
  get userinfoNexusUrl(): string {
    const fullUrl = process.env.OAUTH_USERINFO_NEXUS_URL?.trim();
    if (fullUrl) return fullUrl;
    return `${this.baseUrl}${this.userinfoNexusPath}`;
  }

  /** Apex REST path to promote a Salesforce account to Associate member (SCAQ flow). */
  private get promoteAssociatePath(): string {
    const p = process.env.OAUTH_PROMOTE_ASSOCIATE_PATH || '/services/apexrest/promoteassociatenexus';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get promoteAssociateUrl(): string {
    const fullUrl = process.env.OAUTH_PROMOTE_ASSOCIATE_URL?.trim();
    if (fullUrl) return fullUrl;
    return `${this.baseUrl}${this.promoteAssociatePath}`;
  }

  /** SCAQ: update member class via memberclassupdate (accountId query param). */
  private get memberClassUpdatePath(): string {
    const p = process.env.OAUTH_MEMBER_CLASS_UPDATE_PATH || '/services/apexrest/memberclassupdate';
    return p.startsWith('/') ? p : `/${p}`;
  }

  private get memberClassUpdateBaseUrl(): string {
    const fullUrl = process.env.OAUTH_MEMBER_CLASS_UPDATE_URL?.trim();
    if (fullUrl) return fullUrl.split('?')[0].replace(/\/$/, '');
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim();
    if (siteBase) return `${siteBase.replace(/\/$/, '')}${this.memberClassUpdatePath}`;
    return `${this.baseUrl}${this.memberClassUpdatePath}`;
  }

  buildMemberClassUpdateUrl(accountId: string): string {
    const params = new URLSearchParams({ accountId });
    return `${this.memberClassUpdateBaseUrl}?${params.toString()}`;
  }

  /** Apex REST path to create a Nexus user in Salesforce (membership signup flow). */
  private get createNexusUserPath(): string {
    const p = process.env.OAUTH_CREATE_USER_PATH || '/services/apexrest/createuserfornexus';
    return p.startsWith('/') ? p : `/${p}`;
  }

  /** Salesforce API host for Apex REST (often *.sandbox.my.salesforce.com, not the Experience site). */
  private get integrationApiBaseUrl(): string {
    const url =
      process.env.OAUTH_INTEGRATION_INSTANCE_URL?.trim()
      || process.env.OAUTH_SALESFORCE_API_URL?.trim()
      || '';
    if (url) return url.replace(/\/$/, '');
    return this.baseUrl;
  }

  get createNexusUserUrl(): string {
    const fullUrl = process.env.OAUTH_CREATE_USER_URL?.trim();
    if (fullUrl) return fullUrl;
    return `${this.integrationApiBaseUrl}${this.createNexusUserPath}`;
  }

  private get setNexusPasswordPath(): string {
    const p = process.env.OAUTH_SET_PASSWORD_PATH || '/services/apexrest/setpasswordfornexus';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get setNexusPasswordUrl(): string {
    const fullUrl = process.env.OAUTH_SET_PASSWORD_URL?.trim();
    if (fullUrl) return fullUrl;
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim();
    if (siteBase) return `${siteBase.replace(/\/$/, '')}${this.setNexusPasswordPath}`;
    return `${this.integrationApiBaseUrl}${this.setNexusPasswordPath}`;
  }

  /** Token endpoint for integration (password grant); defaults to OAUTH_INSTANCE_URL + path. */
  private get integrationTokenUrl(): string {
    const explicit = process.env.OAUTH_INTEGRATION_TOKEN_URL?.trim();
    if (explicit) return explicit;
    return `${this.baseUrl}${this.tokenPath}`;
  }

  private get integrationClientId(): string {
    return process.env.OAUTH_INTEGRATION_CLIENT_ID?.trim() || this.clientId;
  }

  private get integrationClientSecret(): string {
    return process.env.OAUTH_INTEGRATION_CLIENT_SECRET?.trim() || this.clientSecret;
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

  /** Encode OAuth state (returned by IdP on callback). */
  buildOAuthState(options?: { scaqVerify?: boolean }): string {
    return Buffer.from(
      JSON.stringify({ scaqVerify: Boolean(options?.scaqVerify), ts: Date.now() }),
    ).toString('base64url');
  }

  /** Decode OAuth state from the IdP callback. */
  parseOAuthState(state?: string): { scaqVerify: boolean } {
    if (!state?.trim()) return { scaqVerify: false };
    try {
      const json = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
        scaqVerify?: boolean | number | string;
      };
      const flag = json.scaqVerify;
      return {
        scaqVerify: flag === true || flag === 1 || flag === '1',
      };
    } catch {
      return {
        scaqVerify: state === 'scaq_verify' || state.includes('scaq_verify'),
      };
    }
  }

  /** Build authorization URL for IdP. */
  generateAuthUrl(options?: { scaqVerify?: boolean }): { authUrl: string; state: string } {
    const base = this.baseUrl;
    const path = this.authPath;
    const clientId = this.clientId;
    const redirectUri = this.redirectUri;
    const state = this.buildOAuthState({ scaqVerify: options?.scaqVerify });
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
    });
    const authUrl = `${base}${path}?${params.toString()}`;
    return { authUrl, state };
  }

  /**
   * SCAQ membership verify: fetch Salesforce nexus info first.
   * Non-candidates get profile-only (no DB write); confirmed candidates proceed to full login.
   */
  async resolveOAuthCallback(
    idpUserInfo: IdPUserInfo,
    idpAccessToken: string,
    options: { scaqVerify: boolean },
    syncFn?: (userId: string) => Promise<unknown>,
  ): Promise<OAuthCallbackResolution> {
    const email = normalizeEmail(idpUserInfo.email || idpUserInfo.sub || '');
    if (!email) {
      throw new UnauthorizedException('Identity provider did not return an email.');
    }

    const idpFirstName =
      idpUserInfo.given_name || idpUserInfo.first_name || (typeof idpUserInfo.name === 'string' ? idpUserInfo.name : '') || '';
    const idpLastName = idpUserInfo.family_name || idpUserInfo.last_name || '';

    const nexusInfo = await this.fetchSalesforceNexusUserInfo(idpAccessToken);
    const isSCAQCandidate =
      typeof nexusInfo?.isSCAQCandidate === 'boolean' ? nexusInfo.isSCAQCandidate : null;
    const isAssociateMember =
      typeof nexusInfo?.isAssociateMember === 'boolean' ? nexusInfo.isAssociateMember : null;

    if (options.scaqVerify && isSCAQCandidate !== true) {
      console.log('[SSO Login] SCAQ verify-only: not a confirmed candidate — skipping DB persist', {
        email,
        isSCAQCandidate,
        isAssociateMember,
      });
      return {
        mode: 'profile-only',
        profile: {
          email,
          firstName: nexusInfo?.firstName || idpFirstName || '',
          lastName: nexusInfo?.lastName || idpLastName || '',
          isSCAQCandidate,
          isAssociateMember,
          salesforceAccountId: nexusInfo?.accountID || '',
          salesforceAccountType: nexusInfo?.accountType || '',
          salesforceMemberClass: nexusInfo?.memberClass || '',
        },
      };
    }

    const result = await this.processOAuthAuthentication(idpUserInfo, idpAccessToken, syncFn);
    return { mode: 'full-login', result };
  }

  /** Map profile-only OAuth result to SPA redirect query params (no access token). */
  profileOnlyRedirectParams(profile: OAuthProfileOnlyResult): Record<string, string> {
    return {
      success: 'true',
      scaqProfileOnly: 'true',
      message: 'SCAQ verification complete',
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      salesforceAccountId: profile.salesforceAccountId,
      salesforceAccountType: profile.salesforceAccountType,
      salesforceMemberClass: profile.salesforceMemberClass,
      isSCAQCandidate: profile.isSCAQCandidate === null ? '' : String(profile.isSCAQCandidate),
      isAssociateMember: profile.isAssociateMember === null ? '' : String(profile.isAssociateMember),
    };
  }

  /** Integration OAuth settings from env (password grant / client credentials). */
  private get integrationGrantType(): string {
    return (
      process.env.OAUTH_INTEGRATION_GRANT_TYPE?.trim()
      || process.env.OAUTH_GRANT_TYPE?.trim()
      || ''
    ).toLowerCase();
  }

  private get integrationUsername(): string {
    return (
      process.env.OAUTH_INTEGRATION_USERNAME?.trim()
      || process.env.OAUTH_USERNAME?.trim()
      || ''
    );
  }

  private get integrationPassword(): string {
    const password =
      process.env.OAUTH_INTEGRATION_PASSWORD?.trim()
      || process.env.OAUTH_PASSWORD?.trim()
      || '';
    const securityToken =
      process.env.OAUTH_INTEGRATION_SECURITY_TOKEN?.trim()
      || process.env.OAUTH_SECURITY_TOKEN?.trim()
      || '';
    return securityToken ? `${password}${securityToken}` : password;
  }

  private buildIntegrationTokenRequestBody(): { grantType: string; body: URLSearchParams } {
    const grantType = this.integrationGrantType;
    const username = this.integrationUsername;
    const password = this.integrationPassword;

    const usePasswordGrant =
      grantType === 'password' || (!grantType && Boolean(username && password));

    if (usePasswordGrant) {
      if (!username || !password) {
        throw new BadRequestException(
          'OAUTH_INTEGRATION_USERNAME and OAUTH_INTEGRATION_PASSWORD (or OAUTH_USERNAME / OAUTH_PASSWORD) are required for password grant.',
        );
      }
      return {
        grantType: 'password',
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: this.integrationClientId,
          client_secret: this.integrationClientSecret,
          username,
          password,
        }),
      };
    }

    if (grantType && grantType !== 'client_credentials') {
      throw new BadRequestException(
        `Unsupported OAUTH_INTEGRATION_GRANT_TYPE="${grantType}". Use "password" or "client_credentials", and set matching credentials in backend .env.`,
      );
    }

    console.warn(
      '[Salesforce] Using client_credentials — set OAUTH_INTEGRATION_GRANT_TYPE=password plus '
        + 'OAUTH_INTEGRATION_USERNAME and OAUTH_INTEGRATION_PASSWORD in AI-Nexus-backend/.env (not frontend .env).',
    );

    return {
      grantType: 'client_credentials',
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.integrationClientId,
        client_secret: this.integrationClientSecret,
      }),
    };
  }

  /**
   * Server-to-server access token for Salesforce Apex REST (create user, etc.).
   * Priority: OAUTH_INTEGRATION_ACCESS_TOKEN → password grant (env user/pass) → client_credentials.
   */
  async getIntegrationAccessToken(): Promise<string> {
    const staticToken = process.env.OAUTH_INTEGRATION_ACCESS_TOKEN?.trim();
    if (staticToken) {
      console.log('[Salesforce] Using OAUTH_INTEGRATION_ACCESS_TOKEN from environment.');
      return staticToken;
    }

    const url = this.integrationTokenUrl;
    const { grantType, body } = this.buildIntegrationTokenRequestBody();
    console.log('[Salesforce] Requesting integration access token via', grantType, 'at', url);

    try {
      const res = await axios.post<{ access_token?: string }>(url, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });
      const token = res.data?.access_token;
      if (!token) {
        throw new UnauthorizedException('Salesforce integration token response did not include access_token.');
      }
      console.log('[Salesforce] Integration access token obtained via', grantType);
      return token;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error(`[Salesforce] ${grantType} token failed:`, {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        const desc =
          (err.response?.data as { error_description?: string })?.error_description
          || (err.response?.data as { message?: string })?.message
          || err.message;
        throw new BadRequestException(
          desc
            || `Failed to obtain Salesforce integration token (${grantType}). Check OAUTH_* integration settings in backend .env.`,
        );
      }
      throw err;
    }
  }

  /** Create a Salesforce user via Apex REST createuserfornexus (pre-SSO membership signup). */
  async createSalesforceNexusUser(payload: {
    salutation: string;
    first_name: string;
    last_name: string;
    name_as_per_id: string;
    email: string;
  }): Promise<Record<string, unknown>> {
    const email = normalizeEmail(payload.email);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.createNexusUserUrl;
    const body = {
      salutation: payload.salutation.trim(),
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      name_as_per_id: payload.name_as_per_id.trim(),
      email,
    };

    console.log('[Salesforce] Creating Nexus user via Apex REST:', {
      url,
      email: body.email,
      salutation: body.salutation,
    });

    try {
      const res = await axios.post<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      });
      console.log('[Salesforce] createuserfornexus response status:', res.status);
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] createuserfornexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        const data = err.response?.data as { message?: string; error?: string; error_description?: string };
        const desc =
          data?.message || data?.error_description || data?.error || err.message;
        throw new BadRequestException(desc || 'Failed to create Salesforce membership account.');
      }
      throw err;
    }
  }

  /** Set login password for a Nexus user via Apex REST setpasswordfornexus (after account creation). */
  async setSalesforceNexusPassword(payload: {
    username: string;
    password: string;
  }): Promise<Record<string, unknown>> {
    const username = payload.username?.trim();
    const password = payload.password;
    if (!username) {
      throw new BadRequestException('Salesforce username is required.');
    }
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.setNexusPasswordUrl;
    const body = { username, password };

    console.log('[Salesforce] Setting Nexus user password via Apex REST:', { url, username });

    try {
      const res = await axios.post<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      });
      console.log('[Salesforce] setpasswordfornexus response status:', res.status);
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] setpasswordfornexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        const data = err.response?.data as { message?: string; error?: string; error_description?: string };
        const desc =
          data?.message || data?.error_description || data?.error || err.message;
        throw new BadRequestException(desc || 'Failed to set Salesforce password.');
      }
      throw err;
    }
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

  /**
   * Call the Salesforce custom Apex REST userinfonexus endpoint using the IdP
   * access token as a Bearer token, and return the parsed payload.
   *
   * Sample response:
   * {
   *   "username": "gdbho0fnm1c@rovqen.sbs",
   *   "memberClass": "Non member",
   *   "lastName": "Doe",
   *   "isSCAQCandidate": false,
   *   "isAssociateMember": false,
   *   "firstName": "John",
   *   "accountType": "Non member",
   *   "accountID": "001fV000009XewGQAS"
   * }
   *
   * Returns null on failure so callers can treat this as best-effort enrichment.
   */
  async fetchSalesforceNexusUserInfo(accessToken: string): Promise<SalesforceNexusUserInfo | null> {
    const url = this.userinfoNexusUrl;
    if (!url || !accessToken) {
      console.warn('[SSO Login] Skipping nexus user info fetch — missing URL or access token.', {
        hasUrl: Boolean(url),
        hasToken: Boolean(accessToken),
      });
      return null;
    }
    try {
      console.log('[SSO Login] Fetching Salesforce nexus user info from', url);
      const res = await axios.get<SalesforceNexusUserInfo>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        timeout: 15000,
      });
      console.log('[SSO Login] Nexus user info response status:', res.status);
      console.log('[SSO Login] Nexus user info payload:', res.data);
      return res.data || null;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[SSO Login] Nexus user info fetch failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
          url,
        });
      } else {
        console.error('[SSO Login] Nexus user info fetch failed (unknown error):', err);
      }
      return null;
    }
  }

  /** Create or update user from IdP data and issue our access token only (no refresh token). */
  async processOAuthAuthentication(
    idpUserInfo: IdPUserInfo,
    idpAccessToken: string,
    syncFn?: (userId: string) => Promise<unknown>,
  ): Promise<ProcessOAuthResult> {
    console.log('[SSO Login] Raw IdP userinfo received:', idpUserInfo);
    console.log('[SSO Login] IdP access token (masked):', this.maskToken(idpAccessToken));

    const email = normalizeEmail(idpUserInfo.email || idpUserInfo.sub || '');
    if (!email) {
      console.warn('[SSO Login] IdP did not return an email. Userinfo keys:', Object.keys(idpUserInfo || {}));
      throw new UnauthorizedException('Identity provider did not return an email.');
    }
    const socialId = idpUserInfo.user_id || idpUserInfo.sub || '';
    const firstName = idpUserInfo.given_name || idpUserInfo.first_name || idpUserInfo.name || '';
    const lastName = idpUserInfo.family_name || idpUserInfo.last_name || '';

    let user = await this.userRepository.findOne({ where: { email } });
    const isNewUser = !user;

    console.log('[SSO Login] Resolved identity:', {
      email,
      socialId,
      firstName,
      lastName,
      isNewUser,
      existingUserId: user?.id || null,
    });

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
      console.log('[SSO Login] Creating NEW user for SSO email:', email, 'username:', username);
    } else {
      user.authProvider = AuthProvider.OAUTH;
      user.socialId = socialId || user.socialId || null;
      user.socialAccessToken = idpAccessToken;
      user.isVerified = true;
      if (firstName) user.firstname = firstName;
      if (lastName) user.lastname = lastName;
      console.log('[SSO Login] Updating EXISTING user via SSO:', { id: user.id, email });
    }

    // Best-effort: hit Salesforce custom Apex REST nexus user info using the
    // IdP access token as a Bearer token. Persist the SCAQ/Associate/account
    // flags onto the user so the eligibility flow can verify them automatically.
    const nexusInfo = await this.fetchSalesforceNexusUserInfo(idpAccessToken);
    if (nexusInfo && typeof nexusInfo === 'object') {
      const previous = {
        accountId: user.salesforceAccountId,
        accountType: user.salesforceAccountType,
        isSCAQCandidate: user.isSCAQCandidate,
        isAssociateMember: user.isAssociateMember,
      };
      user.salesforceUsername = nexusInfo.username ?? user.salesforceUsername ?? null;
      user.salesforceMemberClass = nexusInfo.memberClass ?? user.salesforceMemberClass ?? null;
      user.salesforceAccountType = nexusInfo.accountType ?? user.salesforceAccountType ?? null;
      user.salesforceAccountId = nexusInfo.accountID ?? user.salesforceAccountId ?? null;
      user.isSCAQCandidate =
        typeof nexusInfo.isSCAQCandidate === 'boolean' ? nexusInfo.isSCAQCandidate : user.isSCAQCandidate ?? null;
      user.isAssociateMember =
        typeof nexusInfo.isAssociateMember === 'boolean'
          ? nexusInfo.isAssociateMember
          : user.isAssociateMember ?? null;
      user.salesforceUserInfoRaw = nexusInfo as Record<string, unknown>;
      user.salesforceSyncedAt = new Date();
      console.log('[SSO Login] Salesforce nexus flags applied to user:', {
        before: previous,
        after: {
          accountId: user.salesforceAccountId,
          accountType: user.salesforceAccountType,
          memberClass: user.salesforceMemberClass,
          isSCAQCandidate: user.isSCAQCandidate,
          isAssociateMember: user.isAssociateMember,
        },
      });
    } else {
      console.warn('[SSO Login] No Salesforce nexus user info available — SCAQ/Associate flags NOT updated.');
    }

    const payload = { id: user.id, email: user.email, role: user.role, type: 'access' };
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    await this.userRepository.save(user);

    console.log('[SSO Login] User persisted after SSO login:', {
      id: user.id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      status: user.status,
      authProvider: user.authProvider,
      socialId: user.socialId,
      isVerified: user.isVerified,
      isNewUser,
      salesforce: {
        accountId: user.salesforceAccountId,
        accountType: user.salesforceAccountType,
        memberClass: user.salesforceMemberClass,
        username: user.salesforceUsername,
        isSCAQCandidate: user.isSCAQCandidate,
        isAssociateMember: user.isAssociateMember,
        syncedAt: user.salesforceSyncedAt,
      },
      issuedAccessToken: this.maskToken(accessToken),
    });

    if (syncFn) {
      try {
        await syncFn(user.id);
        console.log('[SSO Login] SSO sync completed for user:', user.id);
      } catch (syncErr) {
        console.error('SSO sync failed (non-fatal):', syncErr);
      }
    }

    return { user, accessToken, isNewUser };
  }

  /** Mask a token for safe logging (keep first 6 and last 4 chars only). */
  private maskToken(token: string | null | undefined): string {
    const value = String(token || '');
    if (!value) return '<empty>';
    if (value.length <= 12) return `${value.slice(0, 2)}...${value.slice(-2)}`;
    return `${value.slice(0, 6)}...${value.slice(-4)} (len=${value.length})`;
  }

  private async generateUniqueUsername(email: string, first: string, last: string): Promise<string> {
    const base = [first, last].filter(Boolean).join('').replace(/\s+/g, '') || email.split('@')[0];
    const sanitized = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 20) || 'user';
    const withRequiredPattern = /[a-z]/.test(sanitized) && /\d/.test(sanitized) ? sanitized : `${sanitized}1`;
    let username = withRequiredPattern;
    let n = 0;
    while (
      await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.username) = LOWER(:username)', { username })
        .getOne()
    ) {
      username = `${withRequiredPattern}${++n}`;
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

  /**
   * SCAQ flow: call memberclassupdate for accountId, re-fetch nexus info, require isAssociateMember === true.
   */
  async promoteUserToAssociateMember(userId: string): Promise<{
    success: boolean;
    message: string;
    user: UserEntity; 
    salesforce: SalesforceNexusUserInfo | null;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    if (!user.socialAccessToken) {
      throw new BadRequestException('Salesforce session expired. Please sign in with SSO again.');
    }
    const accountId = user.salesforceAccountId?.trim();
    if (!accountId) {
      throw new BadRequestException('Salesforce account id is missing. Please sign in with SSO again.');
    }

    if (user.isSCAQCandidate !== true) {
      throw new BadRequestException('Salesforce profile is not confirmed as an SCAQ Programme candidate.');
    }

    if (user.isAssociateMember === true) {
      console.log('[SSO Login] User already Associate member — skipping memberclassupdate:', { userId, accountId });
      return {
        success: true,
        message: 'Already an Associate member.',
        user,
        salesforce: (user.salesforceUserInfoRaw as SalesforceNexusUserInfo) || null,
      };
    }

    const integrationAccessToken = await this.getIntegrationAccessToken();
    const url = this.buildMemberClassUpdateUrl(accountId);
    console.log('[SSO Login] SCAQ member class update (integration/admin token):', {
      userId,
      accountId,
      url,
      token: this.maskToken(integrationAccessToken),
    });
    try {
      await axios.post(url, {}, {
        headers: {
          Authorization: `Bearer ${integrationAccessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 20000,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[SSO Login] memberclassupdate failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
          url,
        });
        const desc =
          (err.response?.data as { message?: string; error_description?: string })?.message
          || (err.response?.data as { error_description?: string })?.error_description
          || err.message;
        throw new BadRequestException(desc || 'Failed to update member class in Salesforce.');
      }
      throw err;
    }

    const nexusInfo = await this.fetchSalesforceNexusUserInfo(user.socialAccessToken);
    if (nexusInfo) {
      user.salesforceUsername = nexusInfo.username ?? user.salesforceUsername ?? null;
      user.salesforceMemberClass = nexusInfo.memberClass ?? user.salesforceMemberClass ?? null;
      user.salesforceAccountType = nexusInfo.accountType ?? user.salesforceAccountType ?? null;
      user.salesforceAccountId = nexusInfo.accountID ?? user.salesforceAccountId ?? null;
      user.isSCAQCandidate =
        typeof nexusInfo.isSCAQCandidate === 'boolean' ? nexusInfo.isSCAQCandidate : user.isSCAQCandidate;
      user.isAssociateMember =
        typeof nexusInfo.isAssociateMember === 'boolean' ? nexusInfo.isAssociateMember : user.isAssociateMember;
      user.salesforceUserInfoRaw = nexusInfo as Record<string, unknown>;
      user.salesforceSyncedAt = new Date();
      await this.userRepository.save(user);
    }

    if (user.isAssociateMember !== true) {
      console.warn('[SSO Login] memberclassupdate completed but isAssociateMember is not true:', {
        userId,
        accountId,
        isAssociateMember: user.isAssociateMember,
      });
      throw new BadRequestException(
        'Associate member status was not confirmed in Salesforce after update. Please contact support or try again.',
      );
    }

    console.log('[SSO Login] SCAQ Associate verified after memberclassupdate:', {
      userId,
      accountId,
      isAssociateMember: user.isAssociateMember,
      memberClass: user.salesforceMemberClass,
    });

    return {
      success: true,
      message: 'Associate member status confirmed in Salesforce.',
      user,
      salesforce: nexusInfo,
    };
  }
}
