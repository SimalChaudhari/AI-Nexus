import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { UserEntity } from '../user/users.entity';
import { OAuthAuthService } from '../auth/oauth-auth.service';
import { SalesforceCpeComplianceSyncEntity } from './salesforce-cpe-compliance-sync.entity';

export type SalesforceCpeCompliancePayload = {
  userId: string;
  courseId: string;
  programId?: string | null;
  courseTitle: string;
  noOfCpeHours: number;
  hoursAllocated: number;
};

export type SalesforceCpeComplianceResult = {
  success: boolean;
  skipped?: boolean;
  message?: string;
  recordId?: string | null;
  data?: Record<string, unknown>;
};

function roundCpeHours(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function currentCpeYear(): string {
  return new Intl.DateTimeFormat('en-SG', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
  }).format(new Date());
}

function toNumber(value: unknown): number {
  return roundCpeHours(Number(value) || 0);
}

/**
 * Salesforce Apex REST: cpecompliancefornexus
 * Creates a CPE Compliance record when Pillar 3 earned hours first appear or change.
 */
@Injectable()
export class SalesforceCpeComplianceService {
  private readonly logger = new Logger(SalesforceCpeComplianceService.name);
  private readonly inFlight = new Set<string>();
  private readonly lastFingerprint = new Map<string, string>();
  private readonly missingAccountWarned = new Set<string>();
  private readonly lastFailureAt = new Map<string, number>();
  private static readonly FAILURE_RETRY_MS = 60_000;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(SalesforceCpeComplianceSyncEntity)
    private readonly syncRepository: Repository<SalesforceCpeComplianceSyncEntity>,
    private readonly oauthAuthService: OAuthAuthService,
  ) {}

  private get instanceBaseUrl(): string {
    return String(process.env.OAUTH_INSTANCE_URL || '').replace(/\/$/, '');
  }

  private get cpeCompliancePath(): string {
    const p =
      process.env.OAUTH_CPE_COMPLIANCE_PATH || '/services/apexrest/cpecompliancefornexus';
    return p.startsWith('/') ? p : `/${p}`;
  }

  private get cpeComplianceUrl(): string {
    const fullUrl = process.env.OAUTH_CPE_COMPLIANCE_URL?.trim();
    if (fullUrl) return fullUrl.split('?')[0].replace(/\/$/, '');
    const siteBase = this.instanceBaseUrl;
    if (siteBase) return `${siteBase}${this.cpeCompliancePath}`;
    return this.cpeCompliancePath;
  }

  private static readonly COURSE_TITLE = 'AI Fluency';
  private static readonly COURSE_ORGANIZER = 'AI Fluency';

  private maskToken(token: string | null | undefined): string {
    const value = String(token || '').trim();
    if (!value) return '(empty)';
    if (value.length <= 10) return `${value.slice(0, 2)}…`;
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  }

  private fingerprint(noOfCpeHours: number, hoursAllocated: number, cpeYear: string): string {
    return `${roundCpeHours(noOfCpeHours)}|${roundCpeHours(hoursAllocated)}|${cpeYear}`;
  }

  /**
   * POST CPE hours to Salesforce only when Pillar 3 earned hours first become visible
   * or when earned/allocated hours change. Repeat watch-progress pings with the same
   * hours are skipped.
   */
  async syncIfHoursChanged(input: SalesforceCpeCompliancePayload): Promise<SalesforceCpeComplianceResult> {
    const noOfCpeHours = roundCpeHours(input.noOfCpeHours);
    const hoursAllocated = roundCpeHours(input.hoursAllocated);
    const courseTitle = SalesforceCpeComplianceService.COURSE_TITLE;
    const courseOrganizer = SalesforceCpeComplianceService.COURSE_ORGANIZER;
    const cpeYear = currentCpeYear();
    const cacheKey = `${input.userId}:${input.courseId}:${cpeYear}`;

    if (noOfCpeHours <= 0) {
      return { success: false, skipped: true, message: 'Pillar 3 CPE hours not visible yet' };
    }

    if (this.lastFingerprint.get(cacheKey) === this.fingerprint(noOfCpeHours, hoursAllocated, cpeYear)) {
      return { success: true, skipped: true, message: 'CPE hours unchanged' };
    }

    if (this.inFlight.has(cacheKey)) {
      return { success: false, skipped: true, message: 'CPE compliance sync already in flight' };
    }
    const lastFailure = this.lastFailureAt.get(cacheKey) || 0;
    if (lastFailure && Date.now() - lastFailure < SalesforceCpeComplianceService.FAILURE_RETRY_MS) {
      return { success: false, skipped: true, message: 'CPE compliance sync waiting to retry' };
    }
    this.inFlight.add(cacheKey);

    try {
      const existing = await this.syncRepository.findOne({
        where: { userId: input.userId, courseId: input.courseId, cpeYear },
      });
      if (
        existing &&
        toNumber(existing.lastNoOfCpeHours) === noOfCpeHours &&
        toNumber(existing.lastHoursAllocated) === hoursAllocated
      ) {
        this.lastFingerprint.set(cacheKey, this.fingerprint(noOfCpeHours, hoursAllocated, cpeYear));
        return { success: true, skipped: true, message: 'CPE hours unchanged', recordId: existing.salesforceRecordId };
      }

      const user = await this.userRepository.findOne({
        where: { id: input.userId },
        select: ['id', 'salesforceAccountId'],
      });
      const accountId = String(user?.salesforceAccountId || '').trim();
      if (!accountId) {
        if (!this.missingAccountWarned.has(input.userId)) {
          this.missingAccountWarned.add(input.userId);
          this.logger.warn(
            `[Salesforce CPE] Skipping cpecompliancefornexus — missing salesforceAccountId for user=${input.userId}`,
          );
        }
        this.lastFingerprint.set(cacheKey, this.fingerprint(noOfCpeHours, hoursAllocated, cpeYear));
        return { success: false, skipped: true, message: 'Missing Salesforce accountId' };
      }

      const url = this.cpeComplianceUrl;
      const body = {
        accountId,
        cpeYear,
        noOfCPEHours: noOfCpeHours,
        hoursAllocated,
        courseTitle,
        courseOrganizer,
      };

      const accessToken = await this.oauthAuthService.getIntegrationAccessToken();
      this.logger.log('[Salesforce CPE] POST cpecompliancefornexus:', {
        url,
        accountId,
        cpeYear,
        noOfCPEHours: noOfCpeHours,
        hoursAllocated,
        courseTitle,
        token: this.maskToken(accessToken),
      });

      const res = await axios.post<Record<string, unknown> | string>(url, body, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 20000,
      });

      const data =
        res.data && typeof res.data === 'object'
          ? (res.data as Record<string, unknown>)
          : { raw: res.data };

      const success = data.success !== false;
      if (!success) {
        this.lastFailureAt.set(cacheKey, Date.now());
        this.logger.error('[Salesforce CPE] cpecompliancefornexus returned unsuccessful:', {
          status: res.status,
          data,
          accountId,
        });
        return {
          success: false,
          message: String(data.message || 'Salesforce CPE compliance request failed'),
          data,
        };
      }

      const recordId = data.recordId != null ? String(data.recordId) : null;
      const saved = existing
        ? this.syncRepository.merge(existing, {
            programId: input.programId || existing.programId || null,
            lastNoOfCpeHours: noOfCpeHours,
            lastHoursAllocated: hoursAllocated,
            lastCourseTitle: courseTitle,
            salesforceRecordId: recordId,
            lastSyncedAt: new Date(),
          })
        : this.syncRepository.create({
            userId: input.userId,
            courseId: input.courseId,
            programId: input.programId || null,
            cpeYear,
            lastNoOfCpeHours: noOfCpeHours,
            lastHoursAllocated: hoursAllocated,
            lastCourseTitle: courseTitle,
            salesforceRecordId: recordId,
            lastSyncedAt: new Date(),
          });
      await this.syncRepository.save(saved);
      this.lastFailureAt.delete(cacheKey);
      this.lastFingerprint.set(cacheKey, this.fingerprint(noOfCpeHours, hoursAllocated, cpeYear));

      this.logger.log('[Salesforce CPE] cpecompliancefornexus success:', {
        status: res.status,
        accountId,
        recordId,
        noOfCPEHours: noOfCpeHours,
        data,
      });
      return {
        success: true,
        recordId,
        message: String(data.message || 'CPE Compliance record created successfully'),
        data,
      };
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        this.lastFailureAt.set(cacheKey, Date.now());
        this.logger.error('[Salesforce CPE] cpecompliancefornexus failed (non-fatal):', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
          userId: input.userId,
          courseId: input.courseId,
          url: this.cpeComplianceUrl,
        });
        return {
          success: false,
          message: err.message || 'Failed to create CPE compliance record in Salesforce',
        };
      }
      this.lastFailureAt.set(cacheKey, Date.now());
      this.logger.error('[Salesforce CPE] cpecompliancefornexus failed (non-fatal):', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to create CPE compliance record in Salesforce',
      };
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }
}
