// src/auth/oauth-auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { UserEntity, AuthProvider, UserRole, UserStatus } from '../user/users.entity';
import { normalizeEmail } from '../utils/auth.utils';
import {
  buildOAuthApplicationApiUrl,
  type OAuthApplicationApiRouteKey,
} from '../config/oauth-application-api.config';
import {
  MEMBERSHIP_PICKLIST_DEFINITIONS,
  MEMBERSHIP_PICKLIST_KEY_VALUES,
  getMembershipPicklistApiVersion,
  getMembershipPicklistDefinition,
  type MembershipPicklistKey,
} from './membership-application/picklists';
import {
  buildOAuthStudentMembershipApiUrl,
  type OAuthStudentMembershipApiRouteKey,
} from '../config/oauth-student-membership-api.config';
import {
  normalizeSingaporeNricFin,
  resolveSalesforceIdTypeByCardColorOrNationality,
  validateSingaporeNricFin,
  SINGAPORE_NRIC_FIN_USER_MESSAGES,
  mapSingaporeNricFinUserErrorMessage,
  isSalesforceCitizenOrPrNricIdType,
} from './utils/singapore-nric-fin.util';
import { assertNricFinAvailableForAccountCreation } from './utils/nric-registration-guard.util';

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

/** Response from POST /services/apexrest/memberclassupdate?accountId=... */
export interface SalesforceMemberClassUpdateResult {
  updatedMemberClass?: string | null;
  success?: boolean;
  scaqSfdcId?: string | null;
  previousMemberClass?: string | null;
  message?: string;
  accountId?: string;
  [key: string]: unknown;
}

/** Custom Salesforce Apex REST payload from /services/apexrest/userinfonexus. */
export interface SalesforceNexusUserInfo {
  username?: string;
  memberClass?: string;
  membershipStatus?: string;
  lastName?: string;
  firstName?: string;
  accountType?: string;
  accountID?: string;
  isSCAQCandidate?: boolean;
  isAssociateMember?: boolean;
  isAINexusUser?: boolean;
  idType?: string;
  NRIC_Number?: string;
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
  salesforceMembershipStatus: string;
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

