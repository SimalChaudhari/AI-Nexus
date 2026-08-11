import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { UserEntity } from '../user/users.entity';
import { OAuthAuthService } from './oauth-auth.service';

export type SalesforceBadgeCreateResult = {
  success: boolean;
  skipped?: boolean;
  alreadyExists?: boolean;
  message?: string;
  data?: Record<string, unknown>;
};

/**
 * Salesforce Apex REST: createbadgeforainexus
 * Creates an AI Nexus digital badge on the learner's eServices Account.
 */
@Injectable()
export class SalesforceBadgeService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly oauthAuthService: OAuthAuthService,
  ) {}

  private get instanceBaseUrl(): string {
    return String(process.env.OAUTH_INSTANCE_URL || '').replace(/\/$/, '');
  }

  private get createBadgePath(): string {
    const p =
      process.env.OAUTH_CREATE_BADGE_PATH || '/services/apexrest/createbadgeforainexus';
    return p.startsWith('/') ? p : `/${p}`;
  }

  private get createBadgeBaseUrl(): string {
    const fullUrl = process.env.OAUTH_CREATE_BADGE_URL?.trim();
    if (fullUrl) return fullUrl.split('?')[0].replace(/\/$/, '');
    const siteBase = this.instanceBaseUrl;
    if (siteBase) return `${siteBase}${this.createBadgePath}`;
    return this.createBadgePath;
  }

  buildCreateBadgeUrl(accountId: string): string {
    const params = new URLSearchParams({ accountId });
    return `${this.createBadgeBaseUrl}?${params.toString()}`;
  }

  private maskToken(token: string | null | undefined): string {
    const value = String(token || '').trim();
    if (!value) return '(empty)';
    if (value.length <= 10) return `${value.slice(0, 2)}…`;
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  }

  /**
   * Create AI Nexus badge in Salesforce for a learner account (integration token).
   * Best-effort / non-fatal — local certificate/badge issue must not fail if Salesforce rejects.
   * Duplicate badges (HTTP 409) are treated as success.
   */
  async createBadgeForAccount(accountId: string | null | undefined): Promise<SalesforceBadgeCreateResult> {
    const normalizedAccountId = String(accountId || '').trim();
    if (!normalizedAccountId) {
      console.warn('[Salesforce Badge] Skipping createbadgeforainexus — missing accountId');
      return { success: false, skipped: true, message: 'Missing Salesforce accountId' };
    }

    const url = this.buildCreateBadgeUrl(normalizedAccountId);
    try {
      const accessToken = await this.oauthAuthService.getIntegrationAccessToken();
      console.log('[Salesforce Badge] POST createbadgeforainexus:', {
        url,
        accountId: normalizedAccountId,
        token: this.maskToken(accessToken),
      });

      const res = await axios.post<Record<string, unknown> | string>(url, {}, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 20000,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
      });

      const data =
        res.data && typeof res.data === 'object'
          ? (res.data as Record<string, unknown>)
          : { raw: res.data };

      if (res.status === 409) {
        console.log('[Salesforce Badge] createbadgeforainexus already exists:', {
          status: res.status,
          accountId: normalizedAccountId,
          data,
        });
        return {
          success: true,
          alreadyExists: true,
          message: String(data.message || 'Badge already exists for this Account'),
          data,
        };
      }

      console.log('[Salesforce Badge] createbadgeforainexus success:', {
        status: res.status,
        accountId: normalizedAccountId,
        data,
      });
      return { success: true, data };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const responseData = err.response?.data;
        const data =
          responseData && typeof responseData === 'object'
            ? (responseData as Record<string, unknown>)
            : undefined;

        if (status === 409) {
          console.log('[Salesforce Badge] createbadgeforainexus already exists:', {
            status,
            accountId: normalizedAccountId,
            data: responseData,
          });
          return {
            success: true,
            alreadyExists: true,
            message: String(data?.message || 'Badge already exists for this Account'),
            data,
          };
        }

        console.error('[Salesforce Badge] createbadgeforainexus failed (non-fatal):', {
          status,
          data: responseData,
          message: err.message,
          accountId: normalizedAccountId,
          url,
        });
        return {
          success: false,
          message:
            (data?.message as string | undefined)
            || err.message
            || 'Failed to create badge in Salesforce',
          data,
        };
      }

      console.error('[Salesforce Badge] createbadgeforainexus failed (non-fatal):', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to create badge in Salesforce',
      };
    }
  }

  /** Resolve learner Salesforce accountId, then create badge (non-fatal). */
  async createBadgeForUser(userId: string): Promise<SalesforceBadgeCreateResult> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'salesforceAccountId'],
    });
    if (!user) {
      console.warn('[Salesforce Badge] Skipping createbadgeforainexus — user not found:', userId);
      return { success: false, skipped: true, message: 'User not found' };
    }
    return this.createBadgeForAccount(user.salesforceAccountId);
  }
}
