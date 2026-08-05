// src/auth/oauth-auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
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
import { CompanyEnrollmentService } from '../company-enrollment/company-enrollment.service';
import { assertEmailAvailableForRole } from '../user/user-email-availability.util';

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
  Is_paid?: boolean;
  Paid_date?: string;
  paid_amount?: number;
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
    private readonly companyEnrollmentService: CompanyEnrollmentService,
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

  /** Apex REST path for company QR / pre-paid enrollment (signupfornexus). */
  private get signupForNexusPath(): string {
    const p = process.env.OAUTH_SIGNUP_FOR_NEXUS_PATH || '/services/apexrest/signupfornexus';
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

  get signupForNexusUrl(): string {
    const fullUrl = process.env.OAUTH_SIGNUP_FOR_NEXUS_URL?.trim();
    if (fullUrl) return fullUrl;

    // Same Experience Cloud host as createuserfornexus (my.site.com), not my.salesforce.com.
    const createUserUrl = process.env.OAUTH_CREATE_USER_URL?.trim();
    if (createUserUrl) {
      try {
        const parsed = new URL(createUserUrl);
        return `${parsed.origin}${this.signupForNexusPath}`;
      } catch {
        // fall through
      }
    }

    const instanceUrl = process.env.OAUTH_INSTANCE_URL?.trim().replace(/\/$/, '');
    if (instanceUrl) {
      return `${instanceUrl}${this.signupForNexusPath}`;
    }

    return `${this.integrationApiBaseUrl}${this.signupForNexusPath}`;
  }

  /** Apex REST path for corporate bulk Nexus user create. */
  private get createBulkNexusUsersPath(): string {
    const p =
      process.env.OAUTH_CREATE_BULK_USER_PATH || '/services/apexrest/createblukuserfornexus';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get createBulkNexusUsersUrl(): string {
    const fullUrl = process.env.OAUTH_CREATE_BULK_USER_URL?.trim();
    if (fullUrl) return fullUrl;
    // Same host as createuserfornexus (integration API), not Experience Cloud site.
    return `${this.integrationApiBaseUrl}${this.createBulkNexusUsersPath}`;
  }

  private get userCheckForNricPath(): string {
    const p = process.env.OAUTH_USER_CHECK_FOR_NRIC_PATH || '/services/apexrest/usercheckfornric';
    return p.startsWith('/') ? p : `/${p}`;
  }

  private get userCheckForEmailPath(): string {
    const p = process.env.OAUTH_USER_CHECK_FOR_EMAIL_PATH || '/services/apexrest/usercheckforemail';
    return p.startsWith('/') ? p : `/${p}`;
  }

  buildUserCheckForNricUrl(nricNumber: string): string {
    const fullUrl = process.env.OAUTH_USER_CHECK_FOR_NRIC_URL?.trim();
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim();
    const base = fullUrl
      ? fullUrl.split('?')[0].replace(/\/$/, '')
      : siteBase
        ? `${siteBase.replace(/\/$/, '')}${this.userCheckForNricPath}`
        : `${this.baseUrl}${this.userCheckForNricPath}`;
    const params = new URLSearchParams({ nricNumber: nricNumber.trim().toUpperCase() });
    return `${base}?${params.toString()}`;
  }

  buildUserCheckForEmailUrl(email: string): string {
    const fullUrl = process.env.OAUTH_USER_CHECK_FOR_EMAIL_URL?.trim();
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim();
    const base = fullUrl
      ? fullUrl.split('?')[0].replace(/\/$/, '')
      : siteBase
        ? `${siteBase.replace(/\/$/, '')}${this.userCheckForEmailPath}`
        : `${this.baseUrl}${this.userCheckForEmailPath}`;
    const params = new URLSearchParams({ email: email.trim().toLowerCase() });
    return `${base}?${params.toString()}`;
  }

  /** PATCH accountupdate/ai-nexus-user — mark Salesforce account as an AI Nexus platform user. */
  private get aiNexusUserAccountUpdatePath(): string {
    const p =
      process.env.OAUTH_AI_NEXUS_USER_ACCOUNT_UPDATE_PATH
      || '/services/apexrest/accountupdate/ai-nexus-user';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get aiNexusUserAccountUpdateUrl(): string {
    const fullUrl = process.env.OAUTH_AI_NEXUS_USER_ACCOUNT_UPDATE_URL?.trim();
    if (fullUrl) return fullUrl.split('?')[0].replace(/\/$/, '');
    return `${this.integrationApiBaseUrl}${this.aiNexusUserAccountUpdatePath}`;
  }

  /** PUT nexus-payment/update — mark paid membership payment on Salesforce account. */
  private get nexusPaymentUpdatePath(): string {
    const p =
      process.env.OAUTH_NEXUS_PAYMENT_UPDATE_PATH
      || '/services/apexrest/v1/nexus-payment/update';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get nexusPaymentUpdateUrl(): string {
    const fullUrl = process.env.OAUTH_NEXUS_PAYMENT_UPDATE_URL?.trim();
    if (fullUrl) return fullUrl.split('?')[0].replace(/\/$/, '');
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim();
    if (siteBase) return `${siteBase.replace(/\/$/, '')}${this.nexusPaymentUpdatePath}`;
    return `${this.integrationApiBaseUrl}${this.nexusPaymentUpdatePath}`;
  }

  private extractSalesforceAccountId(data: Record<string, unknown> | null | undefined): string {
    if (!data || typeof data !== 'object') return '';
    const candidates = [
      data.accountId,
      data.accountID,
      data.AccountId,
      data.AccountID,
      data.Id,
      data.id,
    ];
    for (const candidate of candidates) {
      const value = String(candidate || '').trim();
      if (value) return value;
    }
    return '';
  }

  /** Normalize to YYYY-MM-DD for Salesforce Paid_Date. */
  private normalizeSalesforcePaidDate(value?: string | null): string {
    const raw = String(value || '').trim();
    if (!raw) {
      return new Date().toISOString().slice(0, 10);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    // en-GB / common UI: DD/MM/YYYY or DD-MM-YYYY
    const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return new Date().toISOString().slice(0, 10);
  }

  /**
   * PUT payment status to Salesforce after paid membership checkout.
   * When required=true (paid signup), failure blocks local finalize.
   */
  async updateSalesforceNexusPayment(payload: {
    accountId?: string | null;
    Is_Paid?: boolean;
    Paid_Amount?: number | string;
    Paid_Date?: string | null;
    required?: boolean;
  }): Promise<Record<string, unknown> | null> {
    const required = payload.required === true;
    const accountId = String(payload.accountId || '').trim();
    if (!accountId) {
      const message = 'Salesforce accountId is required to update payment.';
      console.warn('[Salesforce] Skipping nexus-payment/update — missing accountId');
      if (required) throw new BadRequestException(message);
      return null;
    }

    const paidAmountRaw = payload.Paid_Amount;
    const paidAmount =
      typeof paidAmountRaw === 'number'
        ? paidAmountRaw
        : Number(String(paidAmountRaw ?? '').trim());
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      const message = 'A valid Paid_Amount is required to update Salesforce payment.';
      console.warn('[Salesforce] Skipping nexus-payment/update — invalid Paid_Amount', {
        accountId,
        Paid_Amount: paidAmountRaw,
      });
      if (required) throw new BadRequestException(message);
      return null;
    }

    const body = {
      accountId,
      Is_Paid: payload.Is_Paid !== false,
      Paid_Amount: Number(paidAmount.toFixed(2)),
      Paid_Date: this.normalizeSalesforcePaidDate(payload.Paid_Date),
    };

    const url = this.nexusPaymentUpdateUrl;

    console.log('[Salesforce] PUT nexus-payment/update:', {
      url,
      accountId: body.accountId,
      Is_Paid: body.Is_Paid,
      Paid_Amount: body.Paid_Amount,
      Paid_Date: body.Paid_Date,
      required,
    });

    try {
      const accessToken = await this.getIntegrationAccessToken();
      const res = await axios.put<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      });
      console.log('[Salesforce] nexus-payment/update success:', {
        status: res.status,
        accountId: body.accountId,
      });
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] nexus-payment/update failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
          accountId: body.accountId,
          required,
        });
        if (required) {
          const desc = this.extractSalesforceErrorDescription(
            err.response?.data,
            err.message,
          );
          throw new BadRequestException(
            desc || 'Failed to update payment in Salesforce. Local signup was not completed.',
          );
        }
      } else {
        console.error('[Salesforce] nexus-payment/update failed:', err);
        if (required) {
          throw new BadRequestException(
            'Failed to update payment in Salesforce. Local signup was not completed.',
          );
        }
      }
      return null;
    }
  }

  /**
   * Best-effort: set isAINexusUser=true on the Salesforce account after a successful platform login.
   * Non-fatal — login must not fail if Salesforce rejects the update.
   */
  async markSalesforceAccountAsAiNexusUser(accountId: string | null | undefined): Promise<void> {
    const normalizedAccountId = String(accountId || '').trim();
    if (!normalizedAccountId) {
      console.warn('[SSO Login] Skipping ai-nexus-user account update — missing accountId');
      return;
    }

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.aiNexusUserAccountUpdateUrl;
    const body = { accountId: normalizedAccountId, isAINexusUser: true };

    console.log('[SSO Login] PATCH accountupdate/ai-nexus-user:', {
      url,
      accountId: normalizedAccountId,
    });

    try {
      const res = await axios.patch<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      });
      console.log('[SSO Login] accountupdate/ai-nexus-user success:', {
        status: res.status,
        accountId: normalizedAccountId,
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[SSO Login] accountupdate/ai-nexus-user failed (non-fatal):', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
          accountId: normalizedAccountId,
        });
      } else {
        console.error('[SSO Login] accountupdate/ai-nexus-user failed (non-fatal):', err);
      }
    }
  }

  private parseSalesforceUserCheckPayload(
    data: Record<string, unknown> | null | undefined,
  ): {
    found: boolean;
    membershipType: string | null;
    firstName: string;
    lastName: string;
    emailAddress: string;
  } {
    const raw = data && typeof data === 'object' ? data : {};
    const emailAddress = String(
      raw.Email_Address ?? raw.emailAddress ?? raw.email ?? '',
    ).trim();
    const firstName = String(raw.First_Name ?? raw.firstName ?? '').trim();
    const lastName = String(raw.Last_Name ?? raw.lastName ?? '').trim();
    const membershipTypeRaw = raw.Membership_Type ?? raw.membershipType ?? null;
    const membershipType =
      membershipTypeRaw === null || membershipTypeRaw === undefined
        ? null
        : String(membershipTypeRaw).trim() || null;
    const found = Boolean(emailAddress || (firstName && lastName));
    return { found, membershipType, firstName, lastName, emailAddress };
  }

  /** GET usercheckfornric — returns existing eServices account for NRIC if present. */
  async checkSalesforceUserByNric(nricNumber: string): Promise<{
    found: boolean;
    membershipType: string | null;
    firstName: string;
    lastName: string;
    emailAddress: string;
  }> {
    const normalized = nricNumber?.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('NRIC number is required.');
    }

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.buildUserCheckForNricUrl(normalized);
    console.log('[Salesforce] usercheckfornric:', { url, nricNumber: normalized });

    try {
      const res = await axios.get<Record<string, unknown>>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        timeout: 30000,
      });
      const parsed = this.parseSalesforceUserCheckPayload(res.data);
      console.log('[Salesforce] usercheckfornric result:', {
        found: parsed.found,
        emailAddress: parsed.emailAddress ? '[present]' : '',
      });
      return parsed;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return this.parseSalesforceUserCheckPayload(null);
      }
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] usercheckfornric failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        const rawDescription = this.extractSalesforceErrorDescription(
          err.response?.data,
          err.message,
        );
        throw new BadRequestException(
          rawDescription || 'Failed to check NRIC against eServices.',
        );
      }
      throw err;
    }
  }

  /** GET usercheckforemail — returns existing eServices account for email if present. */
  async checkSalesforceUserByEmail(email: string): Promise<{
    found: boolean;
    membershipType: string | null;
    firstName: string;
    lastName: string;
    emailAddress: string;
  }> {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Email is required.');
    }

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.buildUserCheckForEmailUrl(normalized);

    try {
      const res = await axios.get<Record<string, unknown>>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        timeout: 30000,
      });
      const parsed = this.parseSalesforceUserCheckPayload(res.data);
      return parsed;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return this.parseSalesforceUserCheckPayload(null);
      }
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] usercheckforemail failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        const rawDescription = this.extractSalesforceErrorDescription(
          err.response?.data,
          err.message,
        );
        throw new BadRequestException(
          rawDescription || 'Failed to check email against eServices.',
        );
      }
      throw err;
    }
  }

  private get userUpdateNexusPath(): string {
    const p = process.env.OAUTH_USER_UPDATE_NEXUS_PATH || '/services/apexrest/userupdateapinexus';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get userUpdateNexusUrl(): string {
    const fullUrl = process.env.OAUTH_USER_UPDATE_NEXUS_URL?.trim();
    if (fullUrl) return fullUrl.split('?')[0].replace(/\/$/, '');
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim();
    if (siteBase) return `${siteBase.replace(/\/$/, '')}${this.userUpdateNexusPath}`;
    return `${this.integrationApiBaseUrl}${this.userUpdateNexusPath}`;
  }

  /** PUT userupdateapinexus — update existing eServices account with NRIC/citizenship details. */
  async updateSalesforceNexusUser(payload: {
    accountId: string;
    firstName: string;
    lastName: string;
    nationality: string;
    nricNumber: string;
    idType: string;
  }): Promise<Record<string, unknown>> {
    const accountId = payload.accountId?.trim();
    const firstName = payload.firstName?.trim();
    const lastName = payload.lastName?.trim();
    const nationality = payload.nationality?.trim();
    const nricNumber = payload.nricNumber?.trim().toUpperCase();
    const idType = payload.idType?.trim();

    if (!accountId) throw new BadRequestException('Salesforce accountId is required.');
    if (!firstName || !lastName) {
      throw new BadRequestException('First name and last name are required.');
    }
    if (!nationality) throw new BadRequestException('Nationality is required.');
    if (!nricNumber) throw new BadRequestException('NRIC number is required.');
    if (!idType) throw new BadRequestException('ID type is required.');

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.userUpdateNexusUrl;
    const body = {
      accountId,
      firstName,
      lastName,
      nationality,
      nricNumber,
      idType,
    };

    console.log('[Salesforce] Updating Nexus user via Apex REST:', {
      url,
      accountId,
      nricNumber,
      idType,
    });

    try {
      const res = await axios.put<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      });
      console.log('[Salesforce] userupdateapinexus response status:', res.status);
      return res.data || { success: true };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] userupdateapinexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        const rawDescription = this.extractSalesforceErrorDescription(
          err.response?.data,
          err.message,
        );
        throw new BadRequestException(
          rawDescription || 'Failed to update Salesforce account with NRIC details.',
        );
      }
      throw err;
    }
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

  /** Corporate account + contact creation (HR corporate register). */
  private get createCorporateAccountPath(): string {
    const p =
      process.env.OAUTH_CORPORATE_ACCOUNT_CREATE_PATH
      || '/services/apexrest/corporate-membership/v1/corporateaccandconcreation';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get createCorporateAccountUrl(): string {
    const fullUrl = process.env.OAUTH_CORPORATE_ACCOUNT_CREATE_URL?.trim();
    if (fullUrl) return fullUrl;
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim();
    if (siteBase) return `${siteBase.replace(/\/$/, '')}${this.createCorporateAccountPath}`;
    return `${this.integrationApiBaseUrl}${this.createCorporateAccountPath}`;
  }

  private get checkCorporateAccountPath(): string {
    const p =
      process.env.OAUTH_CORPORATE_ACCOUNT_CHECK_PATH
      || '/services/apexrest/corporate-membership/v1/corporateaccandconcheck';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get checkCorporateAccountUrl(): string {
    const fullUrl = process.env.OAUTH_CORPORATE_ACCOUNT_CHECK_URL?.trim();
    if (fullUrl) return fullUrl;
    const siteBase = process.env.OAUTH_INSTANCE_URL?.trim();
    if (siteBase) return `${siteBase.replace(/\/$/, '')}${this.checkCorporateAccountPath}`;
    return `${this.integrationApiBaseUrl}${this.checkCorporateAccountPath}`;
  }

  private get corporateUserInfoPath(): string {
    const p =
      process.env.OAUTH_CORPORATE_USERINFO_PATH
      || '/services/apexrest/corporate-membership/v1/userinfoforcorporate';
    return p.startsWith('/') ? p : `/${p}`;
  }

  get corporateUserInfoUrl(): string {
    const fullUrl = process.env.OAUTH_CORPORATE_USERINFO_URL?.trim();
    if (fullUrl) return fullUrl;
    return `${this.baseUrl}${this.corporateUserInfoPath}`;
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
  buildOAuthState(options?: {
    scaqVerify?: boolean;
    deferredAuth?: boolean;
    loginAsCorporate?: boolean;
  }): string {
    return Buffer.from(
      JSON.stringify({
        scaqVerify: Boolean(options?.scaqVerify),
        deferredAuth: Boolean(options?.deferredAuth),
        loginAsCorporate: Boolean(options?.loginAsCorporate),
        ts: Date.now(),
      }),
    ).toString('base64url');
  }

  /** Decode OAuth state from the IdP callback. */
  parseOAuthState(state?: string): {
    scaqVerify: boolean;
    deferredAuth: boolean;
    loginAsCorporate: boolean;
  } {
    if (!state?.trim()) {
      return { scaqVerify: false, deferredAuth: false, loginAsCorporate: false };
    }
    try {
      const json = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
        scaqVerify?: boolean | number | string;
        deferredAuth?: boolean | number | string;
        loginAsCorporate?: boolean | number | string;
      };
      const flag = json.scaqVerify;
      const deferred = json.deferredAuth;
      const corporate = json.loginAsCorporate;
      return {
        scaqVerify: flag === true || flag === 1 || flag === '1',
        deferredAuth: deferred === true || deferred === 1 || deferred === '1',
        loginAsCorporate: corporate === true || corporate === 1 || corporate === '1',
      };
    } catch {
      return {
        scaqVerify: state === 'scaq_verify' || state.includes('scaq_verify'),
        deferredAuth: state.includes('deferred_auth'),
        loginAsCorporate: state.includes('login_as_corporate'),
      };
    }
  }

  /** Build authorization URL for IdP. */
  generateAuthUrl(options?: {
    scaqVerify?: boolean;
    deferredAuth?: boolean;
    loginAsCorporate?: boolean;
  }): { authUrl: string; state: string } {
    const base = this.baseUrl;
    const path = this.authPath;
    const clientId = this.clientId;
    const redirectUri = this.redirectUri;
    const state = this.buildOAuthState({
      scaqVerify: options?.scaqVerify,
      deferredAuth: options?.deferredAuth,
      loginAsCorporate: options?.loginAsCorporate,
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
    options: { scaqVerify: boolean; loginAsCorporate?: boolean },
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

    const result = await this.processOAuthAuthentication(idpUserInfo, idpAccessToken, syncFn, {
      loginAsCorporate: Boolean(options.loginAsCorporate),
    });
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
      return staticToken;
    }

    const url = this.integrationTokenUrl;
    const { grantType, body } = this.buildIntegrationTokenRequestBody();

    try {
      const res = await axios.post<{ access_token?: string }>(url, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });
      const token = res.data?.access_token;
      if (!token) {
        throw new UnauthorizedException('Salesforce integration token response did not include access_token.');
      }
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

  /**
   * Block individual membership create when this email is already used in eServices
   * or already registered locally as Corporate. Does NOT call corporateaccandconcheck
   * (that API is for the corporate signup form with UEN).
   */
  async assertEmailAvailableForIndividualMembershipCreate(email: string): Promise<void> {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      throw new BadRequestException('A valid email address is required.');
    }

    const corporateEmailInUseMessage =
      'This email address is already associated with a corporate account. Please use a different email for individual membership, or sign in via the Organisation Portal.';

    const localCorporate = await this.userRepository.findOne({
      where: { email: normalized, role: UserRole.Corporate },
    });
    if (localCorporate) {
      throw new BadRequestException(corporateEmailInUseMessage);
    }

    const sfCheck = await this.checkSalesforceUserByEmail(normalized);
    if (sfCheck?.found) {
      throw new BadRequestException(
        'An eServices account already exists for this email address. Please sign in instead of creating a new account.',
      );
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
    company?: string;
    jobFunction?: string;
    countryOfResidence?: string;
    noOfYearOfRelevantWorkExperience?: string | number;
    Is_paid?: boolean;
    paid_amount?: string | number;
    Paid_date?: string;
    paymentProofToken?: string;
  }): Promise<Record<string, unknown>> {
    const email = normalizeEmail(payload.email);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }

    // Fail before Salesforce create (and after payment) with the same corporate conflict Apex returns.
    await this.assertEmailAvailableForIndividualMembershipCreate(email);

    const paymentProof = this.resolveMembershipPaymentProof(payload.paymentProofToken);
    const isPaid = payload.Is_paid === true || Boolean(paymentProof);
    if (isPaid && !paymentProof) {
      throw new BadRequestException(
        'Paid membership Salesforce sync requires a verified payment proof. Please complete payment verification first.',
      );
    }
    const resolvedPaidAmount = paymentProof
      ? paymentProof.paidAmount
      : payload.paid_amount;
    const resolvedPaidDate = paymentProof
      ? paymentProof.paidDate
      : payload.Paid_date;

    const idType = String(payload.id_type || '').trim();
    const idNumber = normalizeSingaporeNricFin(payload.id_number || '');
    if (idType || idNumber) {
      if (!idType || !idNumber) {
        throw new BadRequestException(SINGAPORE_NRIC_FIN_USER_MESSAGES.missingIdDetails);
      }
      const allowedIdTypes = new Set(['Blue NRIC', 'Pink NRIC', 'NRIC number', 'NRIC']);
      if (!allowedIdTypes.has(idType)) {
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
    const body: Record<string, string | number | boolean> = {
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

    const company = payload.company?.trim();
    if (company) {
      body.company = company;
    }

    const jobFunction = payload.jobFunction?.trim();
    if (jobFunction) {
      body.jobFunction = jobFunction;
    }

    const countryOfResidence = payload.countryOfResidence?.trim();
    if (countryOfResidence) {
      body.countryOfResidence = countryOfResidence;
    }

    const yearsOfExperienceRaw = payload.noOfYearOfRelevantWorkExperience;
    if (yearsOfExperienceRaw !== undefined && yearsOfExperienceRaw !== null && String(yearsOfExperienceRaw).trim() !== '') {
      const normalizedYears = typeof yearsOfExperienceRaw === 'number'
        ? yearsOfExperienceRaw
        : Number(yearsOfExperienceRaw);
      if (!Number.isNaN(normalizedYears)) {
        body.noOfYearOfRelevantWorkExperience = normalizedYears;
      } else {
        body.noOfYearOfRelevantWorkExperience = String(yearsOfExperienceRaw).trim();
      }
    }

    if (isPaid) {
      body.Is_paid = true;
    }

    if (resolvedPaidAmount !== undefined && resolvedPaidAmount !== null && String(resolvedPaidAmount).trim() !== '') {
      const normalizedPaidAmount = typeof resolvedPaidAmount === 'number'
        ? resolvedPaidAmount
        : Number(resolvedPaidAmount);
      if (!Number.isNaN(normalizedPaidAmount)) {
        body.paid_amount = Number(normalizedPaidAmount.toFixed(2));
      }
    }

    const paidDate = resolvedPaidDate?.trim();
    if (paidDate) {
      body.Paid_date = paidDate;
    }

    console.log('[Salesforce] Creating Nexus user via Apex REST:', {
      url,
      email: body.email,
      salutation: body.salutation,
      paidAmount: body.paid_amount ?? null,
      paymentRefId: paymentProof?.refId || null,
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
      const resData = res.data || {};
      let isError = false;
      let errorMsg = '';
      if (resData && typeof resData === 'object') {
        if ('isError' in resData && (resData.isError === true || resData.isError === 'true')) {
          isError = true;
          errorMsg = String(resData.Message || resData.message || '');
        } else if ('success' in resData && (resData.success === false || resData.success === 'false')) {
          isError = true;
          errorMsg = String(resData.message || resData.Message || '');
        }
      }
      if (isError) {
        console.error('[Salesforce] createuserfornexus API returned error:', errorMsg);
        const desc = this.mapCreateNexusUserErrorMessage(errorMsg);
        throw new BadRequestException(desc || 'Failed to create Salesforce membership account.');
      }

      const shouldSyncPayment =
        isPaid
        || (resolvedPaidAmount !== undefined
          && resolvedPaidAmount !== null
          && String(resolvedPaidAmount).trim() !== '');
      if (shouldSyncPayment) {
        const nestedSalesforce =
          resData.salesforce && typeof resData.salesforce === 'object'
            ? (resData.salesforce as Record<string, unknown>)
            : null;
        const nestedData =
          resData.data && typeof resData.data === 'object'
            ? (resData.data as Record<string, unknown>)
            : null;
        const accountId =
          this.extractSalesforceAccountId(resData)
          || this.extractSalesforceAccountId(nestedSalesforce)
          || this.extractSalesforceAccountId(nestedData);
        if (!accountId) {
          throw new BadRequestException(
            'Salesforce account was created but accountId was missing, so payment could not be synced. Local signup was not completed.',
          );
        }
        await this.updateSalesforceNexusPayment({
          accountId,
          Is_Paid: true,
          Paid_Amount: typeof body.paid_amount === 'number' || typeof body.paid_amount === 'string'
            ? body.paid_amount
            : resolvedPaidAmount,
          Paid_Date: paidDate,
          required: true,
        });
      }

      return resData;
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

  /**
   * Create a Salesforce user via Apex REST signupfornexus
   * (company QR / corporate pre-paid enrollment — no payment proof).
   * Password is set afterwards via setpasswordfornexus (same as paid membership).
   * Body matches Postman contract exactly (all 9 fields always present).
   */
  async signupSalesforceForNexus(payload: {
    salutation: string;
    first_name: string;
    last_name: string;
    email: string;
    company?: string;
    jobFunction?: string;
    countryOfResidence?: string;
    companyCode?: string;
    noOfYearOfRelevantWorkExperience?: string | number;
  }): Promise<Record<string, unknown>> {
    const email = normalizeEmail(payload.email);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.signupForNexusUrl;

    // Exact Postman shape — always send these keys (even if empty string).
    const body: Record<string, string | number> = {
      salutation: String(payload.salutation || 'Mr').trim(),
      first_name: String(payload.first_name || '').trim(),
      last_name: String(payload.last_name || '').trim(),
      email,
      company: String(payload.company || '').trim(),
      jobFunction: String(payload.jobFunction || '').trim(),
      countryOfResidence: String(payload.countryOfResidence || '').trim(),
      companyCode: String(payload.companyCode || '').trim(),
    };

    const yearsOfExperienceRaw = payload.noOfYearOfRelevantWorkExperience;
    if (yearsOfExperienceRaw !== undefined && yearsOfExperienceRaw !== null && String(yearsOfExperienceRaw).trim() !== '') {
      const normalizedYears = typeof yearsOfExperienceRaw === 'number'
        ? yearsOfExperienceRaw
        : Number(yearsOfExperienceRaw);
      if (!Number.isNaN(normalizedYears)) {
        body.noOfYearOfRelevantWorkExperience = normalizedYears;
      }
    }

    console.log('[Salesforce] Creating Nexus user via signupfornexus:', {
      url,
      body,
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
      console.log('[Salesforce] signupfornexus response status:', res.status);
      const resData = res.data || {};
      console.log('[Salesforce] signupfornexus response body:', resData);
      let isError = false;
      let errorMsg = '';
      if (resData && typeof resData === 'object') {
        if ('isError' in resData && (resData.isError === true || resData.isError === 'true')) {
          isError = true;
          errorMsg = String(resData.Message || resData.message || '');
        } else if ('success' in resData && (resData.success === false || resData.success === 'false')) {
          isError = true;
          errorMsg = String(resData.message || resData.Message || '');
        }
      }
      if (isError) {
        console.error('[Salesforce] signupfornexus API returned error:', errorMsg);
        const desc = this.mapCreateNexusUserErrorMessage(errorMsg);
        throw new BadRequestException(desc || 'Failed to create Salesforce membership account.');
      }

      return resData;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] signupfornexus failed:', {
          status: err.response?.status,
          data: err.response?.data,
          requestBody: body,
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

  /**
   * Verify server-signed membership payment proof (from /payments/verify-membership-payment).
   * Client-supplied paid_amount is ignored when a valid proof is present.
   */
  private resolveMembershipPaymentProof(token?: string): {
    refId: string;
    sessionId: string;
    paidAmount: number;
    paidDate: string;
    currency: string;
  } | null {
    const raw = String(token || '').trim();
    if (!raw) return null;
    try {
      const payload = this.jwtService.verify<{
        purpose?: string;
        refId?: string;
        sessionId?: string;
        paidAmount?: number;
        paidDate?: string;
        currency?: string;
      }>(raw);
      if (payload?.purpose !== 'membership-payment-proof') {
        throw new BadRequestException('Invalid membership payment proof.');
      }
      const refId = String(payload.refId || '').trim();
      const paidAmount = Number(payload.paidAmount);
      const paidDate = String(payload.paidDate || '').trim();
      if (!refId || !Number.isFinite(paidAmount) || paidAmount <= 0 || !paidDate) {
        throw new BadRequestException('Membership payment proof is incomplete.');
      }
      return {
        refId,
        sessionId: String(payload.sessionId || '').trim(),
        paidAmount: Number(paidAmount.toFixed(2)),
        paidDate,
        currency: String(payload.currency || 'SGD').trim().toUpperCase() || 'SGD',
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'Membership payment proof is invalid or expired. Please verify payment again.',
      );
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

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 3000;
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
        const resData = res.data || {};
        let isError = false;
        let errorMsg = '';
        if (resData && typeof resData === 'object') {
          if ('isError' in resData && (resData.isError === true || resData.isError === 'true')) {
            isError = true;
            errorMsg = String(resData.Message || resData.message || '');
          } else if ('success' in resData && (resData.success === false || resData.success === 'false')) {
            isError = true;
            errorMsg = String(resData.message || resData.Message || '');
          }
        }
        if (isError) {
          console.error('[Salesforce] setpasswordfornexus API returned error:', errorMsg);
          if (errorMsg.toLowerCase().includes('user not found') && attempt < MAX_RETRIES) {
            console.warn(`[Salesforce] setpasswordfornexus: user not found (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            continue;
          }
          // Same password already set — treat as success so post-payment sync stays idempotent.
          if (this.isSalesforcePasswordAlreadySetError(errorMsg)) {
            console.warn('[Salesforce] setpasswordfornexus: password already set; treating as success');
            return { success: true, alreadySet: true, message: errorMsg };
          }
          const desc = this.mapSetNexusPasswordErrorMessage(errorMsg);
          throw new BadRequestException(desc || 'Failed to set Salesforce password.');
        }
        return resData;
      } catch (err: unknown) {
        if (err instanceof BadRequestException) throw err;
        if (axios.isAxiosError(err)) {
          console.error('[Salesforce] setpasswordfornexus failed:', {
            attempt,
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
          });
          const rawDescription = this.extractSalesforceErrorDescription(
            err.response?.data,
            err.message,
          );
          if (this.isSalesforcePasswordAlreadySetError(rawDescription)) {
            console.warn('[Salesforce] setpasswordfornexus: password already set; treating as success');
            return { success: true, alreadySet: true, message: rawDescription };
          }
          lastError = err;
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
            continue;
          }
          const desc = this.mapSetNexusPasswordErrorMessage(rawDescription);
          throw new BadRequestException(desc || 'Failed to set Salesforce password.');
        }
        throw err;
      }
    }

    throw lastError ?? new BadRequestException('Failed to set Salesforce password.');
  }

  /**
   * Bulk-create Salesforce users via Apex REST createblukuserfornexus (corporate fee-waiver enrol).
   * Body is a JSON array matching Salesforce sample fields.
   */
  private buildBulkNexusUserRequestBody(
    users: Array<{
      salutation?: string;
      first_name: string;
      last_name: string;
      name_as_per_id?: string;
      email: string;
      id_type?: string;
      id_number?: string;
      company?: string;
      department?: string;
      jobFunction?: string;
      countryOfResidence?: string;
      noOfYearOfRelevantWorkExperience?: string | number;
      accountType?: string;
      phone?: string;
      corporateAccountId?: string;
      learnerAsAnAccounting?: string;
      membershipNumber?: string;
      eligibility?: string;
      isAuthorisedSubmit?: boolean;
    }>,
  ): Array<Record<string, string | number | boolean>> {
    const list = Array.isArray(users) ? users : [];
    return list.map((row, index) => {
      const email = normalizeEmail(row.email);
      if (!email) {
        throw new BadRequestException(`Row ${index + 1}: a valid email address is required.`);
      }
      const firstName = String(row.first_name || '').trim();
      const lastName = String(row.last_name || '').trim();
      if (!firstName || !lastName) {
        throw new BadRequestException(`Row ${index + 1}: first_name and last_name are required.`);
      }

      // Field names must match Salesforce createblukuserfornexus body.
      const item: Record<string, string | number | boolean> = {
        first_name: firstName,
        last_name: lastName,
        email,
        name_as_per_id:
          String(row.name_as_per_id || '').trim() || `${firstName} ${lastName}`.trim(),
        isAuthorisedSubmit: row.isAuthorisedSubmit !== false,
      };

      const salutation = String(row.salutation || '').trim();
      if (salutation) item.salutation = salutation;

      // Send id_type + id_number together — Apex often ignores NRIC if id_type is missing.
      const idNumberRaw = String(row.id_number || '').trim();
      const idNumber = idNumberRaw
        ? (normalizeSingaporeNricFin(idNumberRaw) || idNumberRaw.toUpperCase().replace(/\s+/g, ''))
        : '';
      let idType = String(row.id_type || '').trim();
      if (idNumber && !idType) {
        idType = /^[STFG]\d{7}[A-Z]$/i.test(idNumber)
          ? 'Blue NRIC'
          : /^M\d{7}[A-Z]$/i.test(idNumber)
            ? 'Pink NRIC'
            : 'Passport';
      }
      if (idNumber) {
        item.id_number = idNumber;
        if (idType) item.id_type = idType;
      } else if (idType) {
        item.id_type = idType;
      }

      const company = String(row.company || '').trim();
      if (company) item.company = company;

      const department = String(row.department || '').trim();
      if (department) item.department = department;

      const jobFunction = String(row.jobFunction || '').trim();
      if (jobFunction) item.jobFunction = jobFunction;

      const countryOfResidence = String(row.countryOfResidence || '').trim();
      if (countryOfResidence) item.countryOfResidence = countryOfResidence;

      const yearsRaw = row.noOfYearOfRelevantWorkExperience;
      if (yearsRaw !== undefined && yearsRaw !== null && String(yearsRaw).trim() !== '') {
        const normalizedYears =
          typeof yearsRaw === 'number' ? yearsRaw : Number(yearsRaw);
        if (!Number.isNaN(normalizedYears)) {
          item.noOfYearOfRelevantWorkExperience = normalizedYears;
        } else {
          item.noOfYearOfRelevantWorkExperience = String(yearsRaw).trim();
        }
      }

      const accountType = String(row.accountType || '').trim();
      if (accountType) item.accountType = accountType;

      const phone = String(row.phone || '').trim();
      if (phone) item.phone = phone;

      const corporateAccountId = String(row.corporateAccountId || '').trim();
      if (corporateAccountId) item.corporateAccountId = corporateAccountId;

      const learnerAsAnAccounting = String(row.learnerAsAnAccounting || '').trim();
      if (learnerAsAnAccounting) item.learnerAsAnAccounting = learnerAsAnAccounting;

      const membershipNumber = String(row.membershipNumber || '').trim();
      if (membershipNumber) item.membershipNumber = membershipNumber;

      const eligibility = String(row.eligibility || '').trim();
      if (eligibility) item.eligibility = eligibility;

      return item;
    });
  }

  parseBulkNexusCreateRowOutcomes(
    record: Record<string, unknown>,
    requestEmails: string[],
  ): {
    succeededEmails: string[];
    failed: Array<{ email: string; message: string }>;
  } {
    const normalizedRequest = requestEmails.map((email) =>
      String(email || '').trim().toLowerCase(),
    );
    const succeededEmails: string[] = [];
    const failed: Array<{ email: string; message: string }> = [];
    const results = record.results;

    const resolveRowOutcome = (item: Record<string, unknown>) => {
      const msg = String(
        item.message
          || item.Message
          || item.error
          || item.errorMessage
          || item.statusMessage
          || '',
      ).trim();

      const explicitSuccess =
        item.success === true
        || item.success === 'true'
        || item.isSuccess === true
        || item.isSuccess === 'true'
        || this.isSalesforceBulkSuccessMessage(msg);

      const explicitFail =
        item.success === false
        || item.success === 'false'
        || item.isError === true
        || item.isError === 'true'
        || item.failed === true
        || Boolean(item.errors);

      if (explicitSuccess && !explicitFail) {
        return { ok: true as const, message: msg };
      }
      if (explicitFail || (msg && this.looksLikeSalesforceBulkFailureMessage(msg))) {
        let errorText = msg;
        if (!errorText && Array.isArray(item.errors) && item.errors.length) {
          errorText = item.errors
            .map((e) =>
              typeof e === 'string'
                ? e
                : String((e as Record<string, unknown>)?.message || JSON.stringify(e)),
            )
            .filter(Boolean)
            .join('; ');
        }
        return {
          ok: false as const,
          message: this.mapCreateNexusUserErrorMessage(errorText || 'Salesforce create failed.'),
        };
      }
      if (this.isSalesforceBulkSuccessMessage(msg)) {
        return { ok: true as const, message: msg };
      }
      return { ok: true as const, message: msg };
    };

    if (Array.isArray(results) && results.length) {
      results.forEach((row, index) => {
        if (!row || typeof row !== 'object') return;
        const item = row as Record<string, unknown>;
        const email = String(
          item.email || item.Email || normalizedRequest[index] || '',
        )
          .trim()
          .toLowerCase();
        if (!email) return;
        const outcome = resolveRowOutcome(item);
        if (outcome.ok) succeededEmails.push(email);
        else failed.push({ email, message: outcome.message });
      });
      return { succeededEmails, failed };
    }

    const bulkError = this.extractBulkNexusCreateError(record);
    if (!bulkError) {
      return { succeededEmails: [...normalizedRequest], failed: [] };
    }

    const mapped = this.mapCreateNexusUserErrorMessage(bulkError);
    return {
      succeededEmails: [],
      failed: normalizedRequest.map((email) => ({ email, message: mapped || bulkError })),
    };
  }

  async createSalesforceBulkNexusUsersWithOutcomes(
    users: Array<{
      salutation?: string;
      first_name: string;
      last_name: string;
      name_as_per_id?: string;
      email: string;
      id_type?: string;
      id_number?: string;
      company?: string;
      department?: string;
      jobFunction?: string;
      countryOfResidence?: string;
      noOfYearOfRelevantWorkExperience?: string | number;
      accountType?: string;
      phone?: string;
      corporateAccountId?: string;
      learnerAsAnAccounting?: string;
      membershipNumber?: string;
      eligibility?: string;
      isAuthorisedSubmit?: boolean;
    }>,
  ): Promise<{
    raw: Record<string, unknown>;
    succeededEmails: string[];
    failed: Array<{ email: string; message: string }>;
  }> {
    const list = Array.isArray(users) ? users : [];
    if (!list.length) {
      throw new BadRequestException('At least one learner is required for bulk enrolment.');
    }

    const body = this.buildBulkNexusUserRequestBody(list);
    const requestEmails = body.map((row) => String(row.email || '').trim().toLowerCase());
    const accessToken = await this.getIntegrationAccessToken();
    const url = this.createBulkNexusUsersUrl;

    console.log('[Salesforce] Creating bulk Nexus users via Apex REST (partial OK):', {
      url,
      count: body.length,
      emails: requestEmails,
      sampleFields: body.slice(0, 3).map((row) => ({
        email: row.email,
        hasIdType: Boolean(row.id_type),
        id_type: row.id_type || null,
        hasIdNumber: Boolean(row.id_number),
        id_number: row.id_number
          ? `${String(row.id_number).slice(0, 1)}****${String(row.id_number).slice(-4)}`
          : null,
        keys: Object.keys(row),
      })),
    });

    try {
      const res = await axios.post<Record<string, unknown> | unknown[]>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 120000,
      });
      const resData = res.data;
      const record =
        resData && typeof resData === 'object' && !Array.isArray(resData)
          ? (resData as Record<string, unknown>)
          : { success: true, data: resData };
      const outcomes = this.parseBulkNexusCreateRowOutcomes(record, requestEmails);
      return { raw: record, ...outcomes };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;
        if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
          const record = responseData as Record<string, unknown>;
          const outcomes = this.parseBulkNexusCreateRowOutcomes(record, requestEmails);
          if (outcomes.succeededEmails.length || outcomes.failed.length) {
            return { raw: record, ...outcomes };
          }
        }
        const bulkError =
          responseData && typeof responseData === 'object' && !Array.isArray(responseData)
            ? this.extractBulkNexusCreateError(responseData as Record<string, unknown>)
            : '';
        const rawDescription =
          bulkError || this.extractSalesforceErrorDescription(responseData, err.message);
        const desc = this.mapCreateNexusUserErrorMessage(rawDescription);
        return {
          raw:
            responseData && typeof responseData === 'object' && !Array.isArray(responseData)
              ? (responseData as Record<string, unknown>)
              : { error: desc || rawDescription },
          succeededEmails: [],
          failed: requestEmails.map((email) => ({
            email,
            message: desc || rawDescription || 'Salesforce bulk create failed.',
          })),
        };
      }
      throw err;
    }
  }

  async createSalesforceBulkNexusUsers(
    users: Array<{
      salutation?: string;
      first_name: string;
      last_name: string;
      name_as_per_id?: string;
      email: string;
      id_type?: string;
      id_number?: string;
      company?: string;
      department?: string;
      jobFunction?: string;
      countryOfResidence?: string;
      noOfYearOfRelevantWorkExperience?: string | number;
      accountType?: string;
      phone?: string;
      corporateAccountId?: string;
      learnerAsAnAccounting?: string;
      membershipNumber?: string;
      eligibility?: string;
      isAuthorisedSubmit?: boolean;
    }>,
  ): Promise<Record<string, unknown>> {
    const list = Array.isArray(users) ? users : [];
    if (!list.length) {
      throw new BadRequestException('At least one learner is required for bulk enrolment.');
    }

    const body = this.buildBulkNexusUserRequestBody(list);

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.createBulkNexusUsersUrl;

    console.log('[Salesforce] Creating bulk Nexus users via Apex REST:', {
      url,
      count: body.length,
      emails: body.map((row) => row.email),
      samplePayload: body[0],
    });

    try {
      const res = await axios.post<Record<string, unknown> | unknown[]>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 120000,
      });
      console.log('[Salesforce] createblukuserfornexus response status:', res.status);

      const resData = res.data;
      if (resData && typeof resData === 'object' && !Array.isArray(resData)) {
        const record = resData as Record<string, unknown>;
        const bulkError = this.extractBulkNexusCreateError(record);
        if (bulkError) {
          console.error('[Salesforce] createblukuserfornexus API returned error:', bulkError);
          const desc = this.mapCreateNexusUserErrorMessage(bulkError);
          throw new BadRequestException(
            desc || 'Failed to create Salesforce bulk membership accounts.',
          );
        }
        const { isError, errorMsg } = this.isSalesforceApiErrorPayload(record);
        if (isError) {
          console.error('[Salesforce] createblukuserfornexus API returned error:', errorMsg);
          const desc = this.mapCreateNexusUserErrorMessage(errorMsg);
          throw new BadRequestException(
            desc || 'Failed to create Salesforce bulk membership accounts.',
          );
        }
        return record;
      }

      return { success: true, data: resData };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data;
        const bulkError =
          responseData && typeof responseData === 'object' && !Array.isArray(responseData)
            ? this.extractBulkNexusCreateError(responseData as Record<string, unknown>)
            : '';
        console.error('[Salesforce] createblukuserfornexus failed:', {
          status: err.response?.status,
          data: responseData,
          results: JSON.stringify(
            responseData && typeof responseData === 'object'
              ? (responseData as Record<string, unknown>).results
              : null,
            null,
            2,
          ),
          bulkError,
          message: err.message,
        });
        const rawDescription =
          bulkError
          || this.extractSalesforceErrorDescription(responseData, err.message);
        const desc = this.mapCreateNexusUserErrorMessage(rawDescription);
        throw new BadRequestException(
          desc || 'Failed to create Salesforce bulk membership accounts.',
        );
      }
      throw err;
    }
  }

  /** Pull per-row Apex errors from createblukuserfornexus response shape. */
  private extractBulkNexusCreateError(record: Record<string, unknown>): string {
    const results = record.results;
    const successful = Number(record.successful ?? NaN);
    const failedCount = Number(record.failed ?? NaN);

    // Explicit aggregate success from Apex summary
    if (Number.isFinite(successful) && successful > 0 && (!Number.isFinite(failedCount) || failedCount === 0)) {
      // Still scan results for any explicit failures
    }

    if (!Array.isArray(results) || !results.length) {
      // No per-row results — only treat top-level as error if clearly failed
      if (Number.isFinite(failedCount) && failedCount > 0) {
        return String(record.message || record.Message || 'Bulk user create failed in Salesforce.').trim();
      }
      if (Number.isFinite(successful) && successful > 0) return '';
      const top = String(record.message || record.Message || record.error || '').trim();
      if (this.isSalesforceBulkSuccessMessage(top)) return '';
      // Ambiguous empty payload without success counts — not an error by itself
      return '';
    }

    const messages: string[] = [];
    for (const row of results) {
      if (!row || typeof row !== 'object') continue;
      const item = row as Record<string, unknown>;
      const msg = String(
        item.message
          || item.Message
          || item.error
          || item.errorMessage
          || item.statusMessage
          || '',
      ).trim();

      const explicitSuccess =
        item.success === true
        || item.success === 'true'
        || item.isSuccess === true
        || item.isSuccess === 'true'
        || this.isSalesforceBulkSuccessMessage(msg);

      const explicitFail =
        item.success === false
        || item.success === 'false'
        || item.isError === true
        || item.isError === 'true'
        || item.failed === true
        || Boolean(item.errors);

      if (explicitSuccess && !explicitFail) continue;
      if (!explicitFail && this.isSalesforceBulkSuccessMessage(msg)) continue;
      if (!explicitFail && !msg) continue;

      // Real failure row
      if (!explicitFail && !msg) continue;
      if (!explicitFail && msg && !this.looksLikeSalesforceBulkFailureMessage(msg)) {
        // Soft/unknown message without fail flags — ignore
        continue;
      }

      const email = String(item.email || item.Email || '').trim();
      let errorText = msg;
      if (!errorText && Array.isArray(item.errors) && item.errors.length) {
        errorText = item.errors
          .map((e) =>
            typeof e === 'string'
              ? e
              : String((e as Record<string, unknown>)?.message || JSON.stringify(e)),
          )
          .filter(Boolean)
          .join('; ');
      }
      if (!errorText && explicitFail) {
        errorText = JSON.stringify(item);
      }
      if (errorText) {
        messages.push(email ? `${email}: ${errorText}` : errorText);
      }
    }

    if (messages.length) return messages.join(' | ');
    if (Number.isFinite(failedCount) && failedCount > 0) {
      return String(record.message || record.Message || 'Bulk user create failed in Salesforce.').trim();
    }
    return '';
  }

  private isSalesforceBulkSuccessMessage(message: string): boolean {
    const lower = String(message || '').toLowerCase();
    return (
      lower.includes('created successfully')
      || lower.includes('account and user created')
      || (lower.includes('success') && !lower.includes('unsuccess'))
    );
  }

  private looksLikeSalesforceBulkFailureMessage(message: string): boolean {
    const lower = String(message || '').toLowerCase();
    if (this.isSalesforceBulkSuccessMessage(lower)) return false;
    return (
      lower.includes('error')
      || lower.includes('fail')
      || lower.includes('duplicate')
      || lower.includes('already')
      || lower.includes('exception')
      || lower.includes('invalid')
    );
  }

  private isSalesforceApiErrorPayload(resData: Record<string, unknown> | null | undefined): {
    isError: boolean;
    errorMsg: string;
  } {
    if (!resData || typeof resData !== 'object') return { isError: false, errorMsg: '' };
    if ('isError' in resData && (resData.isError === true || resData.isError === 'true')) {
      return { isError: true, errorMsg: String(resData.Message || resData.message || '') };
    }
    if ('success' in resData && (resData.success === false || resData.success === 'false')) {
      return { isError: true, errorMsg: String(resData.message || resData.Message || '') };
    }
    return { isError: false, errorMsg: '' };
  }

  /** Create Corporate Account + Contact via Apex corporateaccandconcreation. */
  async createCorporateSalesforceAccountAndContact(payload: {
    account: Record<string, unknown>;
    contact: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const accountName = String(payload?.account?.name || '').trim();
    const uenNumber = String(payload?.account?.uenNumber || '').trim();
    const email = normalizeEmail(String(payload?.contact?.email || ''));
    const firstName = String(payload?.contact?.firstName || '').trim();
    const lastName = String(payload?.contact?.lastName || '').trim();

    if (!accountName) throw new BadRequestException('Company name is required.');
    if (!uenNumber) throw new BadRequestException('UEN number is required.');
    if (!email) throw new BadRequestException('A valid contact email is required.');
    if (!firstName || !lastName) throw new BadRequestException('Contact first and last name are required.');

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.createCorporateAccountUrl;
    const body = {
      account: {
        name: accountName,
        uenNumber,
        businessCountry: String(payload.account.businessCountry || 'Singapore').trim(),
        businessPostalCode: String(payload.account.businessPostalCode || '').trim(),
        businessUnitNumber: String(payload.account.businessUnitNumber || '').trim(),
        businessBuildingName: String(payload.account.businessBuildingName || '').trim(),
        businessStreetName: String(payload.account.businessStreetName || '').trim(),
        businessCity: String(payload.account.businessCity || 'Singapore').trim(),
        businessState: String(payload.account.businessState || 'SG').trim(),
        organisationType: String(payload.account.organisationType || 'Private Limited').trim(),
        isPaidCorporate: Boolean(payload.account.isPaidCorporate),
        isSme: payload.account.isSme !== false,
        isProvidesProfessionalServices: Boolean(payload.account.isProvidesProfessionalServices),
      },
      contact: {
        lastName,
        firstName,
        email,
        mobilePhone: String(payload.contact.mobilePhone || '').trim(),
        phone: String(payload.contact.phone || '').trim(),
        designation: String(payload.contact.designation || '').trim(),
        website: String(payload.contact.website || '').trim(),
        iscaConferencesEvents: String(payload.contact.iscaConferencesEvents || 'Yes').trim(),
        practitionersBulletin: Boolean(payload.contact.practitionersBulletin),
        iscaAccountifyBulletin: Boolean(payload.contact.iscaAccountifyBulletin),
        financialForensicFocus: Boolean(payload.contact.financialForensicFocus),
        businessFinanceBulletin: Boolean(payload.contact.businessFinanceBulletin),
        monthlyCALab: Boolean(payload.contact.monthlyCALab),
        specialISCAOfferings: Boolean(payload.contact.specialISCAOfferings),
        participateInResearch: Boolean(payload.contact.participateInResearch),
        boardflixBulletin: Boolean(payload.contact.boardflixBulletin),
        monthlyISCharteredAccountantJournal: Boolean(
          payload.contact.monthlyISCharteredAccountantJournal,
        ),
        scaqNewsletterUpdates: Boolean(payload.contact.scaqNewsletterUpdates),
        studentMemberNewsletterUpdates: Boolean(payload.contact.studentMemberNewsletterUpdates),
        theISCABuzzCorporateMembersNewsletter:
          payload.contact.theISCABuzzCorporateMembersNewsletter !== false,
      },
    };

    console.log('[Salesforce] Creating corporate account+contact via Apex REST:', {
      url,
      uenNumber: body.account.uenNumber,
      email: body.contact.email,
    });

    try {
      const res = await axios.post<Record<string, unknown>>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 45000,
      });
      const resData = (res.data || {}) as Record<string, unknown>;
      const { isError, errorMsg } = this.isSalesforceApiErrorPayload(resData);
      if (isError) {
        throw new BadRequestException(errorMsg || 'Failed to create corporate Salesforce account.');
      }
      return resData;
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] corporateaccandconcreation failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        const desc = this.extractSalesforceErrorDescription(err.response?.data, err.message);
        throw new BadRequestException(desc || 'Failed to create corporate Salesforce account.');
      }
      throw err;
    }
  }

  /**
   * Salesforce corporateaccandconcheck sometimes returns an unrelated account/contact
   * with success=true. Only treat as found when returned email + UEN match the request.
   */
  enforceCorporateCheckExactMatch(
    requested: { email: string; uenNumber: string },
    resData: Record<string, unknown>,
  ): Record<string, unknown> {
    const nestedRaw =
      resData.data && typeof resData.data === 'object'
        ? (resData.data as Record<string, unknown>)
        : resData;
    const contact =
      nestedRaw.contact && typeof nestedRaw.contact === 'object'
        ? (nestedRaw.contact as Record<string, unknown>)
        : {};
    const account =
      nestedRaw.account && typeof nestedRaw.account === 'object'
        ? (nestedRaw.account as Record<string, unknown>)
        : {};

    const returnedEmail = normalizeEmail(String(contact.email || ''));
    const returnedUen = String(account.uenNumber || '').trim();
    const requestedEmail = requested.email;
    const requestedUen = requested.uenNumber;

    const flaggedExists = Boolean(
      nestedRaw.corporateAccountExists && nestedRaw.contactExists,
    );
    if (!flaggedExists) {
      return resData;
    }

    const emailMatches = !requestedEmail || returnedEmail === requestedEmail;
    const uenMatches =
      !requestedUen
      || returnedUen.toLowerCase() === requestedUen.toLowerCase();

    // Requested email and/or UEN must match the Salesforce payload exactly.
    if (emailMatches && uenMatches) {
      return {
        ...resData,
        data: {
          ...nestedRaw,
          exactMatch: true,
        },
      };
    }

    console.warn('[Salesforce] corporateaccandconcheck rejected — email/UEN must match exactly:', {
      requestedEmail: requestedEmail || null,
      requestedUen: requestedUen || null,
      returnedEmail: returnedEmail || null,
      returnedUen: returnedUen || null,
    });

    return {
      success: false,
      message: 'Corporate account/contact email and UEN must match exactly.',
      errorCode: 'CORPORATE_CHECK_EXACT_MATCH_REQUIRED',
      data: {
        corporateAccountExists: false,
        contactExists: false,
        exactMatch: false,
        mismatch: {
          email: Boolean(requestedEmail) && !emailMatches,
          uenNumber: Boolean(requestedUen) && !uenMatches,
        },
      },
    };
  }

  /** Check whether Corporate Account / Contact already exist. */
  async checkCorporateSalesforceAccount(payload: {
    uenNumber?: string;
    email?: string;
  }): Promise<Record<string, unknown>> {
    const uenNumber = String(payload?.uenNumber || '').trim();
    const email = normalizeEmail(String(payload?.email || ''));
    if (!uenNumber && !email) {
      throw new BadRequestException('UEN number or contact email is required for the corporate check.');
    }

    const accessToken = await this.getIntegrationAccessToken();
    const url = this.checkCorporateAccountUrl;
    const body: Record<string, unknown> = {
      ...(uenNumber ? { uenNumber, account: { uenNumber } } : {}),
      ...(email ? { email, contact: { email } } : {}),
    };

    console.log('[Salesforce] Checking corporate account+contact via Apex REST:', {
      url,
      uenNumber: uenNumber || null,
      email: email || null,
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
      const resData = (res.data || {}) as Record<string, unknown>;
      const { isError, errorMsg } = this.isSalesforceApiErrorPayload(resData);
      if (isError) {
        throw new BadRequestException(errorMsg || 'Failed to check corporate Salesforce account.');
      }
      return this.enforceCorporateCheckExactMatch({ email, uenNumber }, resData);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      if (axios.isAxiosError(err)) {
        console.error('[Salesforce] corporateaccandconcheck failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        const desc = this.extractSalesforceErrorDescription(err.response?.data, err.message);
        throw new BadRequestException(desc || 'Failed to check corporate Salesforce account.');
      }
      throw err;
    }
  }

  /** GET corporate user info using the end-user SSO Bearer token. */
  async fetchSalesforceCorporateUserInfo(
    accessToken: string,
  ): Promise<Record<string, unknown> | null> {
    const url = this.corporateUserInfoUrl;
    if (!url || !accessToken) {
      console.warn('[SSO Login] Skipping corporate user info fetch — missing URL or access token.');
      return null;
    }
    try {
      console.log('[SSO Login] Fetching Salesforce corporate user info from', url);
      const res = await axios.get<Record<string, unknown>>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        timeout: 15000,
      });
      console.log('[SSO Login] Corporate user info response status:', res.status);
      console.log('[SSO Login] Corporate user info payload:', res.data);
      return res.data || null;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('[SSO Login] Corporate user info fetch failed:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
          url,
        });
      } else {
        console.error('[SSO Login] Corporate user info fetch failed (unknown error):', err);
      }
      return null;
    }
  }

  /**
   * Salesforce userinfoforcorporate.role — accept any casing ("corporate" / "Corporate").
   * Local DB still stores UserRole.Corporate ("Corporate").
   */
  isSalesforceCorporateRole(
    info: Record<string, unknown> | null | undefined,
  ): boolean {
    if (!info || typeof info !== 'object') return false;
    return String(info.role || '').trim().toLowerCase() === 'corporate';
  }

  isCorporateSalesforceUserInfo(
    info: Record<string, unknown> | null | undefined,
  ): info is Record<string, unknown> {
    if (!info || typeof info !== 'object') return false;
    if (info.success === false || info.success === 'false') return false;
    if (this.isSalesforceCorporateRole(info)) return true;
    const companyCode = String(info.companyCode || '').trim();
    const accountId = String(info.accountId || '').trim();
    const contactId = String(info.contactId || '').trim();
    const uenNumber = String(info.uenNumber || '').trim();
    return Boolean(companyCode || accountId || contactId || uenNumber);
  }

  /** user.companyCode comes only from Salesforce companyCode (not UEN / accountId). */
  resolveCorporateCompanyCode(info: Record<string, unknown>): string {
    return String(info.companyCode || '').trim();
  }

  private looksLikeSalesforceAccountId(value: string): boolean {
    return /^001[a-zA-Z0-9]{12,17}$/.test(String(value || '').trim());
  }

  private looksLikeCompanyDisplayName(value: string): boolean {
    const normalized = String(value || '').trim();
    if (!normalized || this.looksLikeSalesforceAccountId(normalized)) return false;
    return (
      normalized.includes(' ')
      || /(pte|ltd|limited|inc|corp|company|services)/i.test(normalized)
    );
  }

  private readCorporateAccountNameFromUserInfoRaw(
    raw: Record<string, unknown> | null | undefined,
  ): string {
    if (!raw || typeof raw !== 'object') return '';
    const corporate =
      raw.corporate && typeof raw.corporate === 'object'
        ? (raw.corporate as Record<string, unknown>)
        : null;
    return String(corporate?.accountName || '').trim();
  }

  /** Resolve human-readable corporate account name for a company reference / companyCode. */
  async resolveCorporateCompanyDisplayName(companyCode: string): Promise<string> {
    const code = String(companyCode || '').trim();
    if (!code) return '';

    const publicCode = String(process.env.CORPORATE_PUBLIC_COMPANY_CODE || '').trim();
    const publicName = String(process.env.CORPORATE_PUBLIC_COMPANY_NAME || '').trim();
    if (publicCode && publicName && publicCode.toLowerCase() === code.toLowerCase()) {
      return publicName;
    }

    const demoCode = String(process.env.CORPORATE_DEMO_COMPANY_CODE || '').trim();
    if (demoCode && demoCode.toLowerCase() === code.toLowerCase() && this.looksLikeCompanyDisplayName(demoCode)) {
      return demoCode;
    }

    if (this.looksLikeCompanyDisplayName(code)) {
      return code;
    }

    // Prefer real account name stored on Corporate HR users for this companyCode.
    try {
      const corporateUsers = await this.userRepository
        .createQueryBuilder('u')
        .where('u.role = :role', { role: UserRole.Corporate })
        .andWhere('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code })
        .andWhere('u.isDraft = :isDraft', { isDraft: false })
        .orderBy('u.updatedAt', 'DESC')
        .take(10)
        .getMany();

      for (const user of corporateUsers) {
        const fromRaw = this.readCorporateAccountNameFromUserInfoRaw(user.salesforceUserInfoRaw);
        if (fromRaw && fromRaw.toLowerCase() !== code.toLowerCase()) {
          return fromRaw;
        }
      }

      for (const user of corporateUsers) {
        const accountId = String(user.salesforceAccountId || '').trim();
        if (!this.looksLikeSalesforceAccountId(accountId)) continue;
        const fromAccount = await this.fetchSalesforceAccountNameById(accountId);
        if (fromAccount) return fromAccount;
      }
    } catch (err) {
      console.warn('[Corporate] Could not resolve company name from users:', err);
    }

    if (this.looksLikeSalesforceAccountId(code)) {
      const fromSalesforce = await this.fetchSalesforceAccountNameById(code);
      if (fromSalesforce) return fromSalesforce;
    }

    return '';
  }

  private async fetchSalesforceAccountNameById(accountId: string): Promise<string | null> {
    const normalizedId = String(accountId || '').trim();
    if (!this.looksLikeSalesforceAccountId(normalizedId)) return null;

    try {
      const accessToken = await this.getIntegrationAccessToken();
      const apiVersion = String(process.env.SALESFORCE_API_VERSION || 'v59.0').trim();
      const url = `${this.integrationApiBaseUrl}/services/data/${apiVersion}/sobjects/Account/${encodeURIComponent(normalizedId)}`;
      const res = await axios.get<Record<string, unknown>>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        timeout: 15000,
      });
      const name = String(res.data?.Name || res.data?.name || '').trim();
      return name || null;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.warn('[Salesforce] Could not resolve Account name for companyCode:', {
          accountId: normalizedId,
          status: err.response?.status,
          message: err.message,
        });
      }
      return null;
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
    if (
      lower.includes('associated with a corporate')
      || (lower.includes('corporate account') && lower.includes('another email'))
    ) {
      return 'This email address is already associated with a corporate account. Please use a different email for individual membership, or sign in via the Organisation Portal.';
    }
    if (
      lower.includes('aura') && lower.includes('visualforce')
      || lower.includes('can only throw this exception type')
    ) {
      return 'Salesforce could not create the account (Apex REST error). Please try a different email, or contact support if this continues.';
    }
    if (
      lower.includes('membership_number')
      || (lower.includes('duplicate') && lower.includes('membership'))
    ) {
      return 'This ISCA membership number is already linked to another account in Salesforce. Use a unique membership number, or leave it blank if not applicable.';
    }
    if (lower.includes('already') && (lower.includes('registered') || lower.includes('exists'))) {
      return 'An account with this NRIC or email already exists. Please sign in instead.';
    }
    if (lower.includes('duplicate_value') || lower.includes('duplicate value found')) {
      return 'Salesforce rejected this enrolment because a unique field already exists (often email, NRIC, or membership number). Check the learner details and try again.';
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

  /** True when Salesforce rejected set-password because the same password is already active. */
  private isSalesforcePasswordAlreadySetError(description: string): boolean {
    const lower = String(description || '').toLowerCase();
    return lower.includes('invalid repeated password') || lower.includes('repeated password');
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

  /**
   * Non-members without Blue/Pink NRIC on file must not receive platform cookies until
   * citizenship is updated (including when isSCAQCandidate is true).
   */
  requiresCitizenshipGapBeforePlatformLogin(
    nexusInfo: SalesforceNexusUserInfo | null | undefined,
  ): boolean {
    if (!nexusInfo || typeof nexusInfo !== 'object') return false;

    if (this.isApprovedSalesforceMember(nexusInfo)) return false;

    const memberClass = String(nexusInfo.memberClass || '').trim();
    const membershipStatus = String(nexusInfo.membershipStatus || '').trim();
    if (
      this.isSalesforceCaMemberClass(memberClass)
      && this.isSalesforceMembershipStatusApproved(membershipStatus)
    ) {
      return false;
    }

    if (this.isSalesforceNexusMemberAccount(nexusInfo)) {
      return false;
    }

    const nricNumber = this.extractNricNumberFromNexusInfo(nexusInfo);
    const idType = this.extractIdTypeFromNexusInfo(nexusInfo);
    const hasCitizenOrPrIdType = isSalesforceCitizenOrPrNricIdType(idType);

    return !(nricNumber && hasCitizenOrPrIdType);
  }

  async resolveOAuthPlatformSessionDeferral(
    user: Pick<UserEntity, 'isSCAQCandidate' | 'salesforceAccountType' | 'role'>,
    idpAccessToken: string,
    deferredAuthFromState: boolean,
  ): Promise<{
    useDeferredAuth: boolean;
    needsPaidSignup: boolean;
    citizenshipGap: boolean;
  }> {
    if (user.role === UserRole.Corporate) {
      console.log('[SSO Login] Corporate role — granting direct platform login, skipping deferral.');
      return { useDeferredAuth: false, needsPaidSignup: false, citizenshipGap: false };
    }

    const corporateInfo = await this.fetchSalesforceCorporateUserInfo(idpAccessToken);
    if (this.isCorporateSalesforceUserInfo(corporateInfo)) {
      console.log('[SSO Login] Corporate userinfo found — granting direct platform login.');
      return { useDeferredAuth: false, needsPaidSignup: false, citizenshipGap: false };
    }

    const nexusInfo = await this.fetchSalesforceNexusUserInfo(idpAccessToken);

    if (nexusInfo?.Is_paid === true) {
      console.log('[SSO Login] Is_paid=true — granting direct platform login, skipping all deferral checks.');
      return { useDeferredAuth: false, needsPaidSignup: false, citizenshipGap: false };
    }

    const needsPaidSignup = this.requiresPaidSignupAfterSso(user);
    const citizenshipGap = this.requiresCitizenshipGapBeforePlatformLogin(nexusInfo);
    const useDeferredAuth = deferredAuthFromState || needsPaidSignup || citizenshipGap;
    return { useDeferredAuth, needsPaidSignup, citizenshipGap };
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
    const { accessToken } = await this.completeSuccessfulPlatformLogin(idpUserInfo, token);
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
    const { accessToken } = await this.completeSuccessfulPlatformLogin(idpUserInfo, token);
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
    const { accessToken } = await this.completeSuccessfulPlatformLogin(idpUserInfo, token);
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
    const { accessToken } = await this.completeSuccessfulPlatformLogin(idpUserInfo, token);
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

  /**
   * Resolve local user for SSO by Salesforce username (preferred), then Account Id, then email.
   * Always scoped by role so Individual and Corporate records stay separate.
   */
  private async resolveLocalUserForSsoLogin(params: {
    email: string;
    salesforceUsername: string;
    salesforceAccountId: string;
    role: UserRole;
  }): Promise<{
    user: UserEntity | null;
    matchedBy: 'username' | 'accountId' | 'email' | null;
  }> {
    const email = normalizeEmail(params.email || '');
    const salesforceUsername = String(params.salesforceUsername || '').trim();
    const salesforceAccountId = String(params.salesforceAccountId || '').trim();
    const { role } = params;

    if (salesforceUsername) {
      const byUsername = await this.resolveLocalUserByUsernameOnly({
        salesforceUsername,
        role,
      });
      if (byUsername.user) {
        return byUsername;
      }
    }

    if (salesforceAccountId) {
      const byAccountId = await this.userRepository.findOne({
        where: { salesforceAccountId, role },
      });
      if (byAccountId) {
        return { user: byAccountId, matchedBy: 'accountId' };
      }
    }

    if (email) {
      const byEmail = await this.userRepository.findOne({ where: { email, role } });
      if (byEmail) {
        return { user: byEmail, matchedBy: 'email' };
      }
    }

    return { user: null, matchedBy: null };
  }

  /** Corporate SSO: match only by Salesforce / local username (no email or accountId). */
  private async resolveLocalUserByUsernameOnly(params: {
    salesforceUsername: string;
    role: UserRole;
  }): Promise<{
    user: UserEntity | null;
    matchedBy: 'username' | 'accountId' | 'email' | null;
  }> {
    const salesforceUsername = String(params.salesforceUsername || '').trim();
    const { role } = params;
    if (!salesforceUsername) {
      return { user: null, matchedBy: null };
    }

    const bySfUsername = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.salesforceUsername) = LOWER(:username)', {
        username: salesforceUsername,
      })
      .andWhere('user.role = :role', { role })
      .getOne();
    if (bySfUsername) {
      return { user: bySfUsername, matchedBy: 'username' };
    }

    const byLocalUsername = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', {
        username: salesforceUsername,
      })
      .andWhere('user.role = :role', { role })
      .getOne();
    if (byLocalUsername) {
      return { user: byLocalUsername, matchedBy: 'username' };
    }

    return { user: null, matchedBy: null };
  }

  /** True when an existing User row looks like a corporate staff learner (not HR). */
  private isStaffLearnerAccount(user: UserEntity): boolean {
    if (user.role !== UserRole.User) return false;
    const existingCompanyCode = String(user.companyCode || '').trim();
    if (!existingCompanyCode) return false;
    const snap =
      user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
        ? (user.eligibilitySnapshot as Record<string, unknown>)
        : null;
    return Boolean(
      snap?.companyEnrollmentViaQr === true
      || snap?.companyReferenceConfirmed === true
      || snap?.eligibilityType === 'company-qr-enrollment'
      || snap?.source === 'corporate-staff-enrol'
      || Boolean(String(snap?.companyCode || snap?.companyReferenceId || '').trim()),
    );
  }

  /** Update local email when Salesforce identity changed; scoped by role. */
  private async applySsoEmailIfChanged(user: UserEntity, email: string): Promise<void> {
    const current = normalizeEmail(user.email || '');
    if (!email || current === email) return;

    const emailOwner = await this.userRepository.findOne({
      where: { email, role: user.role },
    });
    if (emailOwner && emailOwner.id !== user.id) {
      throw new ConflictException(
        'This email is already linked to another AI Nexus account. Contact support to merge or update the account.',
      );
    }

    console.log('[SSO Login] Updating local email from Salesforce match:', {
      userId: user.id,
      role: user.role,
      previousEmail: current || null,
      nextEmail: email,
      salesforceAccountId: user.salesforceAccountId || null,
      salesforceUsername: user.salesforceUsername || null,
    });
    user.email = email;
  }

  /** Create or update user from IdP data and issue our access token only (no refresh token). */
  async processOAuthAuthentication(
    idpUserInfo: IdPUserInfo,
    idpAccessToken: string,
    syncFn?: (userId: string) => Promise<unknown>,
    options?: { loginAsCorporate?: boolean },
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

    const nexusInfo = await this.fetchSalesforceNexusUserInfo(idpAccessToken);
    const corporateInfo = await this.fetchSalesforceCorporateUserInfo(idpAccessToken);
    const hasCorporateInfo = this.isCorporateSalesforceUserInfo(corporateInfo);

    const nexusUsername = String(
      (nexusInfo && typeof nexusInfo === 'object' ? nexusInfo.username : '') || '',
    ).trim();
    // Corporate: verify by username only (userinfoforcorporate.username) — not contactEmail.
    const corporateUsername = hasCorporateInfo
      ? String((corporateInfo as { username?: string }).username || '').trim()
      : '';
    const sfSaysCorporateRole = this.isSalesforceCorporateRole(corporateInfo);

    // Prefer Corporate when:
    // - Org Portal SSO (loginAsCorporate / returnTo=/corporate), or
    // - Salesforce userinfoforcorporate.role is "corporate" (any casing), or
    // - Corporate userinfo exists and there is no individual nexus username
    // Local DB always stores UserRole.Corporate ("Corporate").
    const preferCorporateLogin =
      Boolean(options?.loginAsCorporate)
      || sfSaysCorporateRole
      || (hasCorporateInfo && !nexusUsername);

    let targetRole: UserRole = preferCorporateLogin ? UserRole.Corporate : UserRole.User;
    if (preferCorporateLogin) {
      const staffProbe = await this.resolveLocalUserForSsoLogin({
        email,
        salesforceUsername: nexusUsername || corporateUsername || email,
        salesforceAccountId: String(
          (nexusInfo && typeof nexusInfo === 'object' ? nexusInfo.accountID : '') || '',
        ).trim(),
        role: UserRole.User,
      });
      if (staffProbe.user && this.isStaffLearnerAccount(staffProbe.user)) {
        targetRole = UserRole.User;
        console.log('[SSO Login] Staff learner matched — using Individual record:', {
          userId: staffProbe.user.id,
        });
      }
    }

    // Corporate → userinfoforcorporate.username only ; Individual → userinfonexus.username
    const salesforceUsername =
      targetRole === UserRole.Corporate
        ? (corporateUsername || email)
        : (nexusUsername || email);

    const salesforceAccountId = String(
      targetRole === UserRole.Corporate
        ? (
            (hasCorporateInfo ? (corporateInfo as { accountId?: string }).accountId : '')
            || (nexusInfo && typeof nexusInfo === 'object' ? nexusInfo.accountID : '')
            || ''
          )
        : (
            (nexusInfo && typeof nexusInfo === 'object' ? nexusInfo.accountID : '')
            || (hasCorporateInfo ? (corporateInfo as { accountId?: string }).accountId : '')
            || ''
          ),
    ).trim();

    // Corporate: match by username only (no contactEmail / accountId / email fallback).
    let resolved: {
      user: UserEntity | null;
      matchedBy: 'username' | 'accountId' | 'email' | null;
    };
    if (targetRole === UserRole.Corporate) {
      if (!corporateUsername) {
        throw new UnauthorizedException(
          'Corporate Salesforce account did not return a username. Please contact support.',
        );
      }
      resolved = await this.resolveLocalUserByUsernameOnly({
        salesforceUsername: corporateUsername,
        role: UserRole.Corporate,
      });
    } else {
      resolved = await this.resolveLocalUserForSsoLogin({
        email,
        salesforceUsername,
        salesforceAccountId,
        role: targetRole,
      });
    }
    let user = resolved.user;
    const isNewUser = !user;

    console.log('[SSO Login] Resolved identity:', {
      email,
      corporateUsername: corporateUsername || null,
      socialId,
      firstName,
      lastName,
      salesforceUsername: salesforceUsername || null,
      salesforceAccountId: salesforceAccountId || null,
      targetRole,
      preferCorporateLogin,
      sfSaysCorporateRole,
      loginAsCorporate: Boolean(options?.loginAsCorporate),
      matchedBy: resolved.matchedBy,
      isNewUser,
      existingUserId: user?.id || null,
      existingEmail: user?.email || null,
    });

    if (!user) {
      const contactEmail =
        targetRole === UserRole.Corporate && hasCorporateInfo
          ? normalizeEmail(String((corporateInfo as { contactEmail?: string }).contactEmail || ''))
          : '';
      const createEmail = contactEmail || email;
      await assertEmailAvailableForRole(this.userRepository, createEmail, targetRole);

      // Use Salesforce username as local DB username (Corporate + Individual).
      const username = await this.resolveLocalUsernameFromSalesforce(
        salesforceUsername || createEmail,
      );
      const newUserPartial: DeepPartial<UserEntity> = {
        username,
        firstname:
          firstName
          || (targetRole === UserRole.Corporate && hasCorporateInfo
            ? String((corporateInfo as { contactFirstName?: string }).contactFirstName || '')
            : '')
          || 'User',
        lastname:
          lastName
          || (targetRole === UserRole.Corporate && hasCorporateInfo
            ? String((corporateInfo as { contactLastName?: string }).contactLastName || '')
            : '')
          || createEmail.split('@')[0],
        email: createEmail,
        password: null,
        authProvider: AuthProvider.OAUTH,
        socialId: socialId || null,
        socialAccessToken: idpAccessToken,
        isVerified: true,
        role: targetRole,
        status: UserStatus.Active,
        salesforceUsername: salesforceUsername || null,
      };
      user = this.userRepository.create(newUserPartial);
      console.log('[SSO Login] Creating NEW user for SSO:', {
        email: createEmail,
        username,
        role: targetRole,
        salesforceUsername,
      });
    } else {
      if (resolved.matchedBy === 'username' || resolved.matchedBy === 'accountId') {
        // Corporate profile email is applied later from contactEmail.
        if (targetRole !== UserRole.Corporate) {
          await this.applySsoEmailIfChanged(user, email);
        }
      }
      user.authProvider = AuthProvider.OAUTH;
      user.socialId = socialId || user.socialId || null;
      user.socialAccessToken = idpAccessToken;
      user.isVerified = true;
      if (firstName) user.firstname = firstName;
      if (lastName) user.lastname = lastName;
      if (salesforceUsername) {
        user.salesforceUsername = salesforceUsername;
        await this.applySalesforceUsernameAsLocalUsername(user, salesforceUsername);
      }
      console.log('[SSO Login] Updating EXISTING user via SSO:', {
        id: user.id,
        email: user.email,
        role: user.role,
        matchedBy: resolved.matchedBy,
      });
    }

    // Nexus flags only on Individual rows (never overwrite Corporate identity).
    if (nexusInfo && typeof nexusInfo === 'object' && user.role === UserRole.User) {
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
      if (user.salesforceUsername) {
        await this.applySalesforceUsernameAsLocalUsername(user, user.salesforceUsername);
      }
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
    } else if (nexusInfo && typeof nexusInfo === 'object' && user.role === UserRole.Corporate) {
      user.salesforceUserInfoRaw = {
        ...(user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
          ? user.salesforceUserInfoRaw
          : {}),
        nexus: nexusInfo as Record<string, unknown>,
      };
    } else if (user.role === UserRole.User) {
      console.warn('[SSO Login] No Salesforce nexus user info available — SCAQ/Associate flags NOT updated.');
    }

    // Corporate HR: update Corporate row only — never promote Individual → Corporate.
    if (hasCorporateInfo && user.role === UserRole.Corporate) {
      const companyCode = this.resolveCorporateCompanyCode(corporateInfo);
      const accountId = String((corporateInfo as { accountId?: string }).accountId || '').trim();
      const contactEmail = normalizeEmail(
        String((corporateInfo as { contactEmail?: string }).contactEmail || ''),
      );
      // Identity key is username only; contactEmail is profile email only.
      const contactUsername = String(corporateUsername || '').trim();

      if (companyCode) user.companyCode = companyCode;
      if (accountId) user.salesforceAccountId = accountId;
      if (contactUsername) {
        user.salesforceUsername = contactUsername;
        await this.applySalesforceUsernameAsLocalUsername(user, contactUsername);
      }
      if (contactEmail) {
        await this.applySsoEmailIfChanged(user, contactEmail);
      }
      const contactFirst = String(
        (corporateInfo as { contactFirstName?: string }).contactFirstName || '',
      ).trim();
      const contactLast = String(
        (corporateInfo as { contactLastName?: string }).contactLastName || '',
      ).trim();
      if (contactFirst) user.firstname = contactFirst;
      if (contactLast) user.lastname = contactLast;

      user.salesforceUserInfoRaw = {
        ...(user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
          ? user.salesforceUserInfoRaw
          : {}),
        corporate: corporateInfo,
      };
      user.salesforceSyncedAt = new Date();
      console.log('[SSO Login] Corporate Salesforce user — Corporate record updated:', {
        companyCode: companyCode || null,
        accountId: accountId || null,
        username: contactUsername || null,
        contactEmail: contactEmail || null,
      });
      if (companyCode) {
        try {
          let accountName = String(
            (corporateInfo as { accountName?: string; companyName?: string; name?: string })
              ?.accountName
            || (corporateInfo as { companyName?: string })?.companyName
            || (corporateInfo as { name?: string })?.name
            || '',
          ).trim();
          if (!accountName && accountId) {
            accountName = (await this.fetchSalesforceAccountNameById(accountId)) || '';
          }
          await this.companyEnrollmentService.ensureInviteForCompanyCode({
            companyCode,
            label: accountName || companyCode,
          });
        } catch (inviteErr) {
          console.error('[SSO Login] Failed to auto-create company QR invite (non-fatal):', inviteErr);
        }
      }
    } else if (hasCorporateInfo && this.isStaffLearnerAccount(user)) {
      const companyCode = this.resolveCorporateCompanyCode(corporateInfo);
      const existingCompanyCode = String(user.companyCode || '').trim();
      if (!existingCompanyCode && companyCode) {
        user.companyCode = companyCode;
      }
      console.log('[SSO Login] Staff learner matched corporate userinfo — keeping User role:', {
        userId: user.id,
        companyCode: user.companyCode || null,
        sfCompanyCode: companyCode || null,
      });
    } else if (user.role === UserRole.Corporate) {
      console.log('[SSO Login] Preserving existing Corporate role (corporate userinfo unavailable).');
      const existingCode = String(user.companyCode || '').trim();
      if (existingCode) {
        try {
          await this.companyEnrollmentService.ensureInviteForCompanyCode({
            companyCode: existingCode,
          });
        } catch (inviteErr) {
          console.error('[SSO Login] Failed to ensure company QR invite (non-fatal):', inviteErr);
        }
      }
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

  /**
   * Persist platform user from SSO, then mark the Salesforce account as an AI Nexus user.
   * Only call from code paths where application login has succeeded (not profile-only / blocked).
   */
  private async completeSuccessfulPlatformLogin(
    idpUserInfo: IdPUserInfo,
    idpAccessToken: string,
    syncFn?: (userId: string) => Promise<unknown>,
    options?: { loginAsCorporate?: boolean },
  ): Promise<ProcessOAuthResult> {
    const result = await this.processOAuthAuthentication(idpUserInfo, idpAccessToken, syncFn, {
      loginAsCorporate: Boolean(options?.loginAsCorporate),
    });
    await this.markSalesforceAccountAsAiNexusUser(result.user.salesforceAccountId);
    return result;
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

  /**
   * Use Salesforce username as the local DB username.
   * Throws if that username is already taken by another account.
   */
  private async resolveLocalUsernameFromSalesforce(salesforceUsername: string): Promise<string> {
    const candidate = String(salesforceUsername || '').trim();
    if (!candidate) {
      throw new BadRequestException('Salesforce username is required.');
    }

    const existing = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username: candidate })
      .getOne();
    if (existing) {
      throw new ConflictException('Username already exists.');
    }

    return candidate;
  }

  /** Sync local username to Salesforce username; error if already taken by another user. */
  private async applySalesforceUsernameAsLocalUsername(
    user: UserEntity,
    salesforceUsername: string,
  ): Promise<void> {
    const next = String(salesforceUsername || '').trim();
    if (!next) return;

    const current = String(user.username || '').trim();
    if (current.toLowerCase() === next.toLowerCase()) {
      user.username = next;
      return;
    }

    const owner = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username: next })
      .getOne();
    if (owner && owner.id !== user.id) {
      throw new ConflictException('Username already exists.');
    }

    console.log('[SSO Login] Syncing local username to Salesforce username:', {
      userId: user.id,
      previousUsername: current || null,
      nextUsername: next,
    });
    user.username = next;
  }

  /** Build redirect URL for mobile deep link (success or error). */
  createMobileRedirectUrl(params: Record<string, string>): string {
    const scheme = this.deepLinkScheme.replace(/\/$/, '').split('?')[0];
    const search = new URLSearchParams(params).toString();
    return search ? `${scheme}?${search}` : scheme;
  }

  /** Revoke eServices token and clear server session when platform login is denied. */
  async endEservicesSession(socialAccessToken?: string): Promise<{
    success: boolean;
    browserLogoutUrl: string | null;
  }> {
    const token = String(socialAccessToken || '').trim();
    if (token) {
      await this.clearSalesforceMobileSession(token);
      await this.revokeIdpToken(token);
    }
    return {
      success: true,
      browserLogoutUrl: this.buildBrowserLogoutUrl(),
    };
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