  /** Apex REST path to clear Salesforce mobile app session on logout. */
  private get clearSessionPath(): string {
    const p =
      process.env.OAUTH_CLEAR_SESSION_PATH
      || '/services/apexrest/v1/bodmobileapp/clearsession';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get clearSessionUrl(): string {
    const fullUrl = process.env.OAUTH_CLEAR_SESSION_URL?.trim();
    if (fullUrl) return fullUrl;
    return `${this.baseUrl}${this.clearSessionPath}`;
  }

  /** Browser logout path (ends Salesforce SSO cookies in the user's browser). */
  private get browserLogoutPath(): string {
    const p = process.env.OAUTH_BROWSER_LOGOUT_PATH || '/secur/logout.jsp';
    return p.startsWith('/') ? p : `/${p}`;
  }

  /**
   * URL to load in the browser on app logout so the next SSO login is not silent.
   * Override with OAUTH_BROWSER_LOGOUT_URL (e.g. Experience Cloud site logout).
   */
  buildBrowserLogoutUrl(retUrl?: string): string | null {
    const explicit = process.env.OAUTH_BROWSER_LOGOUT_URL?.trim();
    const base = explicit || (this.baseUrl ? `${this.baseUrl}${this.browserLogoutPath}` : '');
    if (!base) return null;

    const returnTarget =
      String(retUrl || process.env.OAUTH_BROWSER_LOGOUT_RET_URL || '').trim();
    if (!returnTarget) return base;

    try {
      const url = new URL(base);
      url.searchParams.set('retUrl', returnTarget);
      return url.toString();
    } catch {
      const sep = base.includes('?') ? '&' : '?';
      return `${base}${sep}retUrl=${encodeURIComponent(returnTarget)}`;
    }
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

  private resolveApplicationApiUrl(route: OAuthApplicationApiRouteKey): string {
    return buildOAuthApplicationApiUrl(route, {
      siteBaseUrl: process.env.OAUTH_INSTANCE_URL?.trim(),
      integrationBaseUrl: this.integrationApiBaseUrl,
    });
  }

  get applicationCreateUrl(): string {
    return this.resolveApplicationApiUrl('create');
  }

  get applicationPersonalDetailsUrl(): string {
    return this.resolveApplicationApiUrl('personalDetails');
  }

  get applicationEmploymentDetailsUrl(): string {
    return this.resolveApplicationApiUrl('employmentDetails');
  }

  get applicationAcademicQualificationUrl(): string {
    return this.resolveApplicationApiUrl('academicQualification');
  }

  get applicationProfessionalQualificationUrl(): string {
    return this.resolveApplicationApiUrl('professionalQualification');
  }

  get applicationAtoUrl(): string {
    return this.resolveApplicationApiUrl('ato');
  }

  get applicationOpbUrl(): string {
    return this.resolveApplicationApiUrl('opb');
  }

  get applicationCharacterReferenceUrl(): string {
    return this.resolveApplicationApiUrl('characterReference');
  }

  get applicationDeclarationUrl(): string {
    return this.resolveApplicationApiUrl('declaration');
  }

  get applicationResidentialDeclarationUrl(): string {
    return this.resolveApplicationApiUrl('residentialDeclaration');
  }

  get applicationAvailableDocumentTypesUrl(): string {
    return this.resolveApplicationApiUrl('availableDocumentTypes');
  }

  get applicationUploadDocumentUrl(): string {
    return this.resolveApplicationApiUrl('uploadDocument');
  }

  get applicationCheckoutDetailsUrl(): string {
    return this.resolveApplicationApiUrl('checkoutDetails');
  }

  get applicationCreateBillingUrl(): string {
    return this.resolveApplicationApiUrl('createBilling');
  }

  get applicationOrganisationNamesUrl(): string {
    return this.resolveApplicationApiUrl('organisationNames');
  }

  get applicationAccountancyBodyNamesUrl(): string {
    return this.resolveApplicationApiUrl('accountancyBodyNames');
  }

  private resolveStudentMembershipApiUrl(
    route: OAuthStudentMembershipApiRouteKey,
    applicationId?: string,
  ): string {
    return buildOAuthStudentMembershipApiUrl(route, {
      siteBaseUrl: process.env.OAUTH_INSTANCE_URL?.trim(),
      integrationBaseUrl: this.integrationApiBaseUrl,
      applicationId,
    });
  }

  private async resolveStudentMembershipBearerToken(socialAccessToken?: string): Promise<string> {
    const social = String(socialAccessToken || '').trim();
    if (social) return social;
    return this.getIntegrationAccessToken();
  }

  private async callSalesforceStudentMembershipApi(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH',
    url: string,
    socialAccessToken: string | undefined,
    body: Record<string, unknown> | undefined,
    logLabel: string,
    errorMessage: string,
  ): Promise<Record<string, unknown>> {
    const token = await this.resolveStudentMembershipBearerToken(socialAccessToken);

    console.log(`[Salesforce] ${logLabel}:`, { url, method, applicationId: body?.applicationId });

    try {
      const res = await axios.request<Record<string, unknown>>({
        method,
        url,
        data: body,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error(`[Salesforce] ${logLabel} failed:`, {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        this.throwMappedSalesforceApplicationApiError(err, errorMessage);
      }
      throw err;
    }
  }

  /** POST student-membership/application — create student membership application. */
  async createStudentMembershipApplication(
    socialAccessToken: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = this.resolveStudentMembershipApiUrl('application');
    return this.callSalesforceStudentMembershipApi(
      'POST',
      url,
      socialAccessToken,
      payload,
      'createStudentMembershipApplication',
      'Failed to create student membership application in Salesforce.',
    );
  }

  /** PUT student-membership/updateapplication/{id} */
  async updateStudentMembershipApplication(
    socialAccessToken: string | undefined,
    applicationId: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const id = String(applicationId || '').trim();
    if (!id) {
      throw new BadRequestException('applicationId is required.');
    }
    const url = this.resolveStudentMembershipApiUrl('updateApplication', id);
    return this.callSalesforceStudentMembershipApi(
      'PUT',
      url,
      socialAccessToken,
      payload,
      'updateStudentMembershipApplication',
      'Failed to update student membership application in Salesforce.',
    );
  }

  /** PATCH student-membership/applicationsubmit/{id} */
  async submitStudentMembershipApplication(
    socialAccessToken: string | undefined,
    applicationId: string,
    payload: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>> {
    const id = String(applicationId || '').trim();
    if (!id) {
      throw new BadRequestException('applicationId is required.');
    }
    const url = this.resolveStudentMembershipApiUrl('submitApplication', id);
    return this.callSalesforceStudentMembershipApi(
      'PATCH',
      url,
      socialAccessToken,
      Object.keys(payload).length ? payload : undefined,
      'submitStudentMembershipApplication',
      'Failed to submit student membership application in Salesforce.',
    );
  }

  /** POST student-membership/usercheck */
  async checkStudentMembershipUser(
    socialAccessToken: string | undefined,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = this.resolveStudentMembershipApiUrl('userCheck');
    return this.callSalesforceStudentMembershipApi(
      'POST',
      url,
      socialAccessToken,
      payload,
      'checkStudentMembershipUser',
      'Failed to check student membership user in Salesforce.',
    );
  }

  /** GET student-membership/getapplicationdetails/{id} */
  async getStudentMembershipApplicationDetails(
    socialAccessToken: string | undefined,
    applicationId: string,
  ): Promise<Record<string, unknown>> {
    const id = String(applicationId || '').trim();
    if (!id) {
      throw new BadRequestException('applicationId is required.');
    }
    const url = this.resolveStudentMembershipApiUrl('getApplicationDetails', id);
    return this.callSalesforceStudentMembershipApi(
      'GET',
      url,
      socialAccessToken,
      undefined,
      'getStudentMembershipApplicationDetails',
      'Failed to load student membership application details from Salesforce.',
    );
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
  buildOAuthState(options?: { scaqVerify?: boolean; deferredAuth?: boolean }): string {
    return Buffer.from(
      JSON.stringify({
        scaqVerify: Boolean(options?.scaqVerify),
        deferredAuth: Boolean(options?.deferredAuth),
        ts: Date.now(),
      }),
    ).toString('base64url');
  }

  /** Decode OAuth state from the IdP callback. */
  parseOAuthState(state?: string): { scaqVerify: boolean; deferredAuth: boolean } {
    if (!state?.trim()) return { scaqVerify: false, deferredAuth: false };
    try {
      const json = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
        scaqVerify?: boolean | number | string;
        deferredAuth?: boolean | number | string;
      };
      const flag = json.scaqVerify;
      const deferred = json.deferredAuth;
      return {
        scaqVerify: flag === true || flag === 1 || flag === '1',
        deferredAuth: deferred === true || deferred === 1 || deferred === '1',
      };
    } catch {
      return {
        scaqVerify: state === 'scaq_verify' || state.includes('scaq_verify'),
        deferredAuth: state.includes('deferred_auth'),
      };
    }
  }

  /** Build authorization URL for IdP. */
  generateAuthUrl(options?: { scaqVerify?: boolean; deferredAuth?: boolean }): { authUrl: string; state: string } {
    const base = this.baseUrl;
    const path = this.authPath;
    const clientId = this.clientId;
    const redirectUri = this.redirectUri;
    const state = this.buildOAuthState({
      scaqVerify: options?.scaqVerify,
      deferredAuth: options?.deferredAuth,
    });
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

    if (
      options.scaqVerify
      && isSCAQCandidate !== true
      && !this.isSalesforceMemberAccountType(nexusInfo?.accountType)
    ) {
      console.log('[SSO Login] SCAQ verify-only: not a confirmed candidate — skipping DB persist', {
        email,
        isSCAQCandidate,
        isAssociateMember,
        accountType: nexusInfo?.accountType,
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
          salesforceMembershipStatus: String(nexusInfo?.membershipStatus || '').trim(),
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
      salesforceMembershipStatus: profile.salesforceMembershipStatus,
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
    id_type?: string;
    id_number?: string;
  }): Promise<Record<string, unknown>> {
    const email = normalizeEmail(payload.email);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }

    const idType = String(payload.id_type || '').trim();
    const idNumber = normalizeSingaporeNricFin(payload.id_number || '');
    if (idType || idNumber) {
      if (!idType || !idNumber) {
        throw new BadRequestException(SINGAPORE_NRIC_FIN_USER_MESSAGES.missingIdDetails);
      }
      if (idType !== 'Blue NRIC' && idType !== 'Pink NRIC') {
        throw new BadRequestException(SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidIdType);
      }
      let validation;
      try {
        validation = validateSingaporeNricFin(idNumber);
      } catch {
        throw new BadRequestException(SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidFormat);
      }
      if (!validation.isValid) {
        throw new BadRequestException(SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidChecksum);
      }

      await assertNricFinAvailableForAccountCreation(this.userRepository, idNumber);
    }

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.createNexusUserUrl;
    const body: Record<string, string> = {
      salutation: payload.salutation.trim(),
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      name_as_per_id: payload.name_as_per_id.trim(),
      email,
    };
    if (idType && idNumber) {
      body.id_type = idType;
      body.id_number = idNumber;
    }

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
        const rawDescription = this.extractSalesforceErrorDescription(
          err.response?.data,
          err.message,
        );
        const desc = this.mapCreateNexusUserErrorMessage(rawDescription);
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
        const rawDescription = this.extractSalesforceErrorDescription(
          err.response?.data,
          err.message,
        );
        const desc = this.mapSetNexusPasswordErrorMessage(rawDescription);
        throw new BadRequestException(desc || 'Failed to set Salesforce password.');
      }
      throw err;
    }
  }

  /**
   * POST ApplicationAPI/createApplicationNexus — creates application record; returns applicationId.
   * Must run before Personal and all other application tabs.
   */
  async createApplicationNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);

    const accountId = String(payload.accountId || '').trim();
    if (!accountId) {
      throw new BadRequestException('Salesforce accountId is required.');
    }

    const recordTypeName = String(payload.recordTypeName || '').trim();
    if (!recordTypeName) {
      throw new BadRequestException('recordTypeName is required.');
    }

    const accountingQualification = String(payload.accountingQualification || '').trim();
    const experiencedMemberType = String(payload.experiencedMemberType || '').trim();
    const normalizedRecordType = recordTypeName.toLowerCase();
    const isExperiencedRecord =
      recordTypeName === 'Member_Application'
      || normalizedRecordType.includes('experienced')
      || Boolean(experiencedMemberType);

    if (!accountingQualification && !isExperiencedRecord) {
      throw new BadRequestException('accountingQualification is required.');
    }

    const url = this.applicationCreateUrl;
    const body: Record<string, unknown> = {
      accountId,
      recordTypeName,
      ...(accountingQualification ? { accountingQualification } : {}),
      ...(experiencedMemberType ? { experiencedMemberType } : {}),
    };

    console.log('[Salesforce] createApplicationNexus:', {
      url,
      accountId,
      recordTypeName,
      accountingQualification,
    });

    try {
      const res = await axios.post<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] createApplicationNexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        this.throwMappedSalesforceApplicationApiError(
          err,
          'Failed to create application in Salesforce.',
        );
      }
      throw err;
    }
  }

  /**
   * POST ApplicationAPI/createApplicationPersonalDetailsNexus (membership application — Personal tab).
   * Uses the member's Salesforce SSO access token (not the integration service account).
   */
  async createApplicationPersonalDetailsNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);

    const accountId = String(payload.accountId || '').trim();
    if (!accountId) {
      throw new BadRequestException('Salesforce accountId is required.');
    }

    const url = this.applicationPersonalDetailsUrl;
    const body: Record<string, unknown> = { ...payload, accountId };

    console.log('[Salesforce] createApplicationPersonalDetailsNexus:', {
      url,
      accountId,
      applicationId: body.applicationId,
    });

    try {
      const res = await axios.post<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] createApplicationPersonalDetailsNexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        this.throwMappedSalesforceApplicationApiError(
          err,
          'Failed to submit personal details to Salesforce.',
        );
      }
      throw err;
    }
  }

  private decodeSalesforceUiLabel(value: string): string {
    return String(value || '')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private getMembershipPicklistPath(definition: {
    objectName: string;
    recordTypeId: string;
    field: string;
  }): string {
    const apiVersion = getMembershipPicklistApiVersion();
    return `/services/data/${apiVersion}/ui-api/object-info/${definition.objectName}/picklist-values/${definition.recordTypeId}/${definition.field}`;
  }

  private buildMembershipPicklistUrl(
    baseUrl: string,
    definition: { objectName: string; recordTypeId: string; field: string },
  ): string {
    const normalizedBase = baseUrl.replace(/\/$/, '');
    return `${normalizedBase}${this.getMembershipPicklistPath(definition)}`;
  }

  private parseEmploymentPicklistResponse(data: unknown): Array<{ label: string; value: string }> {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const values = Array.isArray(record.values) ? record.values : [];
    return values
      .map((entry) => {
        const item = entry as { label?: string; value?: string };
        const rawValue = String(item?.value || item?.label || '').trim();
        if (!rawValue) return null;
        const decoded = this.decodeSalesforceUiLabel(rawValue);
        return { label: decoded, value: decoded };
      })
      .filter((entry): entry is { label: string; value: string } => Boolean(entry));
  }

  private async fetchEmploymentPicklistWithToken(
    url: string,
    token: string,
  ): Promise<Array<{ label: string; value: string }>> {
    const res = await axios.get<{ values?: Array<{ label?: string; value?: string }> }>(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      timeout: 30000,
    });
    return this.parseEmploymentPicklistResponse(res.data);
  }

  /** Membership application Salesforce UI API picklists. */
  async getMembershipPicklist(
    socialAccessToken: string,
    picklistKey: MembershipPicklistKey,
  ): Promise<Array<{ label: string; value: string }>> {
    if (!MEMBERSHIP_PICKLIST_KEY_VALUES.includes(picklistKey)) {
      throw new BadRequestException('Unsupported picklist key.');
    }

    const definition = getMembershipPicklistDefinition(picklistKey);
    const { emptyMessage, failureMessage } = definition;
    const attempts: Array<{ label: string; url: string; token: string | Promise<string> }> = [];
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim()?.replace(/\/$/, '');
    const integrationBase =
      process.env.OAUTH_INTEGRATION_INSTANCE_URL?.trim()?.replace(/\/$/, '')
      || this.integrationApiBaseUrl;

    if (socialAccessToken?.trim()) {
      attempts.push({
        label: 'social-site',
        url: this.buildMembershipPicklistUrl(siteBase || integrationBase, definition),
        token: this.requireSalesforceSocialAccessToken(socialAccessToken),
      });
    }

    attempts.push({
      label: 'integration-core',
      url: this.buildMembershipPicklistUrl(integrationBase, definition),
      token: this.getIntegrationAccessToken(),
    });

    if (siteBase) {
      attempts.push({
        label: 'integration-site',
        url: this.buildMembershipPicklistUrl(siteBase, definition),
        token: this.getIntegrationAccessToken(),
      });
    }

    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        const token = await attempt.token;
        console.log('[Salesforce] Fetching membership picklist:', {
          attempt: attempt.label,
          picklistKey,
          field: definition.field,
          url: attempt.url,
        });
        const options = await this.fetchEmploymentPicklistWithToken(attempt.url, token);
        if (!options.length) {
          throw new BadRequestException(emptyMessage);
        }
        return options;
      } catch (err: unknown) {
        lastError = err;
        if (axios.isAxiosError(err)) {
          console.error('[Salesforce] membership picklist failed:', {
            attempt: attempt.label,
            picklistKey,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
      }
    }

    if (axios.isAxiosError(lastError)) {
      this.throwMappedSalesforceApplicationApiError(lastError, failureMessage);
    }

    if (lastError instanceof BadRequestException) {
      throw lastError;
    }

    throw new BadRequestException(failureMessage);
  }

  private parseOrganisationNameResponse(
    data: unknown,
  ): Array<{ label: string; value: string; id: string | null }> {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const rows = Array.isArray(record.data) ? record.data : [];
    const options: Array<{ label: string; value: string; id: string | null }> = [];

    for (const entry of rows) {
      const item = entry as { name?: string; id?: string | null };
      const name = String(item?.name || '').trim();
      if (!name) continue;
      options.push({
        label: name,
        value: name,
        id: item?.id ?? null,
      });
    }

    return options;
  }

  /** GET ApplicationAPI/getOrganisationNameForNexus — employment organisation names. */
  async getOrganisationNamesForNexus(
    socialAccessToken: string,
  ): Promise<Array<{ label: string; value: string; id: string | null }>> {
    const url = this.applicationOrganisationNamesUrl;
    const attempts: Array<{ label: string; token: string | Promise<string> }> = [];

    if (socialAccessToken?.trim()) {
      attempts.push({
        label: 'social',
        token: this.requireSalesforceSocialAccessToken(socialAccessToken),
      });
    }

    attempts.push({
      label: 'integration',
      token: this.getIntegrationAccessToken(),
    });

    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        const token = await attempt.token;
        console.log('[Salesforce] Fetching organisation names:', { attempt: attempt.label, url });
        const res = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          timeout: 30000,
        });
        const options = this.parseOrganisationNameResponse(res.data);
        if (!options.length) {
          throw new BadRequestException('Organisation name options were not returned from Salesforce.');
        }
        return options;
      } catch (err: unknown) {
        lastError = err;
        if (axios.isAxiosError(err)) {
          console.error('[Salesforce] organisation names failed:', {
            attempt: attempt.label,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
      }
    }

    if (axios.isAxiosError(lastError)) {
      this.throwMappedSalesforceApplicationApiError(
        lastError,
        'Failed to load organisation name options from Salesforce.',
      );
    }

    if (lastError instanceof BadRequestException) {
      throw lastError;
    }

    throw new BadRequestException('Failed to load organisation name options from Salesforce.');
  }

  private parseAccountancyBodyNameResponse(
    data: unknown,
  ): Array<{ label: string; value: string; id: string | null }> {
    const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    const rows = Array.isArray(record.data) ? record.data : [];
    const options: Array<{ label: string; value: string; id: string | null }> = [];

    for (const entry of rows) {
      const item = entry as { institutionName?: string; id?: string | null };
      const institutionName = String(item?.institutionName || '').trim();
      const id = String(item?.id || '').trim();
      if (!institutionName || !id) continue;
      options.push({
        label: institutionName,
        value: id,
        id,
      });
    }

    return options;
  }

  /** GET ApplicationAPI/getNameOfAccountancyBodyForNexus — character reference accountancy bodies. */
  async getAccountancyBodyNamesForNexus(
    socialAccessToken: string,
  ): Promise<Array<{ label: string; value: string; id: string | null }>> {
    const url = this.applicationAccountancyBodyNamesUrl;
    const attempts: Array<{ label: string; token: string | Promise<string> }> = [];

    if (socialAccessToken?.trim()) {
      attempts.push({
        label: 'social',
        token: this.requireSalesforceSocialAccessToken(socialAccessToken),
      });
    }

    attempts.push({
      label: 'integration',
      token: this.getIntegrationAccessToken(),
    });

    let lastError: unknown;

    for (const attempt of attempts) {
      try {
        const token = await attempt.token;
        console.log('[Salesforce] Fetching accountancy body names:', { attempt: attempt.label, url });
        const res = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          timeout: 30000,
        });
        const options = this.parseAccountancyBodyNameResponse(res.data);
        if (!options.length) {
          throw new BadRequestException(
            'Accountancy body options were not returned from Salesforce.',
          );
        }
        return options;
      } catch (err: unknown) {
        lastError = err;
        if (axios.isAxiosError(err)) {
          console.error('[Salesforce] accountancy body names failed:', {
            attempt: attempt.label,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
        }
      }
    }

    if (axios.isAxiosError(lastError)) {
      this.throwMappedSalesforceApplicationApiError(
        lastError,
        'Failed to load accountancy body options from Salesforce.',
      );
    }

    if (lastError instanceof BadRequestException) {
      throw lastError;
    }

    throw new BadRequestException('Failed to load accountancy body options from Salesforce.');
  }

  /** @deprecated Use getMembershipPicklist */
  async getEmploymentPicklist(
    socialAccessToken: string,
    fieldName: string,
  ): Promise<Array<{ label: string; value: string }>> {
    const entry = Object.entries(MEMBERSHIP_PICKLIST_DEFINITIONS).find(
      ([, definition]) => definition.field === fieldName,
    );
    if (!entry) {
      throw new BadRequestException('Unsupported employment picklist field.');
    }
    return this.getMembershipPicklist(socialAccessToken, entry[0] as MembershipPicklistKey);
  }

  /**
   * POST ApplicationAPI/createEmploymentDetailsNexus (membership application — Work Experience tab).
   */
  async createApplicationEmploymentDetailsNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);

    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }

    const url = this.applicationEmploymentDetailsUrl;
    const body: Record<string, unknown> = { ...payload, applicationId };

    if (Array.isArray(body.currentWorkExperience)) {
      body.currentWorkExperience = (body.currentWorkExperience as Record<string, unknown>[]).map(
        (row) => {
          const { periodTo: _periodTo, ...rest } = row;
          return { ...rest, isCurrentEmployment: true };
        },
      );
    }

    const previousWorkExperience = body.previousWorkExperience;
    console.log('[Salesforce] createEmploymentDetailsNexus:', {
      url,
      applicationId,
      experienceCount: Array.isArray(previousWorkExperience)
        ? previousWorkExperience.length
        : 0,
    });

    try {
      const res = await axios.post<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] createEmploymentDetailsNexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        this.throwMappedSalesforceApplicationApiError(
          err,
          'Failed to submit employment details to Salesforce.',
        );
      }
      throw err;
    }
  }

  static readonly SALESFORCE_SOCIAL_TOKEN_EXPIRED = 'SALESFORCE_SOCIAL_TOKEN_EXPIRED';

  private isSalesforceSocialTokenExpired(status?: number, description?: string): boolean {
    if (status === 401) return true;
    const text = (description || '').toLowerCase();
    return (
      /expired/.test(text)
      && (/token|session|eservices|idp|salesforce|social|unauthorized|invalid/.test(text)
        || /sign in again/.test(text))
    );
  }

  private mapCreateNexusUserErrorMessage(description: string): string {
    const text = String(description || '').trim();
    const mapped = mapSingaporeNricFinUserErrorMessage(text);
    if (mapped !== text) {
      return mapped;
    }

    const lower = text.toLowerCase();
    if (lower.includes('already') && (lower.includes('registered') || lower.includes('exists'))) {
      return 'An account with this NRIC or email already exists. Please sign in instead.';
    }

    const withoutStack = text.split('\n')[0]?.trim();
    if (withoutStack && withoutStack !== text) {
      const apexPrefix = /^System\.\w+Exception:\s*/;
      const cleaned = withoutStack.replace(apexPrefix, '').replace(/^UNKNOWN_EXCEPTION:\s*/i, '').trim();
      const remapped = mapSingaporeNricFinUserErrorMessage(cleaned);
      return remapped !== cleaned ? remapped : cleaned || text;
    }

    return text;
  }

  private mapSetNexusPasswordErrorMessage(description: string): string {
    const text = String(description || '').trim();
    const lower = text.toLowerCase();

    if (lower.includes('invalid repeated password') || lower.includes('repeated password')) {
      return 'This password was used before. Please choose a different password.';
    }

    // Strip Apex stack trace noise from other Salesforce password errors.
    const withoutStack = text.split('\n')[0]?.trim();
    if (withoutStack && withoutStack !== text) {
      const apexPrefix = /^System\.\w+Exception:\s*/;
      return withoutStack.replace(apexPrefix, '').replace(/^UNKNOWN_EXCEPTION:\s*/i, '').trim() || text;
    }

    return text;
  }

  private extractSalesforceErrorDescription(data: unknown, fallbackMessage: string): string {
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0] as Record<string, unknown>;
      const message = String(first?.message || '').trim();
      if (message) {
        const picklistMatch = message.match(
          /INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST,\s*([^:]+):\s*bad value for restricted picklist field:\s*([^:\[]+)/i,
        );
        if (picklistMatch) {
          const field = picklistMatch[1].trim();
          const value = picklistMatch[2].trim();
          return `${field}: "${value}" is not a valid option. Please update the form and try again.`;
        }
        return message;
      }
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const record = data as Record<string, unknown>;
      return String(
        record.message
          || record.errorDetails
          || record.error_description
          || record.error
          || '',
      ).trim();
    }

    return fallbackMessage;
  }

  private throwMappedSalesforceApplicationApiError(
    err: unknown,
    fallbackMessage: string,
  ): never {
    if (!axios.isAxiosError(err)) {
      throw err;
    }

    const data = err.response?.data;
    const description = String(
      this.extractSalesforceErrorDescription(data, '')
        || err.message
        || '',
    ).trim();

    if (this.isSalesforceSocialTokenExpired(err.response?.status, description)) {
      throw new UnauthorizedException(
        `${OAuthAuthService.SALESFORCE_SOCIAL_TOKEN_EXPIRED}: Your eServices session has expired. Please sign in again.`,
      );
    }

    throw new BadRequestException(description || fallbackMessage);
  }

  private requireSalesforceSocialAccessToken(socialAccessToken: string): string {
    const token = socialAccessToken?.trim();
    if (!token) {
      throw new UnauthorizedException(
        `${OAuthAuthService.SALESFORCE_SOCIAL_TOKEN_EXPIRED}: Salesforce social access token is required. Please sign in with eServices again.`,
      );
    }
    return token;
  }

  private async postSalesforceApplicationApi(
    url: string,
    socialAccessToken: string,
    body: Record<string, unknown>,
    logLabel: string,
    errorMessage: string,
  ): Promise<Record<string, unknown>> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);

    console.log(`[Salesforce] ${logLabel}:`, { url, applicationId: body.applicationId });

    try {
      const res = await axios.post<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error(`[Salesforce] ${logLabel} failed:`, {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        this.throwMappedSalesforceApplicationApiError(err, errorMessage);
      }
      throw err;
    }
  }

  /** Academic qualification — optional; one record per POST. */
  async createAcademicQualificationNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    return this.postSalesforceApplicationApi(
      this.applicationAcademicQualificationUrl,
      socialAccessToken,
      { ...payload, applicationId },
      'createAcademicQualificationNexus',
      'Failed to submit academic qualification to Salesforce.',
    );
  }

  /** Professional qualification — one record per POST. */
  async createProfessionalQualificationNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    return this.postSalesforceApplicationApi(
      this.applicationProfessionalQualificationUrl,
      socialAccessToken,
      { ...payload, applicationId },
      'createProfessionalQualificationNexus',
      'Failed to submit professional qualification to Salesforce.',
    );
  }

  /** CA pathway — Approved Training Organisation (createATONexus); one record per POST. */
  async createATONexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    return this.postSalesforceApplicationApi(
      this.applicationAtoUrl,
      socialAccessToken,
      { ...payload, applicationId },
      'createATONexus',
      'Failed to submit professional body membership to Salesforce.',
    );
  }

  /** Other professional body membership (Experienced pathway) — one record per POST. */
  async createMembershipForOPBNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    return this.postSalesforceApplicationApi(
      this.applicationOpbUrl,
      socialAccessToken,
      { ...payload, applicationId },
      'createMembershipForOPBNexus',
      'Failed to submit other professional body membership to Salesforce.',
    );
  }

  /** Character references — both referees in one POST. */
  async createCharacterReferenceNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    return this.postSalesforceApplicationApi(
      this.applicationCharacterReferenceUrl,
      socialAccessToken,
      { ...payload, applicationId },
      'createCharacterReferenceNexus',
      'Failed to submit character references to Salesforce.',
    );
  }

  /** Declaration — single POST. */
  async createDeclarationNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    return this.postSalesforceApplicationApi(
      this.applicationDeclarationUrl,
      socialAccessToken,
      { ...payload, applicationId },
      'createDeclarationNexus',
      'Failed to submit declaration to Salesforce.',
    );
  }

  /** Residential declaration — single POST. */
  async createResidentialDeclarationNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    return this.postSalesforceApplicationApi(
      this.applicationResidentialDeclarationUrl,
      socialAccessToken,
      { ...payload, applicationId },
      'createResidentialDeclarationNexus',
      'Failed to submit residential declaration to Salesforce.',
    );
  }

  /**
   * GET ApplicationAPI/getAvailableDocumentTypesNexus?applicationId=...
   * Returns pathway-specific required/optional document types for the application.
   */
  async getAvailableDocumentTypesNexus(
    socialAccessToken: string,
    applicationId: string,
  ): Promise<Record<string, unknown>> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);
    const appId = applicationId?.trim();
    if (!appId) {
      throw new BadRequestException('applicationId is required.');
    }

    const url = this.applicationAvailableDocumentTypesUrl;
    console.log('[Salesforce] getAvailableDocumentTypesNexus:', { url, applicationId: appId });

    try {
      const res = await axios.get<Record<string, unknown>>(url, {
        params: { applicationId: appId },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      return res.data || { success: true, data: [] };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] getAvailableDocumentTypesNexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        this.throwMappedSalesforceApplicationApiError(
          err,
          'Failed to load available document types from Salesforce.',
        );
      }
      throw err;
    }
  }

  /**
   * GET ApplicationAPI/getCheckoutDetailsForNexus?applicationId=...
   * Returns payment summary and billing information for the application.
   */
  async getCheckoutDetailsForNexus(
    socialAccessToken: string,
    applicationId: string,
  ): Promise<Record<string, unknown>> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);
    const appId = applicationId?.trim();
    if (!appId) {
      throw new BadRequestException('applicationId is required.');
    }

    const url = this.applicationCheckoutDetailsUrl;
    console.log('[Salesforce] getCheckoutDetailsForNexus:', { url, applicationId: appId });

    try {
      const res = await axios.get<Record<string, unknown>>(url, {
        params: { applicationId: appId },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      return res.data || { status: 'Success', data: {} };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] getCheckoutDetailsForNexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        this.throwMappedSalesforceApplicationApiError(
          err,
          'Failed to load checkout details from Salesforce.',
        );
      }
      throw err;
    }
  }

  /** POST ApplicationAPI/createBillingNexus — record membership application payment in Salesforce. */
  async createBillingNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    const accountId = String(payload.accountId || '').trim();
    if (!accountId) {
      throw new BadRequestException('accountId is required.');
    }
    const paymentMethod = String(payload.paymentMethod || '').trim();
    if (!paymentMethod) {
      throw new BadRequestException('paymentMethod is required.');
    }
    const wooshPayReferenceNo = String(payload.wooshPayReferenceNo || '').trim();
    if (!wooshPayReferenceNo) {
      throw new BadRequestException('wooshPayReferenceNo is required.');
    }

    const body: Record<string, unknown> = {
      applicationId,
      accountId,
      paymentMethod,
      wooshPayReferenceNo,
    };

    const url = this.applicationCreateBillingUrl;
    console.log('[Salesforce] createBillingNexus:', { url, applicationId });

    try {
      const res = await axios.post<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      return res.data || { success: true };
    } catch (err: unknown) {
      if (!axios.isAxiosError(err)) {
        throw err;
      }

      const data = err.response?.data as {
        message?: string;
        error?: string;
        error_description?: string;
        errorDetails?: string;
      };
      const desc =
        data?.message
        || data?.errorDetails
        || data?.error_description
        || data?.error
        || err.message
        || '';
      const lower = String(desc).toLowerCase();

      const billingAlreadyRecorded =
        (lower.includes('billing')
          && lower.includes('already')
          && (lower.includes('exist') || lower.includes('submitted')))
        || (lower.includes('billing')
          && lower.includes('submitted')
          && (lower.includes('current status') || lower.includes('draft or created')));

      if (billingAlreadyRecorded) {
        console.warn('[Salesforce] createBillingNexus: billing already recorded, treating as success.', {
          applicationId,
          message: desc,
        });
        return {
          status: 'Success',
          message: desc || 'Billing already exists. Treated as success.',
          alreadyExists: true,
          applicationId,
        };
      }

      console.error('[Salesforce] createBillingNexus failed:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      this.throwMappedSalesforceApplicationApiError(
        err,
        'Failed to submit billing to Salesforce.',
      );
    }
  }

  /** POST ApplicationAPI/uploadDocumentNexus — one file per request (base64 body). */
  async uploadDocumentNexus(
    socialAccessToken: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const applicationId = String(payload.applicationId || '').trim();
    if (!applicationId) {
      throw new BadRequestException('applicationId is required.');
    }
    const documentType = String(payload.documentType || '').trim();
    if (!documentType) {
      throw new BadRequestException('documentType is required.');
    }
    const fileName = String(payload.fileName || '').trim();
    if (!fileName) {
      throw new BadRequestException('fileName is required.');
    }
    const fileContent = String(payload.fileContent || '').trim();
    if (!fileContent) {
      throw new BadRequestException('fileContent is required.');
    }

    const body: Record<string, unknown> = {
      applicationId,
      documentType,
      fileName,
      fileContent,
      fileSize: payload.fileSize ?? fileContent.length,
      otherDetails: String(payload.otherDetails || '').trim(),
    };

    return this.postSalesforceApplicationApi(
      this.applicationUploadDocumentUrl,
      socialAccessToken,
      body,
      'uploadDocumentNexus',
      'Failed to upload document to Salesforce.',
    );
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
  /** True when Salesforce nexus userinfo reports accountType "Member". */
  isSalesforceMemberAccountType(accountType: string | null | undefined): boolean {
    return String(accountType || '').trim().toLowerCase() === 'member';
  }

  /** SSO may proceed without SCAQ candidate status when Salesforce accountType is Member. */
  allowsSsoLoginWithoutScaqCandidate(
    isSCAQCandidate: boolean | null | undefined,
    accountType: string | null | undefined,
  ): boolean {
    if (isSCAQCandidate === true) return true;
    return this.isSalesforceMemberAccountType(accountType);
  }

  requiresPaidSignupAfterSso(user: Pick<UserEntity, 'isSCAQCandidate' | 'salesforceAccountType'>): boolean {
    return !this.allowsSsoLoginWithoutScaqCandidate(user.isSCAQCandidate, user.salesforceAccountType);
  }

  /** True when Salesforce nexus userinfo reports Chartered Accountant (CA) member class. */
  isSalesforceCaMemberClass(memberClass: string | null | undefined): boolean {
    const normalized = String(memberClass || '').trim().toUpperCase();
    return normalized === 'CA' || normalized === 'CHARTERED ACCOUNTANT';
  }

  /** True when Salesforce nexus userinfo reports ISCA Student Member class. */
  isSalesforceStudentMemberClass(memberClass: string | null | undefined): boolean {
    const normalized = String(memberClass || '').trim().toUpperCase();
    if (!normalized || normalized.includes('NON')) return false;
    return normalized === 'STUDENT MEMBER' || normalized.includes('STUDENT');
  }

  isSalesforceMembershipStatusApproved(membershipStatus: string | null | undefined): boolean {
    return String(membershipStatus || '').trim().toLowerCase() === 'approved';
  }

  isApprovedSalesforceStudentMember(nexusInfo: SalesforceNexusUserInfo | null | undefined): boolean {
    if (!nexusInfo || typeof nexusInfo !== 'object') return false;
    const memberClass = String(nexusInfo.memberClass || '').trim();
    const membershipStatus = String(nexusInfo.membershipStatus || '').trim();
    return (
      this.isSalesforceStudentMemberClass(memberClass)
      && this.isSalesforceMembershipStatusApproved(membershipStatus)
    );
  }

  /** True when Salesforce nexus userinfo reports ISCA Member (Experienced Professional pathway). */
  isSalesforceIscaMemberClass(memberClass: string | null | undefined): boolean {
    const normalized = String(memberClass || '').trim().toUpperCase();
    if (!normalized || normalized.includes('NON')) return false;
    if (this.isSalesforceCaMemberClass(memberClass)) return false;
    if (this.isSalesforceStudentMemberClass(memberClass)) return false;
    return normalized === 'MEMBER';
  }

  isApprovedSalesforceMember(nexusInfo: SalesforceNexusUserInfo | null | undefined): boolean {
    if (!nexusInfo || typeof nexusInfo !== 'object') return false;
    const memberClass = String(nexusInfo.memberClass || '').trim();
    const membershipStatus = String(nexusInfo.membershipStatus || '').trim();
    return (
      this.isSalesforceIscaMemberClass(memberClass)
      && this.isSalesforceMembershipStatusApproved(membershipStatus)
    );
  }

  extractNricNumberFromNexusInfo(
    nexusInfo: SalesforceNexusUserInfo | Record<string, unknown> | null | undefined,
  ): string {
    if (!nexusInfo || typeof nexusInfo !== 'object') return '';
    const sources: Record<string, unknown>[] = [nexusInfo as Record<string, unknown>];
    const nested = (nexusInfo as SalesforceNexusUserInfo).nexusUser;
    if (nested && typeof nested === 'object') {
      sources.push(nested as Record<string, unknown>);
    }
    for (const source of sources) {
      const value = String(source.NRIC_Number || source.nric_Number || '').trim();
      if (value) {
        return normalizeSingaporeNricFin(value) || value.toUpperCase();
      }
    }
    return '';
  }

  private readNexusInfoField(
    nexusInfo: SalesforceNexusUserInfo | Record<string, unknown> | null | undefined,
    keys: string[],
  ): unknown {
    if (!nexusInfo || typeof nexusInfo !== 'object') return undefined;
    const sources: Record<string, unknown>[] = [nexusInfo as Record<string, unknown>];
    const nested = (nexusInfo as SalesforceNexusUserInfo).nexusUser;
    if (nested && typeof nested === 'object') {
      sources.push(nested as Record<string, unknown>);
    }
    for (const source of sources) {
      for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return value;
        }
      }
    }
    return undefined;
  }

  extractIdTypeFromNexusInfo(
    nexusInfo: SalesforceNexusUserInfo | Record<string, unknown> | null | undefined,
  ): string {
    const value = this.readNexusInfoField(nexusInfo, ['idType', 'id_type', 'IDType']);
    return String(value || '').trim();
  }

  extractIsAiNexusUserFromNexusInfo(
    nexusInfo: SalesforceNexusUserInfo | Record<string, unknown> | null | undefined,
  ): boolean {
    const value = this.readNexusInfoField(nexusInfo, ['isAINexusUser', 'isAiNexusUser', 'is_ai_nexus_user']);
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }

  /** True when Salesforce account is a member (not "Non member"). */
  isSalesforceNexusMemberAccount(nexusInfo: SalesforceNexusUserInfo | null | undefined): boolean {
    if (!nexusInfo || typeof nexusInfo !== 'object') return false;
    if (this.isSalesforceMemberAccountType(nexusInfo.accountType)) {
      return true;
    }
    const memberClass = String(nexusInfo.memberClass || '').trim();
    if (!memberClass) return false;
    const normalized = memberClass.toUpperCase();
    if (normalized.includes('NON')) return false;
    return true;
  }

  evaluateNricNumberPlatformLoginEligibility(
    nexusInfo: SalesforceNexusUserInfo,
  ): { allowed: boolean; message?: string } {
    const nricNumber = this.extractNricNumberFromNexusInfo(nexusInfo);
    if (!nricNumber) {
      return {
        allowed: false,
        message: 'NRIC_Number was not found in eServices.',
      };
    }

    if (this.isSalesforceNexusMemberAccount(nexusInfo)) {
      return { allowed: true };
    }

    const idType = this.extractIdTypeFromNexusInfo(nexusInfo);
    const isAiNexusUser = this.extractIsAiNexusUserFromNexusInfo(nexusInfo);
    const hasCitizenOrPrIdType = isSalesforceCitizenOrPrNricIdType(idType);

    if (!hasCitizenOrPrIdType) {
      return {
        allowed: false,
        message:
          'Sign-in is only available for Blue NRIC or Pink NRIC accounts. Please complete your membership signup first.',
      };
    }

    if (!isAiNexusUser) {
      return {
        allowed: false,
        message:
          'This eServices account is not linked to AI Nexus yet. Please complete membership signup before signing in.',
      };
    }

    return { allowed: true };
  }

  /**
   * Membership application: load nexus userinfo with the eServices social token.
   * Throws when the token is invalid or Salesforce does not return profile data.
   */
  async fetchMembershipNexusUserInfoForApplication(
    socialAccessToken: string,
  ): Promise<SalesforceNexusUserInfo> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);
    const nexusInfo = await this.fetchSalesforceNexusUserInfo(token);
    if (!nexusInfo || typeof nexusInfo !== 'object') {
      throw new BadRequestException(
        'Could not load your membership status from eServices. Please try signing in again.',
      );
    }
    return nexusInfo;
  }

  /**
   * When memberClass is CA, sync the platform user and return a JWT for establish-session.
   */
  async resolveCaMemberLoginFromSocialToken(socialAccessToken: string): Promise<{
    isCaMember: boolean;
    memberClass: string | null;
    nexusInfo: SalesforceNexusUserInfo;
    accessToken?: string;
  }> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);
    const nexusInfo = await this.fetchMembershipNexusUserInfoForApplication(token);
    const memberClass = String(nexusInfo.memberClass || '').trim() || null;

    if (!this.isSalesforceCaMemberClass(memberClass)) {
      return { isCaMember: false, memberClass, nexusInfo };
    }

    const idpUserInfo = await this.getUserInfo(token);
    const { accessToken } = await this.processOAuthAuthentication(idpUserInfo, token);
    return { isCaMember: true, memberClass, nexusInfo, accessToken };
  }

  /**
   * When memberClass is Member and membershipStatus is Approved, sync platform user and return JWT.
   */
  async resolveApprovedMemberLoginFromSocialToken(socialAccessToken: string): Promise<{
    isApprovedMember: boolean;
    memberClass: string | null;
    membershipStatus?: string | null;
    nexusInfo: SalesforceNexusUserInfo;
    accessToken?: string;
  }> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);
    const nexusInfo = await this.fetchMembershipNexusUserInfoForApplication(token);
    const memberClass = String(nexusInfo.memberClass || '').trim() || null;
    const membershipStatus = String(nexusInfo.membershipStatus || '').trim() || null;

    if (!this.isApprovedSalesforceMember(nexusInfo)) {
      return { isApprovedMember: false, memberClass, nexusInfo, membershipStatus };
    }

    const idpUserInfo = await this.getUserInfo(token);
    const { accessToken } = await this.processOAuthAuthentication(idpUserInfo, token);
    return {
      isApprovedMember: true,
      memberClass,
      nexusInfo,
      accessToken,
      membershipStatus,
    };
  }

  /** When userinfonexus has NRIC_Number, sync platform user and return JWT (same as member login). */
  async resolveNricNumberLoginFromSocialToken(socialAccessToken: string): Promise<{
    hasNricNumber: boolean;
    loginAllowed: boolean;
    nricNumber: string | null;
    nexusInfo: SalesforceNexusUserInfo;
    message?: string;
    accessToken?: string;
  }> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);
    const nexusInfo = await this.fetchMembershipNexusUserInfoForApplication(token);
    const nricNumber = this.extractNricNumberFromNexusInfo(nexusInfo) || null;

    if (!nricNumber) {
      return {
        hasNricNumber: false,
        loginAllowed: false,
        nricNumber: null,
        nexusInfo,
        message: 'NRIC_Number was not found in eServices.',
      };
    }

    const eligibility = this.evaluateNricNumberPlatformLoginEligibility(nexusInfo);
    if (!eligibility.allowed) {
      return {
        hasNricNumber: true,
        loginAllowed: false,
        nricNumber,
        nexusInfo,
        message: eligibility.message,
      };
    }

    const idpUserInfo = await this.getUserInfo(token);
    const { accessToken } = await this.processOAuthAuthentication(idpUserInfo, token);
    return {
      hasNricNumber: true,
      loginAllowed: true,
      nricNumber,
      nexusInfo,
      message: 'NRIC account confirmed. Signing you in.',
      accessToken,
    };
  }

  /**
   * When memberClass is Student, sync the platform user and return a JWT for establish-session.
   */
  async resolveStudentMemberLoginFromSocialToken(socialAccessToken: string): Promise<{
    isStudentMember: boolean;
    memberClass: string | null;
    membershipStatus?: string | null;
    nexusInfo: SalesforceNexusUserInfo;
    accessToken?: string;
  }> {
    const token = this.requireSalesforceSocialAccessToken(socialAccessToken);
    const nexusInfo = await this.fetchMembershipNexusUserInfoForApplication(token);
    const memberClass = String(nexusInfo.memberClass || '').trim() || null;
    const membershipStatus = String(nexusInfo.membershipStatus || '').trim() || null;

    if (!this.isApprovedSalesforceStudentMember(nexusInfo)) {
      return { isStudentMember: false, memberClass, nexusInfo, membershipStatus };
    }

    const idpUserInfo = await this.getUserInfo(token);
    const { accessToken } = await this.processOAuthAuthentication(idpUserInfo, token);
    return { isStudentMember: true, memberClass, nexusInfo, accessToken, membershipStatus };
  }

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
  async clearSalesforceMobileSession(accessToken: string): Promise<void> {
    const token = String(accessToken || '').trim();
    if (!token) return;

    const url = this.clearSessionUrl;
    try {
      await axios.delete(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 10000,
      });
      console.log('[Salesforce] clearSession succeeded:', { url });
    } catch (err) {
      console.warn('Salesforce clearSession failed (non-fatal):', err);
    }
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

  /** Parse memberclassupdate Apex REST JSON body. */
  private parseMemberClassUpdateResponse(data: unknown): SalesforceMemberClassUpdateResult {
    if (!data || typeof data !== 'object') {
      return {};
    }
    return data as SalesforceMemberClassUpdateResult;
  }

  private hasNonEmptyScaqSfdcId(result: SalesforceMemberClassUpdateResult): boolean {
    const id = result.scaqSfdcId != null ? String(result.scaqSfdcId).trim() : '';
    return id.length > 0;
  }

  /**
   * Apex may return success:false with null fields when the account is already Associate
   * (e.g. "Current value: Associate") — no scaqSfdcId in that body; treat separately below.
   */
  private messageIndicatesAccountAlreadyAssociate(message: string): boolean {
    const m = message.toLowerCase();
    if (!m) return false;
    // Example: "... Current value: Associate. "
    if (m.includes('current value: associate')) return true;
    if (m.includes('current value is associate')) return true;
    if (/\bcurrent\s+value\s*[:=]\s*["']?associate["']?\b/i.test(message)) return true;
    return false;
  }

  /**
   * SCAQ memberclassupdate: by product rule, promotion succeeds when Apex returns **both**
   * `updatedMemberClass === "Associate"` and a non-empty `scaqSfdcId`.
   * Fallback: Apex sometimes omits those when the account is already Associate (see message).
   */
  private isAssociateConfirmedByMemberClassUpdate(
    result: SalesforceMemberClassUpdateResult,
  ): boolean {
    const updated = (result.updatedMemberClass != null ? String(result.updatedMemberClass) : '').trim();
    const previous = (result.previousMemberClass != null ? String(result.previousMemberClass) : '').trim();

    const isUpdatedAssociate = updated.toLowerCase() === 'associate';

    if (isUpdatedAssociate && this.hasNonEmptyScaqSfdcId(result)) {
      return true;
    }

    // Already Associate: Apex may not resend scaqSfdcId / updatedMemberClass.
    if (previous.toLowerCase() === 'associate') {
      return true;
    }

    const message = result.message != null ? String(result.message) : '';
    if (this.messageIndicatesAccountAlreadyAssociate(message)) {
      return true;
    }

    return false;
  }

  /**
   * SCAQ flow: call memberclassupdate (admin token), use response only — no userinfonexus re-fetch.
   */
  async promoteUserToAssociateMember(userId: string): Promise<{
    success: boolean;
    message: string;
    user: UserEntity;
    salesforce: SalesforceNexusUserInfo | null;
    memberClassUpdate?: SalesforceMemberClassUpdateResult;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found.');
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
        salesforce: {
          accountID: accountId,
          memberClass: user.salesforceMemberClass ?? undefined,
          isSCAQCandidate: user.isSCAQCandidate ?? true,
          isAssociateMember: true,
        },
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

    let updateResult: SalesforceMemberClassUpdateResult = {};
    try {
      const res = await axios.post<SalesforceMemberClassUpdateResult>(url, {}, {
        headers: {
          Authorization: `Bearer ${integrationAccessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 20000,
      });
      updateResult = this.parseMemberClassUpdateResponse(res.data);
      console.log('[SSO Login] memberclassupdate response:', updateResult);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data;
        if (body && typeof body === 'object') {
          updateResult = this.parseMemberClassUpdateResponse(body);
          console.log('[SSO Login] memberclassupdate error body:', updateResult);
        } else {
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
      } else {
        throw err;
      }
    }

    const isAssociate = this.isAssociateConfirmedByMemberClassUpdate(updateResult);
    const updatedClass =
      updateResult.updatedMemberClass != null ? String(updateResult.updatedMemberClass).trim() : '';
    const resolvedMemberClass =
      updatedClass !== ''
        ? updatedClass
        : isAssociate
          ? 'Associate'
          : user.salesforceMemberClass ?? undefined;

    const salesforcePayload: SalesforceNexusUserInfo = {
      accountID: updateResult.accountId || accountId,
      memberClass: resolvedMemberClass,
      isSCAQCandidate: user.isSCAQCandidate ?? true,
      isAssociateMember: isAssociate,
    };

    user.salesforceAccountId = salesforcePayload.accountID ?? user.salesforceAccountId;
    user.salesforceMemberClass = resolvedMemberClass ?? user.salesforceMemberClass;
    user.isAssociateMember = isAssociate;
    user.salesforceUserInfoRaw = {
      ...(user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
        ? user.salesforceUserInfoRaw
        : {}),
      memberClassUpdate: updateResult as Record<string, unknown>,
    };
    user.salesforceSyncedAt = new Date();
    await this.userRepository.save(user);

    if (!isAssociate) {
      const apiMessage =
        (updateResult.message && String(updateResult.message).trim())
        || 'Salesforce did not return both updatedMemberClass "Associate" and a scaqSfdcId; member class was not confirmed.';
      console.warn('[SSO Login] memberclassupdate did not confirm Associate:', {
        userId,
        accountId,
        scaqSfdcId: updateResult.scaqSfdcId,
        updatedMemberClass: updateResult.updatedMemberClass,
        success: updateResult.success,
      });
      throw new BadRequestException(apiMessage);
    }

    console.log('[SSO Login] SCAQ Associate confirmed from memberclassupdate response:', {
      userId,
      accountId,
      scaqSfdcId: updateResult.scaqSfdcId,
      updatedMemberClass: updateResult.updatedMemberClass,
    });

    return {
      success: true,
      message:
        (updateResult.message && String(updateResult.message).trim())
        || 'Associate member status confirmed in Salesforce.',
      user,
      salesforce: salesforcePayload,
      memberClassUpdate: updateResult,
    };
  }
}
