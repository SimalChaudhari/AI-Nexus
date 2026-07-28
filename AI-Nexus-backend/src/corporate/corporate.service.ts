import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { In, IsNull, Not, Repository } from 'typeorm';

import { UserEntity, UserRole, UserStatus, AuthProvider } from '../user/users.entity';
import { ProgramEntity, ProgramStatus } from '../program/programs.entity';
import { CourseEntity } from '../course/courses.entity';
import {
  CourseCertificateEntity,
  CourseCertificateStatus,
} from '../course/course-certificate.entity';
import { CourseSectionWatchProgressEntity } from '../course/course-section-watch-progress.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { CourseSectionWatchProgressService } from '../course/course-section-watch-progress.service';
import { CourseQuizAssessmentProgressService } from '../course/course-quiz-assessment-progress.service';
import { CourseCertificateService } from '../course/course-certificate.service';
import { EmailService } from '../service/email.service';
import {
  computeCpeHoursFromWatchSeconds,
  resolveCoursePillarIndex,
} from '../course/course-program-cpe-summary.util';
import { buildCourseOverallProgress } from '../course/course-overall-progress.util';
import { CorporateLearnerNudgeEntity } from './corporate-learner-nudge.entity';
import { CorporateNudgeCampaignEntity } from './corporate-nudge-campaign.entity';
import { CorporateNudgeEmailLogEntity } from './corporate-nudge-email-log.entity';
import { CorporateBulkEnrolmentUploadEntity } from './corporate-bulk-enrolment-upload.entity';
import { CorporateStaffEnrolBatchEntity } from './corporate-staff-enrol-batch.entity';
import { OAuthAuthService } from '../auth/oauth-auth.service';
import { CompanyEnrollmentService } from '../company-enrollment/company-enrollment.service';
import type { CorporateStaffLearnerDto } from './corporate-enrol.dto';
import type { CorporateForeignQuotationDto } from './corporate-foreign-quotation.dto';
import {
  normalizeSingaporeNricFin,
  SINGAPORE_NRIC_FIN_USER_MESSAGES,
  validateSingaporeNricFin,
} from '../auth/utils/singapore-nric-fin.util';

// ----------------------------------------------------------------------

const AT_RISK_INACTIVE_DAYS = 7;
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BULK_ENROLMENT_ZIP_MAX_BYTES = 500 * 1024 * 1024;
const BULK_ENROLMENT_CSV_MAX_BYTES = 5 * 1024 * 1024;
const BULK_ENROLMENT_CSV_MAX_ROWS = 500;
const BULK_ENROLMENT_SF_BATCH_SIZE = (() => {
  const parsed = Number(process.env.BULK_ENROLMENT_SF_BATCH_SIZE || 100);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 100) : 100;
})();
const BULK_ENROLMENT_STORAGE_DIR = join(
  process.cwd(),
  'storage',
  'corporate-bulk-enrolments',
);
/** Max emails processed per batch in a nudge campaign. Override with CORPORATE_NUDGE_CAMPAIGN_BATCH_SIZE. */
const NUDGE_CAMPAIGN_BATCH_SIZE = (() => {
  const raw = Number(process.env.CORPORATE_NUDGE_CAMPAIGN_BATCH_SIZE);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 500) return Math.floor(raw);
  return 100;
})();
/** Pause between batches (ms) so SMTP is not overloaded. */
const NUDGE_CAMPAIGN_BATCH_PAUSE_MS = (() => {
  const raw = Number(process.env.CORPORATE_NUDGE_CAMPAIGN_BATCH_PAUSE_MS);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 60_000) return Math.floor(raw);
  return 750;
})();

export type CorporateLearnerStatus = 'Completed' | 'In Progress' | 'At Risk';

export type CorporatePillarProgress = {
  /** Earned CPE hours (0.5h floor rule — same as player/certificates). */
  c: number;
  /** Total pillar CPE hours from module duration (same 0.5h floor rule). */
  t: number;
  /** Actual watch hours (wall-clock). */
  w?: number;
  q?: boolean;
  a?: boolean;
  e?: boolean;
  /** Equal-weight unit completion % (same as My Progress / learning player). */
  completionPercent?: number | null;
  /** Course used for current module / UI progress in this pillar. */
  courseId?: string | null;
  /** Current module title within this pillar. */
  moduleTitle?: string | null;
  /** Current section (lesson) title within this pillar. */
  lessonTitle?: string | null;
};

export type CorporateLearnerRow = {
  userId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  eligibility: string;
  profession: string;
  status: CorporateLearnerStatus;
  lastActive: string;
  lastActiveAt: string | null;
  lastLogin: string;
  lastLoginAt: string | null;
  cert: boolean;
  certificateId: string | null;
  certificateNo: string | null;
  pending: string;
  p1: CorporatePillarProgress;
  p2: CorporatePillarProgress;
  p3: CorporatePillarProgress;
  lastNudgedAt: string | null;
  canNudge: boolean;
  nextNudgeAt: string | null;
};

type PillarLessonInfo = {
  courseId: string | null;
  courseTitle: string | null;
  moduleTitle: string | null;
  lessonTitle: string | null;
};

@Injectable()
export class CorporateService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProgramEntity)
    private readonly programRepository: Repository<ProgramEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(CourseCertificateEntity)
    private readonly certificateRepository: Repository<CourseCertificateEntity>,
    @InjectRepository(CourseSectionWatchProgressEntity)
    private readonly sectionWatchRepository: Repository<CourseSectionWatchProgressEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly courseModuleRepository: Repository<CourseModuleEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly courseModuleSectionRepository: Repository<CourseModuleSectionEntity>,
    @InjectRepository(CorporateLearnerNudgeEntity)
    private readonly nudgeRepository: Repository<CorporateLearnerNudgeEntity>,
    @InjectRepository(CorporateNudgeCampaignEntity)
    private readonly nudgeCampaignRepository: Repository<CorporateNudgeCampaignEntity>,
    @InjectRepository(CorporateNudgeEmailLogEntity)
    private readonly nudgeEmailLogRepository: Repository<CorporateNudgeEmailLogEntity>,
    @InjectRepository(CorporateBulkEnrolmentUploadEntity)
    private readonly bulkEnrolmentUploadRepository: Repository<CorporateBulkEnrolmentUploadEntity>,
    @InjectRepository(CorporateStaffEnrolBatchEntity)
    private readonly staffEnrolBatchRepository: Repository<CorporateStaffEnrolBatchEntity>,
    private readonly courseSectionWatchProgressService: CourseSectionWatchProgressService,
    private readonly courseQuizAssessmentProgressService: CourseQuizAssessmentProgressService,
    private readonly courseCertificateService: CourseCertificateService,
    private readonly emailService: EmailService,
    private readonly oauthAuthService: OAuthAuthService,
    private readonly companyEnrollmentService: CompanyEnrollmentService,
  ) {}

  private isPassportIdType(idType: string): boolean {
    return String(idType || '')
      .trim()
      .toLowerCase()
      .includes('passport');
  }

  private isSingaporeNricIdType(idType: string): boolean {
    const normalized = String(idType || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, ' ');
    if (!normalized) return true;
    if (normalized.includes('passport')) return false;
    return (
      normalized.includes('nric')
      || normalized === 'nric'
      || normalized.includes('fin')
    );
  }

  /**
   * Validate / normalize staff ID number.
   * Singapore NRIC/Pink/Blue/FIN → checksum rules from eligibility util.
   * Passport → required non-empty only.
   */
  private validateStaffIdNumber(params: {
    idType?: string;
    idNumber?: string;
  }): { ok: true; normalized: string } | { ok: false; reason: string } {
    const idType = String(params.idType || '').trim();
    const idNumber = String(params.idNumber || '').trim();

    if (!idNumber) {
      return { ok: false, reason: 'NRIC / ID number is required.' };
    }

    if (this.isPassportIdType(idType) || !this.isSingaporeNricIdType(idType)) {
      return { ok: true, normalized: idNumber };
    }

    const normalized = normalizeSingaporeNricFin(idNumber);
    try {
      const validation = validateSingaporeNricFin(normalized);
      if (!validation.isValid) {
        return { ok: false, reason: SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidChecksum };
      }
      return { ok: true, normalized: validation.normalized };
    } catch {
      return { ok: false, reason: SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidFormat };
    }
  }

  private looksLikeSalesforceAccountId(value: string): boolean {
    return /^001[a-zA-Z0-9]{12,17}$/.test(String(value || '').trim());
  }

  private async resolveCorporateAccountId(params: {
    actorUserId?: string;
    companyCode?: string;
  }): Promise<string> {
    const companyCode = String(params.companyCode || '').trim();
    const actorUserId = String(params.actorUserId || '').trim();

    if (actorUserId) {
      const actor = await this.userRepository.findOne({ where: { id: actorUserId } });
      const fromActor = String(actor?.salesforceAccountId || '').trim();
      if (fromActor) return fromActor;
    }

    if (companyCode && this.looksLikeSalesforceAccountId(companyCode)) {
      return companyCode;
    }

    if (companyCode) {
      const corporateUser = await this.userRepository.findOne({
        where: {
          role: UserRole.Corporate,
          companyCode,
          salesforceAccountId: Not(IsNull()),
        },
        order: { updatedAt: 'DESC' },
      });
      const fromCompany = String(corporateUser?.salesforceAccountId || '').trim();
      if (fromCompany) return fromCompany;
    }

    throw new BadRequestException(
      'Corporate Salesforce account ID is missing. Please sign in again via corporate SSO so the account can be linked.',
    );
  }

  private async resolveEnrolCompanyCode(params: {
    actorUserId?: string;
    companyCode?: string;
  }): Promise<string> {
    const fromParams = String(params.companyCode || '').trim();
    if (fromParams) return fromParams;
    const actorUserId = String(params.actorUserId || '').trim();
    if (actorUserId) {
      const actor = await this.userRepository.findOne({ where: { id: actorUserId } });
      const fromActor = String(actor?.companyCode || '').trim();
      if (fromActor) return fromActor;
    }
    const fallback = String(process.env.CORPORATE_PUBLIC_COMPANY_CODE || '').trim();
    if (fallback) return fallback;
    throw new BadRequestException(
      'Corporate company code is missing. Please sign in again via corporate SSO.',
    );
  }

  private normalizeStaffLearner(
    row: CorporateStaffLearnerDto,
    corporateAccountId: string,
    defaults?: { company?: string; countryOfResidence?: string },
  ) {
    const firstName = String(row.first_name || '').trim();
    const lastName = String(row.last_name || '').trim();
    const email = String(row.email || '').trim().toLowerCase();
    if (!firstName || !lastName || !email) {
      throw new BadRequestException('first_name, last_name and email are required for each learner.');
    }

    const payload: Record<string, string | number | boolean> & {
      first_name: string;
      last_name: string;
      email: string;
      name_as_per_id: string;
      corporateAccountId: string;
      isAuthorisedSubmit: boolean;
    } = {
      first_name: firstName,
      last_name: lastName,
      email,
      name_as_per_id:
        String(row.name_as_per_id || '').trim() || `${firstName} ${lastName}`.trim(),
      corporateAccountId,
      isAuthorisedSubmit: true,
    };

    const salutation = String(row.salutation || '').trim();
    if (salutation) payload.salutation = salutation;

    const idType = String(row.id_type || '').trim();
    if (idType) payload.id_type = idType;

    const idNumber = String(row.id_number || '').trim();
    if (idNumber) payload.id_number = idNumber;

    const company =
      String(defaults?.company || '').trim() || String(row.company || '').trim();
    if (company) payload.company = company;

    const department = String(row.department || '').trim();
    if (department) payload.department = department;

    const role = String(row.role || '').trim();
    if (role) payload.role = role;

    const countryOfResidence =
      String(row.countryOfResidence || '').trim()
      || String(defaults?.countryOfResidence || '').trim()
      || 'Singapore';
    payload.countryOfResidence = countryOfResidence;

    if (
      row.noOfYearOfRelevantWorkExperience !== undefined
      && row.noOfYearOfRelevantWorkExperience !== null
      && String(row.noOfYearOfRelevantWorkExperience).trim() !== ''
    ) {
      const years = Number(row.noOfYearOfRelevantWorkExperience);
      if (!Number.isNaN(years)) {
        payload.noOfYearOfRelevantWorkExperience = years;
      }
    }

    const learnerAsAnAccounting = String(row.learnerAsAnAccounting || '').trim();
    if (learnerAsAnAccounting) payload.learnerAsAnAccounting = learnerAsAnAccounting;

    const membershipNumber = String(row.membershipNumber || '').trim();
    if (membershipNumber) payload.membershipNumber = membershipNumber;

    const eligibility = String(row.eligibility || '').trim();
    if (eligibility) payload.eligibility = eligibility;

    // Salesforce Authorised_Submit_For_Nexus__c expects boolean true after HR checkbox validation.

    return payload;
  }

  private async generateStaffUsername(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const emailLocal = String(email || '')
      .split('@')[0]
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
    const baseRaw =
      emailLocal
      || `${String(firstName || '').replace(/[^a-zA-Z0-9]/g, '')}${String(lastName || '').replace(/[^a-zA-Z0-9]/g, '')}`.toLowerCase()
      || 'staff';
    let base = (baseRaw.slice(0, 20) || 'staff').replace(/[^a-z0-9]/gi, '');
    if (!/[a-z]/i.test(base) || !/\d/.test(base)) {
      base = `${base}1`.slice(0, 24);
    }

    for (let i = 0; i < 30; i += 1) {
      const candidate = i === 0 ? base : `${base}${i + 1}`.slice(0, 32);
      const existing = await this.userRepository.findOne({ where: { username: candidate } });
      if (!existing) return candidate;
    }
    return `${base}${Date.now().toString().slice(-5)}`;
  }

  /**
   * After Salesforce create succeeds: create local OAuth user row.
   * Welcome / password email is handled by Salesforce.
   */
  private async provisionLocalStaffLearners(params: {
    companyCode: string;
    companyName?: string;
    corporateAccountId: string;
    learners: Array<{
      first_name: string;
      last_name: string;
      name_as_per_id?: string;
      email: string;
      salutation?: string;
      id_type?: string;
      id_number?: string;
      company?: string;
      department?: string;
      role?: string;
      countryOfResidence?: string;
      noOfYearOfRelevantWorkExperience?: string | number;
      learnerAsAnAccounting?: string;
      membershipNumber?: string;
      eligibility?: string;
    }>;
  }): Promise<{
    created: number;
    updated: number;
    skipped: number;
    failures: Array<{ email: string; step: 'local_user'; message: string }>;
  }> {
    const companyCode = String(params.companyCode || '').trim();
    const companyName = String(params.companyName || '').trim();
    const corporateAccountId = String(params.corporateAccountId || '').trim();

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const failures: Array<{
      email: string;
      step: 'local_user';
      message: string;
    }> = [];

    for (const row of params.learners) {
      const email = String(row.email || '').trim().toLowerCase();
      const firstName = String(row.first_name || '').trim() || 'Learner';
      const lastName = String(row.last_name || '').trim() || 'Staff';
      if (!email) {
        skipped += 1;
        continue;
      }

      const idType = String(row.id_type || '').trim();
      const idNumber = String(row.id_number || '').trim();
      const years =
        row.noOfYearOfRelevantWorkExperience !== undefined
        && row.noOfYearOfRelevantWorkExperience !== null
        && !Number.isNaN(Number(row.noOfYearOfRelevantWorkExperience))
          ? Number(row.noOfYearOfRelevantWorkExperience)
          : null;

      const learnerAsAnAccounting = String(row.learnerAsAnAccounting || '').trim();
      const isAccountingYes = /^yes$/i.test(learnerAsAnAccounting);
      const jobFunction = isAccountingYes ? 'accounting-finance-related' : '';
      const jobFunctionLabel = isAccountingYes ? 'Accounting and finance related' : '';

      const eligibilitySnapshot: Record<string, unknown> = {
        companyCode,
        companyName: companyName || String(row.company || '').trim() || '',
        jobFunction,
        jobFunctionLabel,
        jobFunctionOther: '',
        countryOfResidence: String(row.countryOfResidence || '').trim() || 'Singapore',
        yearsOfRelevantWorkExperience: years,
        learnerAsAnAccounting,
        membershipNumber: String(row.membershipNumber || '').trim() || '',
        salutation: String(row.salutation || '').trim() || '',
        name_as_per_id: String(row.name_as_per_id || '').trim() || '',
      };
      if (idNumber) {
        eligibilitySnapshot.nricFin = idNumber;
        eligibilitySnapshot.idType = idType || '';
        eligibilitySnapshot.verifiedNricIdType = idType || '';
      }

      try {
        const existing = await this.userRepository.findOne({ where: { email } });

        if (existing) {
          if (existing.role === UserRole.Admin || existing.role === UserRole.Corporate) {
            skipped += 1;
            continue;
          }
          existing.firstname = firstName;
          existing.lastname = lastName;
          existing.companyCode = companyCode;
          existing.password = null;
          existing.authProvider = AuthProvider.OAUTH;
          existing.role = UserRole.User;
          existing.status = UserStatus.Active;
          existing.isDraft = false;
          existing.isVerified = true;
          if (corporateAccountId) existing.salesforceAccountId = corporateAccountId;
          const prevSnap =
            existing.eligibilitySnapshot && typeof existing.eligibilitySnapshot === 'object'
              ? existing.eligibilitySnapshot
              : {};
          existing.eligibilitySnapshot = { ...prevSnap, ...eligibilitySnapshot };
          existing.salesforceUserInfoRaw = {
            ...(existing.salesforceUserInfoRaw && typeof existing.salesforceUserInfoRaw === 'object'
              ? existing.salesforceUserInfoRaw
              : {}),
            corporate: {
              accountName: companyName || undefined,
              companyCode,
            },
          };
          existing.salesforceSyncedAt = new Date();
          await this.userRepository.save(existing);
          updated += 1;
        } else {
          const username = await this.generateStaffUsername(email, firstName, lastName);
          const user = this.userRepository.create({
            username,
            firstname: firstName,
            lastname: lastName,
            email,
            password: null,
            authProvider: AuthProvider.OAUTH,
            companyCode,
            role: UserRole.User,
            status: UserStatus.Active,
            isVerified: true,
            isDraft: false,
            salesforceAccountId: corporateAccountId || null,
            eligibilitySnapshot,
            salesforceUserInfoRaw: {
              corporate: {
                ...(companyName ? { accountName: companyName } : {}),
                companyCode,
              },
            },
            salesforceSyncedAt: new Date(),
          });
          await this.userRepository.save(user);
          created += 1;
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create local OAuth user';
        failures.push({ email, step: 'local_user', message });
        console.error('[CorporateEnrol] local user create failed:', { email, message });
      }
    }

    return { created, updated, skipped, failures };
  }

  async enrolStaff(params: {
    actorUserId?: string;
    companyCode?: string;
    learner: CorporateStaffLearnerDto;
  }) {
    this.assertAuthorisedSubmit(params.learner?.isAuthorisedSubmit);
    return this.enrolStaffBulk({
      actorUserId: params.actorUserId,
      companyCode: params.companyCode,
      learners: [params.learner],
      isAuthorisedSubmit: params.learner?.isAuthorisedSubmit,
      source: 'single',
    });
  }

  private parseAuthorisedSubmitFlag(value: unknown): boolean {
    if (value === true) return true;
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  private assertAuthorisedSubmit(value: unknown): void {
    if (!this.parseAuthorisedSubmitFlag(value)) {
      throw new BadRequestException(
        'You must confirm authorisation before submitting enrolment.',
      );
    }
  }

  async enrolStaffBulk(params: {
    actorUserId?: string;
    companyCode?: string;
    learners: CorporateStaffLearnerDto[];
    isAuthorisedSubmit?: boolean;
    source?: 'single' | 'csv';
    fileName?: string;
  }) {
    const learners = Array.isArray(params.learners) ? params.learners : [];
    if (!learners.length) {
      throw new BadRequestException('At least one learner is required.');
    }

    const bulkAuthorised = this.parseAuthorisedSubmitFlag(params.isAuthorisedSubmit);
    const allLearnersAuthorised = learners.every((row) =>
      this.parseAuthorisedSubmitFlag(row.isAuthorisedSubmit),
    );
    if (!bulkAuthorised && !allLearnersAuthorised) {
      this.assertAuthorisedSubmit(false);
    }
    if (learners.length > BULK_ENROLMENT_CSV_MAX_ROWS) {
      throw new BadRequestException(
        `Bulk enrolment supports a maximum of ${BULK_ENROLMENT_CSV_MAX_ROWS} learners per request.`,
      );
    }

    const companyCode = await this.resolveEnrolCompanyCode({
      actorUserId: params.actorUserId,
      companyCode: params.companyCode,
    });
    const corporateAccountId = await this.resolveCorporateAccountId({
      actorUserId: params.actorUserId,
      companyCode,
    });
    const companyName =
      (await this.oauthAuthService.resolveCorporateCompanyDisplayName(companyCode))
      || (await this.oauthAuthService.resolveCorporateCompanyDisplayName(corporateAccountId));

    const payload = learners.map((row) =>
      this.normalizeStaffLearner(row, corporateAccountId, {
        company: companyName || undefined,
        countryOfResidence: 'Singapore',
      }),
    );

    type StaffEnrolSkippedRow = {
      email: string;
      step: 'precheck' | 'salesforce' | 'local_user';
      reason: string;
    };

    const skipped: StaffEnrolSkippedRow[] = [];
    const eligible: typeof payload = [];
    const seenEmails = new Set<string>();
    const totalReceived = payload.length;

    console.log('[CorporateEnrol] ===== START =====', {
      totalReceived,
      companyCode,
      batchSize: BULK_ENROLMENT_SF_BATCH_SIZE,
    });

    // ── 1) Pre-check per row — duplicates/issues are skipped, not fatal.
    for (const row of payload) {
      const email = String(row.email || '').trim().toLowerCase();
      if (!email) {
        skipped.push({ email: '', step: 'precheck', reason: 'Email is required.' });
        continue;
      }

      if (seenEmails.has(email)) {
        skipped.push({
          email,
          step: 'precheck',
          reason: 'Duplicate email in the same upload batch.',
        });
        continue;
      }
      seenEmails.add(email);

      const idCheck = this.validateStaffIdNumber({
        idType: String(row.id_type || ''),
        idNumber: String(row.id_number || ''),
      });
      if (!idCheck.ok) {
        skipped.push({
          email,
          step: 'precheck',
          reason: idCheck.reason,
        });
        continue;
      }
      row.id_number = idCheck.normalized;

      const localExisting = await this.userRepository.findOne({ where: { email } });
      if (localExisting) {
        skipped.push({
          email,
          step: 'precheck',
          reason: 'Already registered in the app.',
        });
        continue;
      }

      try {
        const byEmail = await this.oauthAuthService.checkSalesforceUserByEmail(email);
        if (Boolean(byEmail?.found)) {
          skipped.push({
            email,
            step: 'precheck',
            reason: 'Already exists in Salesforce.',
          });
          continue;
        }
      } catch (err) {
        console.warn('[CorporateEnrol] usercheckforemail failed:', {
          email,
          message: err instanceof Error ? err.message : err,
        });
        skipped.push({
          email,
          step: 'precheck',
          reason: 'Could not verify email in Salesforce.',
        });
        continue;
      }

      eligible.push(row);
    }

    const precheckPassed = eligible.length;
    const precheckFailed = totalReceived - precheckPassed;
    console.log(
      `[CorporateEnrol] Pre-check done: sent=${totalReceived} | passed=${precheckPassed} | failed/skipped=${precheckFailed}`,
    );
    if (precheckFailed > 0) {
      console.log(
        '[CorporateEnrol] Pre-check skipped rows:',
        skipped
          .filter((row) => row.step === 'precheck')
          .map((row) => `${row.email || '(empty)'}: ${row.reason}`),
      );
    }

    const salesforceBatches: Array<{
      batchNo: number;
      size: number;
      succeeded: number;
      failed: number;
    }> = [];
    const salesforceRawResponses: Record<string, unknown>[] = [];
    const salesforceSucceededRows: typeof payload = [];
    const eligibleByEmail = new Map(eligible.map((row) => [String(row.email).toLowerCase(), row]));
    const totalSfBatches = Math.max(
      1,
      Math.ceil(eligible.length / BULK_ENROLMENT_SF_BATCH_SIZE),
    );

    // ── 2) Salesforce create in batches of 100 — skip failed rows, continue others.
    for (let offset = 0; offset < eligible.length; offset += BULK_ENROLMENT_SF_BATCH_SIZE) {
      const batch = eligible.slice(offset, offset + BULK_ENROLMENT_SF_BATCH_SIZE);
      const batchNo = Math.floor(offset / BULK_ENROLMENT_SF_BATCH_SIZE) + 1;
      console.log(
        `[CorporateEnrol] Salesforce batch ${batchNo}/${totalSfBatches} starting (size=${batch.length})`,
      );

      const batchOutcome = await this.oauthAuthService.createSalesforceBulkNexusUsersWithOutcomes(
        batch,
      );
      salesforceRawResponses.push(batchOutcome.raw);

      const succeededSet = new Set(
        batchOutcome.succeededEmails.map((email) => email.toLowerCase()),
      );
      for (const email of batchOutcome.succeededEmails) {
        const row = eligibleByEmail.get(email.toLowerCase());
        if (row) salesforceSucceededRows.push(row);
      }
      for (const fail of batchOutcome.failed) {
        skipped.push({
          email: fail.email,
          step: 'salesforce',
          reason: fail.message || 'Salesforce create failed.',
        });
      }

      // Rows neither explicitly succeeded nor failed — treat as failed to avoid orphan SF accounts.
      for (const row of batch) {
        const email = String(row.email || '').trim().toLowerCase();
        if (!email) continue;
        if (succeededSet.has(email)) continue;
        if (batchOutcome.failed.some((fail) => fail.email.toLowerCase() === email)) continue;
        skipped.push({
          email,
          step: 'salesforce',
          reason: 'Salesforce create did not confirm success for this learner.',
        });
      }

      const batchSucceeded = batchOutcome.succeededEmails.length;
      const batchFailed = batch.length - batchSucceeded;
      salesforceBatches.push({
        batchNo,
        size: batch.length,
        succeeded: batchSucceeded,
        failed: batchFailed,
      });

      console.log(
        `[CorporateEnrol] Salesforce batch ${batchNo}/${totalSfBatches} done: sent=${batch.length} | passed=${batchSucceeded} | failed=${batchFailed}`,
      );
      if (batchFailed > 0) {
        console.log(
          `[CorporateEnrol] Salesforce batch ${batchNo}/${totalSfBatches} failed emails:`,
          batchOutcome.failed.map((row) => `${row.email}: ${row.message}`),
        );
      }
    }

    if (!eligible.length) {
      console.log('[CorporateEnrol] No eligible rows left for Salesforce create.');
    }

    // ── 3) Local users table entry only for Salesforce successes.
    console.log(
      `[CorporateEnrol] Local users create starting for ${salesforceSucceededRows.length} Salesforce success row(s)`,
    );
    const local = await this.provisionLocalStaffLearners({
      companyCode,
      companyName: companyName || undefined,
      corporateAccountId,
      learners: salesforceSucceededRows,
    });

    for (const fail of local.failures) {
      skipped.push({
        email: fail.email,
        step: 'local_user',
        reason: fail.message || 'Failed to create local app user.',
      });
    }

    const provisioned = local.created + local.updated;
    const skippedCount = skipped.length;
    const success = provisioned > 0;
    const sfPassed = salesforceSucceededRows.length;
    const sfFailed = skipped.filter((row) => row.step === 'salesforce').length;
    const localFailed = skipped.filter((row) => row.step === 'local_user').length;

    console.log('[CorporateEnrol] ===== SUMMARY =====', {
      totalReceived,
      precheckPassed,
      precheckFailed,
      salesforcePassed: sfPassed,
      salesforceFailed: sfFailed,
      localCreated: local.created,
      localUpdated: local.updated,
      localFailed,
      finalPassed: provisioned,
      finalSkipped: skippedCount,
      batches: salesforceBatches.map(
        (b) =>
          `${b.batchNo}/${totalSfBatches}: sent=${b.size} passed=${b.succeeded} failed=${b.failed}`,
      ),
    });
    console.log(
      `[CorporateEnrol] FINAL: sent=${totalReceived} | passed=${provisioned} | failed/skipped=${skippedCount}`,
    );

    let message = success
      ? `${provisioned} staff learner(s) enrolled successfully`
      : 'No staff learners were enrolled.';
    if (skippedCount > 0) {
      message += ` ${skippedCount} row(s) skipped.`;
    }

    const localFailEmails = new Set(
      local.failures.map((row) => String(row.email || '').trim().toLowerCase()).filter(Boolean),
    );
    const passedEmailSet = new Set(
      salesforceSucceededRows
        .map((row) => String(row.email || '').trim().toLowerCase())
        .filter((email) => email && !localFailEmails.has(email)),
    );

    const skipByEmail = new Map<string, StaffEnrolSkippedRow>();
    for (const row of skipped) {
      const email = String(row.email || '').trim().toLowerCase();
      if (!email) continue;
      if (!skipByEmail.has(email)) skipByEmail.set(email, row);
    }

    const trackRows = payload.map((row) => {
      const email = String(row.email || '').trim().toLowerCase();
      const name = `${String(row.first_name || '').trim()} ${String(row.last_name || '').trim()}`.trim();
      if (passedEmailSet.has(email)) {
        return {
          email,
          name,
          status: 'passed' as const,
          step: 'done',
          reason: null,
        };
      }
      const skip = skipByEmail.get(email);
      return {
        email,
        name,
        status: 'skipped' as const,
        step: skip?.step || 'precheck',
        reason: skip?.reason || 'Skipped.',
      };
    });

    const summary = {
      totalReceived,
      precheckPassed,
      precheckFailed,
      salesforcePassed: sfPassed,
      salesforceFailed: sfFailed,
      localCreated: local.created,
      localUpdated: local.updated,
      localFailed,
      finalPassed: provisioned,
      finalSkipped: skippedCount,
    };

    let batchId: string | null = null;
    try {
      const saved = await this.staffEnrolBatchRepository.save(
        this.staffEnrolBatchRepository.create({
          companyCode,
          createdByUserId: String(params.actorUserId || '').trim() || null,
          source: params.source === 'csv' ? 'csv' : 'single',
          fileName: String(params.fileName || '').trim() || null,
          totalReceived,
          passedCount: provisioned,
          skippedCount,
          message,
          rows: trackRows,
          summary,
          batches: salesforceBatches,
        }),
      );
      batchId = saved.id;
    } catch (err) {
      console.error('[CorporateEnrol] failed to save enrol batch track:', err);
    }

    return {
      success,
      message,
      count: provisioned,
      batchId,
      companyCode,
      companyName: companyName || null,
      summary,
      batches: salesforceBatches,
      skipped,
      rows: trackRows,
      salesforce: salesforceRawResponses,
      local,
    };
  }

  private parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  }

  private normalizeCsvHeader(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/^\ufeff/, '')
      .replace(/[\s-]+/g, '_');
  }

  parseStaffEnrolmentCsv(buffer: Buffer): CorporateStaffLearnerDto[] {
    const text = buffer.toString('utf8').replace(/^\ufeff/, '');
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('CSV must include a header row and at least one learner row.');
    }

    const headers = this.parseCsvLine(lines[0]).map((h) => this.normalizeCsvHeader(h));
    const headerIndex = (aliases: string[]) => {
      for (const alias of aliases) {
        const idx = headers.indexOf(alias);
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const idx = {
      salutation: headerIndex(['salutation']),
      first_name: headerIndex(['first_name', 'firstname', 'first']),
      last_name: headerIndex(['last_name', 'lastname', 'last']),
      name_as_per_id: headerIndex(['name_as_per_id', 'fullname_as_per_id', 'full_name', 'fullname']),
      email: headerIndex(['email', 'work_email']),
      id_type: headerIndex(['id_type', 'idtype']),
      id_number: headerIndex(['id_number', 'idnumber', 'nric', 'nric_number']),
      company: headerIndex(['company']),
      department: headerIndex(['department', 'dept']),
      role: headerIndex(['role', 'job_title']),
      countryOfResidence: headerIndex([
        'countryofresidence',
        'country_of_residence',
        'country',
      ]),
      noOfYearOfRelevantWorkExperience: headerIndex([
        'noofyearofrelevantworkexperience',
        'no_of_year_of_relevant_work_experience',
        'years_of_experience',
        'experience_years',
      ]),
      learnerAsAnAccounting: headerIndex([
        'learnerasanaccounting',
        'learner_as_an_accounting',
      ]),
      membershipNumber: headerIndex([
        'membershipnumber',
        'membership_number',
        'isca_membership',
      ]),
      eligibility: headerIndex(['eligibility']),
    };

    if (idx.first_name < 0 || idx.last_name < 0 || idx.email < 0) {
      throw new BadRequestException(
        'CSV header must include first_name, last_name and email columns.',
      );
    }

    const learners: CorporateStaffLearnerDto[] = [];
    for (let rowNo = 1; rowNo < lines.length; rowNo += 1) {
      const cells = this.parseCsvLine(lines[rowNo]);
      const read = (columnIndex: number) =>
        columnIndex >= 0 ? String(cells[columnIndex] || '').trim() : '';

      const firstName = read(idx.first_name);
      const lastName = read(idx.last_name);
      const email = read(idx.email);
      if (!firstName && !lastName && !email) continue;

      const yearsRaw = read(idx.noOfYearOfRelevantWorkExperience);
      const years = yearsRaw ? Number(yearsRaw) : undefined;

      learners.push({
        salutation: read(idx.salutation) || undefined,
        first_name: firstName,
        last_name: lastName,
        name_as_per_id: read(idx.name_as_per_id) || undefined,
        email,
        id_type: read(idx.id_type) || undefined,
        id_number: read(idx.id_number) || undefined,
        company: read(idx.company) || undefined,
        department: read(idx.department) || undefined,
        role: read(idx.role) || undefined,
        countryOfResidence: read(idx.countryOfResidence) || undefined,
        noOfYearOfRelevantWorkExperience:
          years !== undefined && !Number.isNaN(years) ? years : undefined,
        learnerAsAnAccounting: read(idx.learnerAsAnAccounting) || undefined,
        membershipNumber: read(idx.membershipNumber) || undefined,
        eligibility: read(idx.eligibility) || undefined,
      });
    }

    if (!learners.length) {
      throw new BadRequestException('No valid learner rows found in the CSV file.');
    }
    if (learners.length > BULK_ENROLMENT_CSV_MAX_ROWS) {
      throw new BadRequestException(
        `CSV supports a maximum of ${BULK_ENROLMENT_CSV_MAX_ROWS} learner rows.`,
      );
    }
    return learners;
  }

  async enrolStaffBulkFromCsv(params: {
    actorUserId?: string;
    companyCode?: string;
    file?: Express.Multer.File;
  }) {
    const file = params.file;
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file is required.');
    }
    if (file.size > BULK_ENROLMENT_CSV_MAX_BYTES) {
      throw new BadRequestException('CSV file must be 5MB or smaller.');
    }
    const original = String(file.originalname || '').toLowerCase();
    if (!original.endsWith('.csv')) {
      throw new BadRequestException('Only .csv files are allowed for bulk staff enrolment.');
    }

    const learners = this.parseStaffEnrolmentCsv(file.buffer);
    return this.enrolStaffBulk({
      actorUserId: params.actorUserId,
      companyCode: params.companyCode,
      learners,
      isAuthorisedSubmit: true,
      source: 'csv',
      fileName: String(file.originalname || '').trim() || undefined,
    });
  }

  async listStaffEnrolBatches(params: {
    actorUserId?: string;
    companyCode?: string;
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const companyCode = await this.resolveEnrolCompanyCode({
      actorUserId: params.actorUserId,
      companyCode: params.companyCode,
    });
    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const limit = Number(params.limit) > 0 ? Math.min(Number(params.limit), 100) : 10;
    const q = String(params.q || '').trim().toLowerCase();

    const qb = this.staffEnrolBatchRepository
      .createQueryBuilder('b')
      .where('b.companyCode = :companyCode', { companyCode })
      .orderBy('b.createdAt', 'DESC');

    if (q) {
      qb.andWhere(
        `(LOWER(COALESCE(b.fileName, '')) LIKE :q
          OR LOWER(COALESCE(b.message, '')) LIKE :q
          OR LOWER(COALESCE(b.source, '')) LIKE :q
          OR CAST(b.id AS text) LIKE :q)`,
        { q: `%${q}%` },
      );
    }

    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      companyCode,
      data: rows.map((row) => ({
        id: row.id,
        companyCode: row.companyCode,
        source: row.source,
        fileName: row.fileName,
        totalReceived: row.totalReceived,
        passedCount: row.passedCount,
        skippedCount: row.skippedCount,
        message: row.message,
        createdAt: row.createdAt,
        summary: row.summary,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit) || 1),
      },
    };
  }

  async getStaffEnrolBatch(params: {
    actorUserId?: string;
    companyCode?: string;
    batchId: string;
    page?: number;
    limit?: number;
    q?: string;
    status?: string;
  }) {
    const companyCode = await this.resolveEnrolCompanyCode({
      actorUserId: params.actorUserId,
      companyCode: params.companyCode,
    });
    const batchId = String(params.batchId || '').trim();
    if (!batchId) throw new BadRequestException('Batch id is required.');

    const row = await this.staffEnrolBatchRepository.findOne({
      where: { id: batchId, companyCode },
    });
    if (!row) throw new NotFoundException('Enrolment batch not found.');

    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const limit = Number(params.limit) > 0 ? Math.min(Number(params.limit), 100) : 10;
    const q = String(params.q || '').trim().toLowerCase();
    const status = String(params.status || '').trim().toLowerCase();

    let trackRows = Array.isArray(row.rows) ? [...row.rows] : [];

    if (status === 'passed' || status === 'skipped') {
      trackRows = trackRows.filter(
        (item) => String(item?.status || '').trim().toLowerCase() === status,
      );
    }

    if (q) {
      trackRows = trackRows.filter((item) => {
        const haystack = [
          item?.email,
          item?.name,
          item?.status,
          item?.step,
          item?.reason,
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');
        return haystack.includes(q);
      });
    }

    const total = trackRows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const pagedRows = trackRows.slice(start, start + limit);

    return {
      id: row.id,
      companyCode: row.companyCode,
      source: row.source,
      fileName: row.fileName,
      totalReceived: row.totalReceived,
      passedCount: row.passedCount,
      skippedCount: row.skippedCount,
      message: row.message,
      createdAt: row.createdAt,
      summary: row.summary,
      batches: row.batches || [],
      rows: pagedRows,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    };
  }

  async submitForeignQuotationRequest(params: {
    actorUserId?: string;
    companyCode?: string;
    body: CorporateForeignQuotationDto;
  }) {
    const companyCode = await this.resolveEnrolCompanyCode({
      actorUserId: params.actorUserId,
      companyCode: params.companyCode,
    });

    let submittedByName = '';
    let submittedByEmail = '';
    const actorUserId = String(params.actorUserId || '').trim();
    if (actorUserId) {
      const actor = await this.userRepository.findOne({ where: { id: actorUserId } });
      submittedByName = [actor?.firstname, actor?.lastname].filter(Boolean).join(' ').trim();
      submittedByEmail = String(actor?.email || '').trim();
    }

    const mail = await this.emailService.sendCorporateForeignQuotationRequestEmail({
      companyName: params.body.companyName,
      contactPerson: params.body.contactPerson,
      contactEmail: params.body.contactEmail,
      estimatedParticipants: params.body.estimatedParticipants,
      companyCode,
      submittedByName: submittedByName || undefined,
      submittedByEmail: submittedByEmail || undefined,
    });

    return {
      success: true,
      message: 'Your quotation request has been sent to ISCA. We will contact you shortly.',
      sentTo: mail.toEmail,
    };
  }

  private buildNudgeState(lastNudgedAt: Date | null | undefined): {
    lastNudgedAt: string | null;
    canNudge: boolean;
    nextNudgeAt: string | null;
  } {
    if (!lastNudgedAt) {
      return { lastNudgedAt: null, canNudge: true, nextNudgeAt: null };
    }
    const nextAt = new Date(lastNudgedAt.getTime() + NUDGE_COOLDOWN_MS);
    const canNudge = Date.now() >= nextAt.getTime();
    return {
      lastNudgedAt: lastNudgedAt.toISOString(),
      canNudge,
      nextNudgeAt: canNudge ? null : nextAt.toISOString(),
    };
  }

  /** Prefer explicit code / env; never guess another company's UEN from the DB. */
  async resolveCompanyCode(requested?: string | null): Promise<string> {
    const trimmed = String(requested || '').trim();
    if (trimmed) return trimmed;

    return String(process.env.CORPORATE_PUBLIC_COMPANY_CODE || '').trim();
  }

  async getOverview(companyCodeRaw?: string) {
    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    const learners = await this.buildLearners(companyCode);
    const completed = learners.filter((l) => l.status === 'Completed').length;
    const atRisk = learners.filter((l) => l.status === 'At Risk').length;
    const certificatesReady = learners.filter((l) => l.cert).length;
    const total = learners.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    let enrollmentInvite = null;
    try {
      const accountName = await this.oauthAuthService.resolveCorporateCompanyDisplayName(companyCode);
      enrollmentInvite = await this.companyEnrollmentService.ensureInviteForCompanyCode({
        companyCode,
        label: accountName || companyCode,
      });
    } catch (err) {
      console.error('[CorporateOverview] Failed to ensure company QR invite:', err);
    }

    return {
      companyCode,
      enrollmentInvite,
      metrics: {
        totalLearners: total,
        completed,
        atRisk,
        certificatesReady,
        completionRate,
      },
      actions: this.buildActions(learners),
      learnersPreview: learners.slice(0, 5),
    };
  }

  async getLearners(params: {
    companyCode?: string;
    q?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const companyCode = await this.resolveCompanyCode(params.companyCode);
    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const limit = Number(params.limit) > 0 ? Math.min(Number(params.limit), 100) : 5;

    const users = await this.listCompanyUsers(companyCode, params.q);
    if (!users.length) {
      return {
        companyCode,
        data: [],
        pagination: { page: 1, limit, totalItems: 0, totalPages: 1 },
      };
    }

    const userIds = users.map((u) => u.id);
    const [certs, lastAccessMap] = await Promise.all([
      this.certificateRepository.find({
        where: {
          userId: In(userIds),
          status: CourseCertificateStatus.Active,
        },
        select: ['id', 'userId', 'programId', 'certificateNo', 'completedAt'],
      }),
      this.getLastAccessByUserIds(userIds),
    ]);

    const programId = await this.resolveDefaultProgramId();
    const certByUser = new Map<string, CourseCertificateEntity>();
    for (const cert of certs) {
      if (programId && cert.programId && cert.programId !== programId) continue;
      if (!certByUser.has(cert.userId)) certByUser.set(cert.userId, cert);
    }

    const statusFilter = String(params.status || '').trim();
    const filteredUsers = users.filter((user) => {
      if (!statusFilter || statusFilter === 'All statuses') return true;
      const status = this.resolveLightStatus(
        Boolean(certByUser.get(user.id)),
        lastAccessMap.get(user.id) || null,
      );
      return status === statusFilter;
    });

    const totalItems = filteredUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const pageUsers = filteredUsers.slice(start, start + limit);

    const data = await this.buildLearnersForUsers(pageUsers, {
      programId,
      certByUser,
      lastAccessMap,
    });

    return {
      companyCode,
      data,
      pagination: { page: safePage, limit, totalItems, totalPages },
    };
  }

  async getLearner(userId: string, companyCodeRaw?: string) {
    const id = String(userId || '').trim();
    if (!id) throw new NotFoundException('Learner not found');

    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    if (!companyCode) throw new NotFoundException('Learner not found for this company');

    const user = await this.userRepository
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .andWhere('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code: companyCode })
      .andWhere('u.role = :role', { role: UserRole.User })
      .andWhere('u.isDraft = false')
      .andWhere('u.status = :status', { status: UserStatus.Active })
      .getOne();

    if (!user) throw new NotFoundException('Learner not found for this company');

    const rows = await this.buildLearnersForUsers([user]);
    const learner = rows[0];
    if (!learner) throw new NotFoundException('Learner not found for this company');

    return { companyCode, data: learner };
  }

  async nudgeLearner(userId: string, companyCodeRaw?: string, sentByUserId?: string) {
    const id = String(userId || '').trim();
    if (!id) throw new NotFoundException('Learner not found');

    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    if (!companyCode) throw new ForbiddenException('Company code is required');

    const user = await this.userRepository
      .createQueryBuilder('u')
      .where('u.id = :id', { id })
      .andWhere('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code: companyCode })
      .andWhere('u.role = :role', { role: UserRole.User })
      .andWhere('u.isDraft = false')
      .andWhere('u.status = :status', { status: UserStatus.Active })
      .getOne();

    if (!user) throw new NotFoundException('Learner not found for this company');
    const toEmail = String(user.email || '').trim();
    if (!toEmail) {
      throw new BadRequestException('Learner does not have an email address');
    }

    const existing = await this.nudgeRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId: id })
      .andWhere('LOWER(TRIM(n.companyCode)) = LOWER(:code)', { code: companyCode })
      .getOne();

    const nudgeState = this.buildNudgeState(existing?.lastNudgedAt);
    if (!nudgeState.canNudge) {
      throw new BadRequestException(
        `Nudge already sent. You can resend after ${nudgeState.nextNudgeAt}`,
      );
    }

    const rows = await this.buildLearnersForUsers([user]);
    const learner = rows[0];
    const firstName =
      String(user.firstname || '').trim() ||
      String(user.username || '').trim() ||
      'Learner';
    const learnerName =
      `${user.firstname || ''} ${user.lastname || ''}`.trim() || firstName;
    const progressLabel = await this.buildNudgeProgressLabel(learner);

    const sendResult = await this.sendAndLogNudgeEmail({
      companyCode,
      userId: id,
      toEmail,
      firstName,
      learnerName,
      progressLabel,
      sentByUserId: sentByUserId || null,
      source: 'single',
      campaignId: null,
      updateCooldown: true,
    });

    if (sendResult.status !== 'sent') {
      throw new BadRequestException(sendResult.errorMessage || 'Failed to send nudge email');
    }

    const nextState = this.buildNudgeState(sendResult.sentAt);
    return {
      companyCode,
      message: 'Nudge email sent successfully',
      data: {
        userId: id,
        email: toEmail,
        logId: sendResult.logId,
        ...nextState,
      },
    };
  }

  /** Preview incomplete learners for a nudge campaign (same filter as send). */
  async previewNudgeCampaign(companyCodeRaw?: string) {
    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    if (!companyCode) throw new ForbiddenException('Company code is required');

    const { incomplete, eligible, skippedCooldown, missingEmail } =
      await this.collectNudgeCampaignTargets(companyCode);

    return {
      companyCode,
      data: {
        incompleteCount: incomplete.length,
        eligibleCount: eligible.length,
        skippedCooldownCount: skippedCooldown.length,
        missingEmailCount: missingEmail.length,
        eligible: eligible.slice(0, 50).map((row) => ({
          userId: row.userId,
          name: row.name,
          email: row.email,
          status: row.status,
          pending: row.pending,
        })),
      },
    };
  }

  /** In-process lock so the same campaign is not processed twice. */
  private readonly runningNudgeCampaignIds = new Set<string>();

  /**
   * Start a nudge campaign and return immediately.
   * Batch email sending continues in the background so the user can close the dialog.
   */
  async createNudgeCampaign(companyCodeRaw?: string, sentByUserId?: string) {
    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    if (!companyCode) throw new ForbiddenException('Company code is required');

    const { incomplete, eligible, skippedCooldown, missingEmail } =
      await this.collectNudgeCampaignTargets(companyCode);

    if (!eligible.length && !missingEmail.length && !skippedCooldown.length) {
      throw new BadRequestException(
        'No incomplete learners found for this company code. Nothing to send.',
      );
    }

    const batches = this.chunkArray(eligible, NUDGE_CAMPAIGN_BATCH_SIZE);
    const campaign = await this.nudgeCampaignRepository.save(
      this.nudgeCampaignRepository.create({
        companyCode,
        createdByUserId: sentByUserId || null,
        status: 'running',
        targetCount: incomplete.length,
        sentCount: 0,
        failedCount: 0,
        skippedCount: skippedCooldown.length + missingEmail.length,
      }),
    );

    // Fire-and-forget — HTTP response returns while batches keep running.
    void this.processNudgeCampaignInBackground({
      campaignId: campaign.id,
      companyCode,
      sentByUserId: sentByUserId || null,
      eligible,
      skippedCooldown,
      missingEmail,
    }).catch((error) => {
      console.error(
        `[corporate-nudge-campaign] Background job failed for ${campaign.id}:`,
        error instanceof Error ? error.message : error,
      );
    });

    return {
      companyCode,
      message: `Nudge campaign started in the background. Sending to ${eligible.length} learner(s) in ${batches.length} batch(es). You can close this dialog — progress is saved in View.`,
      data: {
        campaignId: campaign.id,
        status: 'running',
        background: true,
        targetCount: incomplete.length,
        eligibleCount: eligible.length,
        skippedCount: skippedCooldown.length + missingEmail.length,
        sentCount: 0,
        failedCount: 0,
        batchSize: NUDGE_CAMPAIGN_BATCH_SIZE,
        batchCount: batches.length,
        createdAt: campaign.createdAt.toISOString(),
      },
    };
  }

  private async processNudgeCampaignInBackground(input: {
    campaignId: string;
    companyCode: string;
    sentByUserId: string | null;
    eligible: CorporateLearnerRow[];
    skippedCooldown: Array<CorporateLearnerRow & { nextNudgeAt?: string | null }>;
    missingEmail: CorporateLearnerRow[];
  }) {
    const { campaignId, companyCode, sentByUserId, eligible, skippedCooldown, missingEmail } =
      input;

    if (this.runningNudgeCampaignIds.has(campaignId)) {
      console.warn(`[corporate-nudge-campaign] Already running: ${campaignId}`);
      return;
    }
    this.runningNudgeCampaignIds.add(campaignId);

    let sentCount = 0;
    let failedCount = 0;

    try {
      const campaign = await this.nudgeCampaignRepository.findOne({ where: { id: campaignId } });
      if (!campaign) return;

      for (const row of skippedCooldown) {
        await this.writeNudgeEmailLog({
          companyCode,
          campaignId,
          userId: row.userId,
          toEmail: row.email,
          learnerName: row.name,
          subject: 'Reminder: Complete AI fluency program',
          progressLabel: null,
          status: 'skipped',
          errorMessage: `Cooldown active until ${row.nextNudgeAt || 'later'}`,
          sentByUserId,
          source: 'campaign',
          sentAt: new Date(),
        });
      }

      for (const row of missingEmail) {
        await this.writeNudgeEmailLog({
          companyCode,
          campaignId,
          userId: row.userId,
          toEmail: '',
          learnerName: row.name,
          subject: 'Reminder: Complete AI fluency program',
          progressLabel: null,
          status: 'skipped',
          errorMessage: 'Learner does not have an email address',
          sentByUserId,
          source: 'campaign',
          sentAt: new Date(),
        });
      }

      const batches = this.chunkArray(eligible, NUDGE_CAMPAIGN_BATCH_SIZE);
      console.log(
        `[corporate-nudge-campaign] ${campaignId}: ${eligible.length} emails in ${batches.length} batch(es) of up to ${NUDGE_CAMPAIGN_BATCH_SIZE}`,
      );

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        const batch = batches[batchIndex];
        console.log(
          `[corporate-nudge-campaign] ${campaignId}: batch ${batchIndex + 1}/${batches.length} — ${batch.length} recipient(s)`,
        );

        for (const row of batch) {
          const user = await this.userRepository.findOne({ where: { id: row.userId } });
          if (!user) {
            failedCount += 1;
            continue;
          }
          const firstName =
            String(user.firstname || '').trim() ||
            String(user.username || '').trim() ||
            'Learner';
          const progressLabel = await this.buildNudgeProgressLabel(row);
          const result = await this.sendAndLogNudgeEmail({
            companyCode,
            userId: row.userId,
            toEmail: row.email,
            firstName,
            learnerName: row.name,
            progressLabel,
            sentByUserId,
            source: 'campaign',
            campaignId,
            updateCooldown: true,
          });
          if (result.status === 'sent') sentCount += 1;
          else failedCount += 1;
        }

        campaign.sentCount = sentCount;
        campaign.failedCount = failedCount;
        campaign.status = 'running';
        await this.nudgeCampaignRepository.save(campaign);

        if (batchIndex < batches.length - 1 && NUDGE_CAMPAIGN_BATCH_PAUSE_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, NUDGE_CAMPAIGN_BATCH_PAUSE_MS));
        }
      }

      campaign.sentCount = sentCount;
      campaign.failedCount = failedCount;
      campaign.skippedCount = skippedCooldown.length + missingEmail.length;
      campaign.status = 'completed';
      await this.nudgeCampaignRepository.save(campaign);
      console.log(
        `[corporate-nudge-campaign] ${campaignId}: completed sent=${sentCount} failed=${failedCount}`,
      );
    } catch (error) {
      console.error(
        `[corporate-nudge-campaign] ${campaignId}: failed`,
        error instanceof Error ? error.message : error,
      );
      try {
        const campaign = await this.nudgeCampaignRepository.findOne({ where: { id: campaignId } });
        if (campaign) {
          campaign.sentCount = sentCount;
          campaign.failedCount = failedCount;
          campaign.status = 'failed';
          await this.nudgeCampaignRepository.save(campaign);
        }
      } catch {
        // best-effort status update
      }
    } finally {
      this.runningNudgeCampaignIds.delete(campaignId);
    }
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunkSize = Math.max(1, size);
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async listNudgeCampaigns(params: {
    companyCode?: string;
    page?: number;
    limit?: number;
  }) {
    const companyCode = await this.resolveCompanyCode(params.companyCode);
    if (!companyCode) throw new ForbiddenException('Company code is required');

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));

    const [rows, total] = await this.nudgeCampaignRepository
      .createQueryBuilder('c')
      .where('LOWER(TRIM(c.companyCode)) = LOWER(:code)', { code: companyCode })
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      companyCode,
      data: rows.map((c) => ({
        id: c.id,
        status: c.status,
        targetCount: c.targetCount,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        skippedCount: c.skippedCount,
        createdByUserId: c.createdByUserId,
        createdAt: c.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listNudgeEmailLogs(params: {
    companyCode?: string;
    campaignId?: string;
    q?: string;
    status?: string;
    source?: string;
    page?: number;
    limit?: number;
  }) {
    const companyCode = await this.resolveCompanyCode(params.companyCode);
    if (!companyCode) throw new ForbiddenException('Company code is required');

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
    const campaignId = String(params.campaignId || '').trim();
    const q = String(params.q || '').trim().toLowerCase();
    const status = String(params.status || '').trim().toLowerCase();
    const source = String(params.source || '').trim().toLowerCase();

    const qb = this.nudgeEmailLogRepository
      .createQueryBuilder('l')
      .where('LOWER(TRIM(l.companyCode)) = LOWER(:code)', { code: companyCode })
      .orderBy('l.sentAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (campaignId) {
      qb.andWhere('l.campaignId = :campaignId', { campaignId });
    }
    if (status && status !== 'all') {
      qb.andWhere('LOWER(l.status) = :status', { status });
    }
    if (source && source !== 'all') {
      qb.andWhere('LOWER(l.source) = :source', { source });
    }
    if (q) {
      qb.andWhere(
        `(
          LOWER(COALESCE(l.learnerName, '')) LIKE :q
          OR LOWER(COALESCE(l.toEmail, '')) LIKE :q
          OR LOWER(COALESCE(l.subject, '')) LIKE :q
          OR LOWER(COALESCE(l.progressLabel, '')) LIKE :q
          OR LOWER(COALESCE(l.errorMessage, '')) LIKE :q
        )`,
        { q: `%${q}%` },
      );
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      companyCode,
      data: rows.map((l) => ({
        id: l.id,
        campaignId: l.campaignId,
        userId: l.userId,
        toEmail: l.toEmail,
        learnerName: l.learnerName,
        subject: l.subject,
        progressLabel: l.progressLabel,
        status: l.status,
        errorMessage: l.errorMessage,
        sentByUserId: l.sentByUserId,
        source: l.source,
        sentAt: l.sentAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private async collectNudgeCampaignTargets(companyCode: string) {
    const learners = await this.buildLearners(companyCode);
    const incomplete = learners.filter((l) => l.status !== 'Completed' && !l.cert);

    const eligible: CorporateLearnerRow[] = [];
    /** Campaign intentionally emails everyone incomplete — cooldown only applies to single nudge. */
    const skippedCooldown: Array<CorporateLearnerRow & { nextNudgeAt?: string | null }> = [];
    const missingEmail: CorporateLearnerRow[] = [];

    for (const row of incomplete) {
      const email = String(row.email || '').trim();
      if (!email) {
        missingEmail.push(row);
        continue;
      }
      eligible.push(row);
    }

    return { incomplete, eligible, skippedCooldown, missingEmail };
  }

  private async sendAndLogNudgeEmail(input: {
    companyCode: string;
    userId: string;
    toEmail: string;
    firstName: string;
    learnerName: string;
    progressLabel: string;
    sentByUserId: string | null;
    source: string;
    campaignId: string | null;
    updateCooldown: boolean;
  }): Promise<{
    status: 'sent' | 'failed';
    logId: string;
    sentAt: Date;
    errorMessage?: string;
  }> {
    const sentAt = new Date();
    let subject = 'Reminder: Complete AI fluency program';
    try {
      const sent = await this.emailService.sendCorporateLearnerNudgeEmail({
        toEmail: input.toEmail,
        firstName: input.firstName,
        progressLabel: input.progressLabel,
      });
      subject = sent.subject;

      if (input.updateCooldown) {
        await this.touchNudgeCooldown(input.companyCode, input.userId, sentAt);
      }

      const log = await this.writeNudgeEmailLog({
        companyCode: input.companyCode,
        campaignId: input.campaignId,
        userId: input.userId,
        toEmail: input.toEmail,
        learnerName: input.learnerName,
        subject,
        progressLabel: input.progressLabel,
        status: 'sent',
        errorMessage: null,
        sentByUserId: input.sentByUserId,
        source: input.source,
        sentAt,
      });

      return { status: 'sent', logId: log.id, sentAt };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send nudge email';
      const log = await this.writeNudgeEmailLog({
        companyCode: input.companyCode,
        campaignId: input.campaignId,
        userId: input.userId,
        toEmail: input.toEmail,
        learnerName: input.learnerName,
        subject,
        progressLabel: input.progressLabel,
        status: 'failed',
        errorMessage,
        sentByUserId: input.sentByUserId,
        source: input.source,
        sentAt,
      });
      return { status: 'failed', logId: log.id, sentAt, errorMessage };
    }
  }

  private async touchNudgeCooldown(companyCode: string, userId: string, at: Date) {
    const existing = await this.nudgeRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .andWhere('LOWER(TRIM(n.companyCode)) = LOWER(:code)', { code: companyCode })
      .getOne();

    if (existing) {
      existing.lastNudgedAt = at;
      existing.nudgeCount = Number(existing.nudgeCount || 0) + 1;
      existing.companyCode = companyCode;
      await this.nudgeRepository.save(existing);
      return;
    }

    await this.nudgeRepository.save(
      this.nudgeRepository.create({
        companyCode,
        userId,
        lastNudgedAt: at,
        nudgeCount: 1,
      }),
    );
  }

  private async writeNudgeEmailLog(input: {
    companyCode: string;
    campaignId: string | null;
    userId: string;
    toEmail: string;
    learnerName: string | null;
    subject: string;
    progressLabel: string | null;
    status: string;
    errorMessage: string | null;
    sentByUserId: string | null;
    source: string;
    sentAt: Date;
  }) {
    return this.nudgeEmailLogRepository.save(
      this.nudgeEmailLogRepository.create({
        companyCode: input.companyCode,
        campaignId: input.campaignId,
        userId: input.userId,
        toEmail: input.toEmail || '—',
        learnerName: input.learnerName,
        subject: input.subject,
        progressLabel: input.progressLabel,
        status: input.status,
        errorMessage: input.errorMessage,
        sentByUserId: input.sentByUserId,
        source: input.source,
        sentAt: input.sentAt,
      }),
    );
  }

  async exportLearnersCsv(params: {
    companyCode?: string;
    q?: string;
    status?: string;
  }): Promise<{ filename: string; csv: string }> {
    const companyCode = await this.resolveCompanyCode(params.companyCode);
    const learners = this.filterLearners(await this.buildLearners(companyCode), params);

    const formatPillarHours = (pillar?: CorporatePillarProgress) => {
      const earned = Number(pillar?.c) || 0;
      const total = Number(pillar?.t) || 0;
      const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
      return `${fmt(earned)}hr / ${fmt(total)}hr`;
    };

    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Name',
      'Email',
      'Role',
      'Eligibility',
      'Status',
      'Pillar 1 Foundations',
      'Pillar 1 Module',
      'Pillar 1 Section',
      'Pillar 1 Quiz',
      'Pillar 1 Assessment',
      'Pillar 2 Specialisation',
      'Pillar 2 Module',
      'Pillar 2 Section',
      'Pillar 2 Quiz',
      'Pillar 2 Assessment',
      'Pillar 3 Leadership',
      'Pillar 3 Module',
      'Pillar 3 Section',
      'Pillar 3 Quiz',
      'Pillar 3 Assessment',
      'Certificate',
      'Certificate No',
      'Pending item',
      'Last Active',
    ];

    const formatQa = (ok?: boolean) => (ok ? 'Passed' : 'Pending');

    const lines = learners.map((s) =>
      [
        s.name,
        s.email,
        s.role,
        s.eligibility,
        s.status,
        formatPillarHours(s.p1),
        s.p1?.moduleTitle || '',
        s.p1?.lessonTitle || '',
        formatQa(s.p1?.q),
        formatQa(s.p1?.a),
        formatPillarHours(s.p2),
        s.p2?.moduleTitle || '',
        s.p2?.lessonTitle || '',
        formatQa(s.p2?.q),
        formatQa(s.p2?.a),
        formatPillarHours(s.p3),
        s.p3?.moduleTitle || '',
        s.p3?.lessonTitle || '',
        formatQa(s.p3?.q),
        formatQa(s.p3?.a),
        s.cert ? 'Yes' : 'No',
        s.certificateNo || '',
        s.pending,
        s.lastActive,
      ]
        .map(escape)
        .join(','),
    );

    const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`;
    const code = companyCode || 'corporate';
    const filename = `corporate-learner-progress-${code.replace(/[^a-z0-9_-]+/gi, '-')}.csv`;
    return { filename, csv };
  }

  private filterLearners(
    learners: CorporateLearnerRow[],
    params: { q?: string; status?: string },
  ): CorporateLearnerRow[] {
    let result = learners;
    const q = String(params.q || '').trim().toLowerCase();
    if (q) {
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.role.toLowerCase().includes(q) ||
          l.department.toLowerCase().includes(q),
      );
    }
    const statusFilter = String(params.status || '').trim();
    if (statusFilter && statusFilter !== 'All statuses') {
      result = result.filter((l) => l.status === statusFilter);
    }
    return result;
  }

  async getCertificates(params: {
    companyCode?: string;
    page?: number;
    limit?: number;
    availableOnly?: boolean;
  }) {
    const companyCode = await this.resolveCompanyCode(params.companyCode);
    const learners = await this.buildLearners(companyCode);
    let rows = learners.map((l) => ({
      userId: l.userId,
      name: l.name,
      email: l.email,
      status: l.status,
      certificateAvailable: l.cert,
      certificateId: l.certificateId,
      certificateNo: l.certificateNo,
      pending: l.pending,
      nextAction: l.cert ? 'No pending item' : l.pending,
    }));

    const availableTotal = rows.filter((r) => r.certificateAvailable && r.certificateId).length;
    if (params.availableOnly) {
      rows = rows.filter((r) => r.certificateAvailable && r.certificateId);
    }

    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const limit = Number(params.limit) > 0 ? Math.min(Number(params.limit), 100) : 5;
    const totalItems = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const data = rows.slice(start, start + limit);

    return {
      companyCode,
      data,
      availableTotal,
      pagination: { page: safePage, limit, totalItems, totalPages },
    };
  }

  async downloadCertificatePdf(companyCodeRaw: string | undefined, certificateId: string) {
    const companyCode = await this.resolveCompanyCode(companyCodeRaw);
    if (!companyCode) {
      throw new ForbiddenException('Company code required');
    }
    const id = String(certificateId || '').trim();
    if (!id) {
      throw new NotFoundException('Certificate not found');
    }

    const cert = await this.certificateRepository.findOne({
      where: { id, status: CourseCertificateStatus.Active },
      select: ['id', 'userId', 'certificateNo', 'status'],
    });
    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }

    const learner = await this.userRepository.findOne({
      where: { id: cert.userId, role: UserRole.User, isDraft: false },
      select: ['id', 'companyCode'],
    });
    const learnerCode = String(learner?.companyCode || '').trim().toLowerCase();
    if (!learner || learnerCode !== companyCode.toLowerCase()) {
      throw new ForbiddenException('Certificate is outside your company scope');
    }

    return this.courseCertificateService.getCertificatePdfBuffer(cert.id);
  }

  // ----------------------------------------------------------------------

  private async listCompanyUsers(companyCode: string, q?: string): Promise<UserEntity[]> {
    if (!companyCode) return [];

    const qb = this.userRepository
      .createQueryBuilder('u')
      .where('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code: companyCode })
      .andWhere('u.role = :role', { role: UserRole.User })
      .andWhere('u.isDraft = false')
      .andWhere('u.status = :status', { status: UserStatus.Active })
      .orderBy('u.firstname', 'ASC')
      .addOrderBy('u.lastname', 'ASC');

    const search = String(q || '').trim().toLowerCase();
    if (search) {
      qb.andWhere(
        `(
          LOWER(CONCAT(COALESCE(u.firstname, ''), ' ', COALESCE(u.lastname, ''))) LIKE :q
          OR LOWER(COALESCE(u.email, '')) LIKE :q
          OR LOWER(COALESCE(u.username, '')) LIKE :q
          OR LOWER(COALESCE(u.financeRole, '')) LIKE :q
          OR LOWER(COALESCE(u.persona, '')) LIKE :q
        )`,
        { q: `%${search}%` },
      );
    }

    return qb.getMany();
  }

  private resolveLightStatus(
    hasCert: boolean,
    lastActiveAt: Date | null,
  ): CorporateLearnerStatus {
    if (hasCert) return 'Completed';
    const inactiveDays = lastActiveAt
      ? Math.floor((Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isInactive = inactiveDays == null || inactiveDays >= AT_RISK_INACTIVE_DAYS;
    if (isInactive) return 'At Risk';
    return 'In Progress';
  }

  private async buildLearners(companyCode: string): Promise<CorporateLearnerRow[]> {
    const users = await this.listCompanyUsers(companyCode);
    return this.buildLearnersForUsers(users);
  }

  private async buildLearnersForUsers(
    users: UserEntity[],
    preloaded?: {
      programId?: string | null;
      certByUser?: Map<string, CourseCertificateEntity>;
      lastAccessMap?: Map<string, Date>;
    },
  ): Promise<CorporateLearnerRow[]> {
    if (!users.length) return [];

    const programId =
      preloaded?.programId !== undefined
        ? preloaded.programId
        : await this.resolveDefaultProgramId();
    const pillarCourses = programId
      ? await this.getPillarCourses(programId)
      : new Map<number, CourseEntity>();
    const pillarCourseLists = programId
      ? await this.getPillarCourseLists(programId)
      : new Map<number, CourseEntity[]>();

    const userIds = users.map((u) => u.id);

    const [certs, lastAccessMap, lessonContext, summariesByUser] = await Promise.all([
      preloaded?.certByUser
        ? Promise.resolve([...preloaded.certByUser.values()])
        : this.certificateRepository.find({
            where: {
              userId: In(userIds),
              status: CourseCertificateStatus.Active,
            },
            select: ['id', 'userId', 'programId', 'certificateNo', 'completedAt'],
          }),
      preloaded?.lastAccessMap
        ? Promise.resolve(preloaded.lastAccessMap)
        : this.getLastAccessByUserIds(userIds),
      this.getLearnerLessonContext(userIds, pillarCourseLists),
      programId
        ? this.courseSectionWatchProgressService.getProgramPillarWatchSummariesForUsers(
            userIds,
            programId,
          )
        : Promise.resolve(new Map()),
    ]);

    const certByUser =
      preloaded?.certByUser ||
      (() => {
        const map = new Map<string, CourseCertificateEntity>();
        for (const cert of certs as CourseCertificateEntity[]) {
          if (programId && cert.programId && cert.programId !== programId) continue;
          if (!map.has(cert.userId)) map.set(cert.userId, cert);
        }
        return map;
      })();

    const qaCourseIds = new Set<string>();
    for (const course of pillarCourses.values()) qaCourseIds.add(course.id);
    for (const ctx of lessonContext.values()) {
      for (const lesson of ctx.byPillar.values()) {
        if (lesson.courseId) qaCourseIds.add(lesson.courseId);
      }
    }

    const qaByUserCourse = qaCourseIds.size
      ? await this.courseQuizAssessmentProgressService.getLearnerProgressBatch(
          userIds,
          [...qaCourseIds],
        )
      : new Map();

    const companyCode = String(users[0]?.companyCode || '').trim();
    const nudgeByUser = new Map<string, CorporateLearnerNudgeEntity>();
    if (companyCode && userIds.length) {
      const nudges = await this.nudgeRepository
        .createQueryBuilder('n')
        .where('n.userId IN (:...userIds)', { userIds })
        .andWhere('LOWER(TRIM(n.companyCode)) = LOWER(:code)', { code: companyCode })
        .getMany();
      for (const row of nudges) nudgeByUser.set(row.userId, row);
    }

    return Promise.all(
      users.map(async (user) => {
        const row = this.composeLearnerRow(
          user,
          pillarCourses,
          certByUser.get(user.id),
          lastAccessMap.get(user.id) || null,
          lessonContext.get(user.id) || { byPillar: new Map() },
          summariesByUser.get(user.id),
          qaByUserCourse,
        );
        const nudge = this.buildNudgeState(nudgeByUser.get(user.id)?.lastNudgedAt);
        return { ...row, ...nudge };
      }),
    );
  }

  private composeLearnerRow(
    user: UserEntity,
    pillarCourses: Map<number, CourseEntity>,
    cert: CourseCertificateEntity | undefined,
    lastActiveAt: Date | null,
    lessonContext: { byPillar: Map<number, PillarLessonInfo> },
    summary:
      | {
          pillarBreakdown?: Array<{
            pillarIndex: number;
            earnedCpeHours?: number;
            watchedHours?: number;
            totalVideoDurationSeconds?: number;
          }>;
        }
      | undefined,
    qaByUserCourse: Map<
      string,
      {
        allQuizzesCompleted: boolean;
        allAssignmentsCompleted: boolean;
        quizAssessmentCompleted: boolean;
      }
    >,
  ): CorporateLearnerRow {
    const emptyPillar = (): CorporatePillarProgress => ({
      c: 0,
      t: 0,
      w: 0,
      q: false,
      a: false,
      e: false,
      moduleTitle: null,
      lessonTitle: null,
    });
    let p1 = emptyPillar();
    let p2 = emptyPillar();
    let p3 = emptyPillar();

    for (const pillar of summary?.pillarBreakdown || []) {
      const durationSeconds = Number(pillar.totalVideoDurationSeconds ?? 0);
      const earned = Number(pillar.earnedCpeHours ?? 0);
      const watched = Number(pillar.watchedHours ?? 0);
      const totalCpe = computeCpeHoursFromWatchSeconds(durationSeconds);
      const progress: CorporatePillarProgress = {
        c: Math.round(earned * 100) / 100,
        t: Math.round(totalCpe * 100) / 100,
        w: Math.round(watched * 100) / 100,
        q: false,
        a: false,
        e: false,
        moduleTitle: null,
        lessonTitle: null,
      };

      const lesson = lessonContext.byPillar.get(pillar.pillarIndex);
      const fallbackCourse = pillarCourses.get(pillar.pillarIndex);
      const qaCourseId = lesson?.courseId || fallbackCourse?.id || null;
      if (qaCourseId) {
        const qa = qaByUserCourse.get(`${user.id}:${qaCourseId}`);
        progress.q = Boolean(qa?.allQuizzesCompleted);
        progress.a = Boolean(qa?.allAssignmentsCompleted);
        if (pillar.pillarIndex === 2) {
          progress.e = Boolean(qa?.quizAssessmentCompleted);
        }
      }

      if (pillar.pillarIndex === 1) p1 = progress;
      if (pillar.pillarIndex === 2) p2 = progress;
      if (pillar.pillarIndex === 3) p3 = progress;
    }

    const attachLesson = (
      pillar: CorporatePillarProgress,
      lesson?: PillarLessonInfo,
      fallbackCourseId?: string | null,
    ): CorporatePillarProgress => ({
      ...pillar,
      courseId: lesson?.courseId || fallbackCourseId || null,
      moduleTitle: lesson?.moduleTitle || null,
      lessonTitle: lesson?.lessonTitle || null,
    });

    p1 = attachLesson(p1, lessonContext.byPillar.get(1), pillarCourses.get(1)?.id || null);
    p2 = attachLesson(p2, lessonContext.byPillar.get(2), pillarCourses.get(2)?.id || null);
    p3 = attachLesson(p3, lessonContext.byPillar.get(3), pillarCourses.get(3)?.id || null);

    const hasCert = Boolean(cert);
    const inactiveDays = lastActiveAt
      ? Math.floor((Date.now() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isInactive = inactiveDays == null || inactiveDays >= AT_RISK_INACTIVE_DAYS;

    let status: CorporateLearnerStatus = 'In Progress';
    if (hasCert) status = 'Completed';
    else if (isInactive) status = 'At Risk';

    const pending = this.buildPendingMessage({ hasCert, p1, p2, isInactive });
    const lastActiveLabel = this.formatLastActive(lastActiveAt);

    return {
      userId: user.id,
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || 'Learner',
      email: user.email || '',
      department: '—',
      role: user.financeRole || user.persona || '—',
      eligibility: this.formatEligibility(user),
      profession: user.financeRole ? 'Yes' : '—',
      status,
      lastActive: lastActiveLabel,
      lastActiveAt: lastActiveAt ? lastActiveAt.toISOString() : null,
      lastLogin: lastActiveLabel,
      lastLoginAt: lastActiveAt ? lastActiveAt.toISOString() : null,
      cert: hasCert,
      certificateId: cert?.id || null,
      certificateNo: cert?.certificateNo || null,
      pending,
      p1,
      p2,
      p3,
      lastNudgedAt: null,
      canNudge: true,
      nextNudgeAt: null,
    };
  }

  /**
   * Resolve each learner's current module + section per pillar
   * (latest lastAccessedAt within that pillar's courses).
   */
  private async getLearnerLessonContext(
    userIds: string[],
    pillarCourseLists: Map<number, CourseEntity[]>,
  ): Promise<Map<string, { byPillar: Map<number, PillarLessonInfo> }>> {
    const result = new Map<string, { byPillar: Map<number, PillarLessonInfo> }>();
    for (const userId of userIds) {
      result.set(userId, { byPillar: new Map() });
    }
    if (!userIds.length) return result;

    const courseById = new Map<string, { pillarIndex: number; title: string }>();
    for (const [pillarIndex, courses] of pillarCourseLists.entries()) {
      for (const course of courses) {
        courseById.set(course.id, {
          pillarIndex,
          title: String(course.title || '').trim() || 'Untitled course',
        });
      }
    }
    const courseIds = [...courseById.keys()];
    if (!courseIds.length) return result;

    const progressRows = await this.sectionWatchRepository
      .createQueryBuilder('p')
      .select([
        'p.id',
        'p.userId',
        'p.courseId',
        'p.sectionId',
        'p.lastAccessedAt',
        'p.completionPercent',
      ])
      .where('p.userId IN (:...userIds)', { userIds })
      .andWhere('p.courseId IN (:...courseIds)', { courseIds })
      .getMany();

    if (!progressRows.length) return result;

    // Pick best progress row per user+pillar (latest access, else highest completion).
    type BestRow = {
      userId: string;
      pillarIndex: number;
      courseId: string;
      sectionId: string;
      lastAccessedAt: number;
      completionPercent: number;
      courseTitle: string;
    };
    const bestByUserPillar = new Map<string, BestRow>();

    for (const row of progressRows) {
      const courseMeta = courseById.get(row.courseId);
      if (!courseMeta) continue;
      const accessedAt = row.lastAccessedAt ? new Date(row.lastAccessedAt).getTime() : 0;
      const completion = Number(row.completionPercent ?? 0) || 0;
      if (!accessedAt && completion <= 0) continue;

      const key = `${row.userId}:${courseMeta.pillarIndex}`;
      const candidate: BestRow = {
        userId: row.userId,
        pillarIndex: courseMeta.pillarIndex,
        courseId: row.courseId,
        sectionId: row.sectionId,
        lastAccessedAt: accessedAt,
        completionPercent: completion,
        courseTitle: courseMeta.title,
      };
      const existing = bestByUserPillar.get(key);
      if (!existing) {
        bestByUserPillar.set(key, candidate);
        continue;
      }
      if (candidate.lastAccessedAt !== existing.lastAccessedAt) {
        if (candidate.lastAccessedAt > existing.lastAccessedAt) bestByUserPillar.set(key, candidate);
        continue;
      }
      if (candidate.completionPercent > existing.completionPercent) {
        bestByUserPillar.set(key, candidate);
      }
    }

    const sectionIds = [...new Set([...bestByUserPillar.values()].map((r) => r.sectionId))];
    if (!sectionIds.length) return result;

    const sections = await this.courseModuleSectionRepository.find({
      where: { id: In(sectionIds) },
      select: ['id', 'moduleId', 'title', 'sortOrder'],
    });
    const sectionById = new Map(sections.map((s) => [s.id, s]));
    const moduleIds = [...new Set(sections.map((s) => s.moduleId))];
    const modules = moduleIds.length
      ? await this.courseModuleRepository.find({
          where: { id: In(moduleIds) },
          select: ['id', 'sortOrder', 'title'],
        })
      : [];
    const moduleById = new Map(modules.map((m) => [m.id, m]));

    for (const best of bestByUserPillar.values()) {
      const entry = result.get(best.userId);
      if (!entry) continue;

      const section = sectionById.get(best.sectionId);
      const module = section ? moduleById.get(section.moduleId) : undefined;
      const moduleTitle = String(module?.title || '').trim() || null;
      const lessonTitle = String(section?.title || '').trim() || best.courseTitle || null;

      entry.byPillar.set(best.pillarIndex, {
        courseId: best.courseId,
        courseTitle: best.courseTitle,
        moduleTitle,
        lessonTitle,
      });
    }

    return result;
  }

  private async resolveDefaultProgramId(): Promise<string | null> {
    const programs = await this.programRepository.find({
      where: { status: ProgramStatus.Active },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });
    for (const program of programs) {
      const count = await this.courseRepository.count({
        where: { programId: program.id, isBundle: false },
      });
      if (count > 0) return program.id;
    }
    const any = await this.courseRepository.findOne({
      where: { programId: Not(IsNull()), isBundle: false },
      select: ['programId'],
    });
    return any?.programId || null;
  }

  private async getPillarCourses(programId: string): Promise<Map<number, CourseEntity>> {
    const lists = await this.getPillarCourseLists(programId);
    const map = new Map<number, CourseEntity>();
    for (const [idx, courses] of lists.entries()) {
      if (courses[0]) map.set(idx, courses[0]);
    }
    return map;
  }

  private async getPillarCourseLists(programId: string): Promise<Map<number, CourseEntity[]>> {
    const courses = await this.courseRepository.find({
      where: { programId, isBundle: false },
      select: ['id', 'title', 'programPillarIndex', 'level', 'marketData', 'createdAt'],
      order: { programPillarIndex: 'ASC', createdAt: 'ASC' },
    });
    const map = new Map<number, CourseEntity[]>();
    for (const course of courses) {
      const idx = resolveCoursePillarIndex(course);
      if (!idx) continue;
      const list = map.get(idx) || [];
      list.push(course);
      map.set(idx, list);
    }
    return map;
  }

  private async getLastAccessByUserIds(userIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>();
    if (!userIds.length) return map;

    const rows = await this.sectionWatchRepository
      .createQueryBuilder('p')
      .select('p.userId', 'userId')
      .addSelect('MAX(p.lastAccessedAt)', 'lastAccessedAt')
      .where('p.userId IN (:...userIds)', { userIds })
      .andWhere('p.lastAccessedAt IS NOT NULL')
      .groupBy('p.userId')
      .getRawMany<{ userId: string; lastAccessedAt: Date | string }>();

    for (const row of rows) {
      const d = row.lastAccessedAt ? new Date(row.lastAccessedAt) : null;
      if (d && !Number.isNaN(d.getTime())) map.set(row.userId, d);
    }
    return map;
  }

  private formatEligibility(user: UserEntity): string {
    if (user.eligibilityIsSingaporePr === true) return 'Singaporean/PR';
    if (user.eligibilityIsIscaMember === true) return 'ISCA Member';
    if (user.eligibilityType) return String(user.eligibilityType);
    return '—';
  }

  private formatLastActive(date: Date | null): string {
    if (!date) return 'Never';
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${days} days ago`;
    return date.toLocaleDateString('en-SG');
  }

  /**
   * Same equal-weight unit % as My Progress / learning player (not CPE hours).
   */
  private async resolveCourseUiCompletionPercent(
    userId: string,
    courseId: string,
  ): Promise<number | null> {
    const id = String(courseId || '').trim();
    const uid = String(userId || '').trim();
    if (!id || !uid) return null;

    try {
      const course = await this.courseRepository.findOne({
        where: { id },
        select: ['id', 'level'],
      });
      if (!course) return null;

      const modules = await this.courseModuleRepository.find({
        where: { courseId: id },
        select: ['id'],
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      });
      const moduleIds = modules.map((m) => m.id);
      const sections = moduleIds.length
        ? await this.courseModuleSectionRepository.find({
            where: { moduleId: In(moduleIds) },
            select: ['id', 'moduleId'],
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
          })
        : [];
      const sectionsByModule = new Map<string, Array<{ id: string }>>();
      for (const section of sections) {
        const list = sectionsByModule.get(section.moduleId) || [];
        list.push({ id: section.id });
        sectionsByModule.set(section.moduleId, list);
      }

      const sectionProgressBySectionId =
        await this.courseSectionWatchProgressService.getAllSectionProgressForCourse(uid, id);
      const quizAssessmentProgress =
        await this.courseQuizAssessmentProgressService.getLearnerProgress(uid, id);

      const quizCountByModuleId: Record<string, number> = {};
      const assignmentCountByModuleId: Record<string, number> = {};
      let courseEndQuizCount = 0;
      let courseEndAssignmentCount = 0;
      for (const scope of quizAssessmentProgress.scopes || []) {
        if (scope.moduleId) {
          if (scope.quizCount > 0) quizCountByModuleId[scope.moduleId] = scope.quizCount;
          if (scope.assignmentCount > 0) {
            assignmentCountByModuleId[scope.moduleId] = scope.assignmentCount;
          }
        } else {
          courseEndQuizCount = scope.quizCount;
          courseEndAssignmentCount = scope.assignmentCount;
        }
      }

      const summary = buildCourseOverallProgress({
        courseLevel: course.level || null,
        modules: modules.map((mod) => ({
          id: mod.id,
          sections: sectionsByModule.get(mod.id) || [],
        })),
        sectionProgressBySectionId,
        quizAssessmentScopes: quizAssessmentProgress.scopes || [],
        quizCountByModuleId,
        assignmentCountByModuleId,
        courseEndQuizCount,
        courseEndAssignmentCount,
      });

      return Math.max(0, Math.min(100, Number(summary.completionPercent) || 0));
    } catch (error) {
      console.error(
        `[corporate-nudge] Failed to resolve UI completion % for user=${uid} course=${id}:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }
  }

  /**
   * Nudge email progress line — client rules:
   * - % matches learning player / My Progress (equal-weight units), not CPE hours.
   * - If modules/hours done and only quiz/assessment left → say that (not Module X).
   * - Pillar 2 milestone = quiz + assessment completed (not module count alone).
   * - Otherwise show % + current module while still watching modules.
   */
  private async buildNudgeProgressLabel(learner?: CorporateLearnerRow | null): Promise<string> {
    if (!learner) return 'in progress';

    const describeOutstandingQa = (p: CorporatePillarProgress): string | null => {
      const lackQuiz = !p.q;
      const lackAssessment = !p.a;
      if (!lackQuiz && !lackAssessment) return null;
      if (lackQuiz && lackAssessment) {
        return 'you only lack the quiz and assessment to be completed';
      }
      if (lackQuiz) return 'you only lack the quiz to be completed';
      return 'you only lack the assessment to be completed';
    };

    const hoursComplete = (p: CorporatePillarProgress) =>
      Number(p?.t) > 0 && Number(p?.c) >= Number(p?.t);

    const cpePct = (p: CorporatePillarProgress) => {
      const earned = Number(p?.c) || 0;
      const total = Number(p?.t) || 0;
      return total > 0 ? Math.min(100, Math.round((earned / total) * 100)) : 0;
    };

    const resolvePct = async (p: CorporatePillarProgress): Promise<number> => {
      if (p.completionPercent != null && Number.isFinite(Number(p.completionPercent))) {
        return Math.max(0, Math.min(100, Math.round(Number(p.completionPercent))));
      }
      if (p.courseId) {
        const uiPct = await this.resolveCourseUiCompletionPercent(learner.userId, p.courseId);
        if (uiPct != null) return uiPct;
      }
      return cpePct(p);
    };

    /** Modules treated as done when hours full, or nearly full while only QA remains. */
    const modulesEffectivelyDone = async (p: CorporatePillarProgress) => {
      if (hoursComplete(p)) return true;
      const outstanding = describeOutstandingQa(p);
      if (!outstanding) return false;
      return (await resolvePct(p)) >= 80;
    };

    // Pillar 1: modules watched but quiz/assessment still open
    if (await modulesEffectivelyDone(learner.p1)) {
      const outstanding = describeOutstandingQa(learner.p1);
      if (outstanding) return outstanding;
    } else if (Number(learner.p1?.t) > 0 || learner.p1?.courseId || learner.p1?.moduleTitle) {
      const pct = await resolvePct(learner.p1);
      const moduleTitle = String(learner.p1?.moduleTitle || '').trim();
      if (moduleTitle) return `${pct}% complete / on Module ${moduleTitle}`;
      return `${pct}% complete`;
    }

    // Pillar 2: milestone = quiz + assessment on a specialisation (p2.e)
    if (learner.p2?.e) {
      return 'Pillar 2 specialisation milestone achieved';
    }

    if (await modulesEffectivelyDone(learner.p2)) {
      const outstanding = describeOutstandingQa(learner.p2);
      if (outstanding) return outstanding;
    } else if (Number(learner.p2?.t) > 0 || String(learner.p2?.moduleTitle || '').trim() || learner.p2?.courseId) {
      const pct = await resolvePct(learner.p2);
      const moduleTitle = String(learner.p2?.moduleTitle || '').trim();
      if (moduleTitle) return `${pct}% complete / on Module ${moduleTitle}`;
      if (Number(learner.p2?.t) > 0 || learner.p2?.courseId) return `${pct}% complete`;
    }

    if (await modulesEffectivelyDone(learner.p3)) {
      const outstanding = describeOutstandingQa(learner.p3);
      if (outstanding) return outstanding;
    } else if (Number(learner.p3?.t) > 0 || learner.p3?.courseId) {
      const pct = await resolvePct(learner.p3);
      const moduleTitle = String(learner.p3?.moduleTitle || '').trim();
      if (moduleTitle) return `${pct}% complete / on Module ${moduleTitle}`;
      return `${pct}% complete`;
    }

    return 'in progress';
  }

  private buildPendingMessage(input: {
    hasCert: boolean;
    p1: CorporatePillarProgress;
    p2: CorporatePillarProgress;
    isInactive: boolean;
  }): string {
    if (input.hasCert) return 'No pending items. Programme completion criteria met.';
    if (input.isInactive) {
      return 'Learner inactive. Nudge learner to continue Pillar 1 modules before starting an eligible specialisation.';
    }
    const p1Done = input.p1.t > 0 && input.p1.c >= input.p1.t && input.p1.q && input.p1.a;
    if (!p1Done) {
      const remaining = Math.max(0, Math.round((input.p1.t - input.p1.c) * 10) / 10);
      return `Complete ${remaining}h in Pillar 1, pass Pillar 1 quiz and assessment, then complete one eligible Pillar 2 specialisation with quiz and assessment.`;
    }
    if (!input.p2.e) {
      return 'Pillar 1 completed. Pending one eligible Pillar 2 specialisation module and its quiz/assessment.';
    }
    return 'Pending programme completion criteria.';
  }

  private buildActions(learners: CorporateLearnerRow[]): string[] {
    const inactive = learners.filter((l) => l.status === 'At Risk').length;
    const certs = learners.filter((l) => l.cert).length;
    const p1QuizDone = learners.filter((l) => Boolean(l.p1?.q)).length;
    const foreign = learners.filter((l) => {
      const e = String(l.eligibility || '').toLowerCase();
      return e.includes('foreign') || e === 'foreigner';
    }).length;

    return [
      `${p1QuizDone} learner${p1QuizDone === 1 ? '' : 's'} completed a Pillar 1 quiz`,
      `${certs} certificate${certs === 1 ? '' : 's'} became available for download`,
      foreign > 0
        ? `${foreign} foreign non-member learner${foreign === 1 ? '' : 's'} pending review`
        : 'No foreign non-member quotation request pending',
      `${inactive} learner${inactive === 1 ? ' has' : 's have'} been inactive for more than ${AT_RISK_INACTIVE_DAYS} days`,
    ];
  }

  // ----------------------------------------------------------------------
  // Bulk enrolment ZIP uploads (corporate upload; admin download only)
  // ----------------------------------------------------------------------

  private assertZipFile(file?: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A .zip file is required');
    }
    if (file.size > BULK_ENROLMENT_ZIP_MAX_BYTES) {
      throw new BadRequestException('ZIP file must be 500MB or smaller');
    }
    const original = String(file.originalname || '');
    const ext = extname(original).toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    const mimeOk =
      mime === 'application/zip' ||
      mime === 'application/x-zip-compressed' ||
      mime === 'application/octet-stream' ||
      !mime;
    if (ext !== '.zip' || !mimeOk) {
      throw new BadRequestException('Only .zip files are allowed');
    }
  }

  private mapBulkUploadRow(row: CorporateBulkEnrolmentUploadEntity) {
    return {
      id: row.id,
      companyCode: row.companyCode,
      originalFileName: row.originalFileName,
      sizeBytes: Number(row.sizeBytes) || 0,
      uploadedByUserId: row.uploadedByUserId,
      createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    };
  }

  async uploadBulkEnrolmentZip(params: {
    companyCode?: string;
    uploadedByUserId?: string;
    file?: Express.Multer.File;
  }) {
    return this.uploadBulkEnrolmentZips({
      companyCode: params.companyCode,
      uploadedByUserId: params.uploadedByUserId,
      files: params.file ? [params.file] : [],
    });
  }

  async uploadBulkEnrolmentZips(params: {
    companyCode?: string;
    uploadedByUserId?: string;
    files?: Express.Multer.File[];
  }) {
    const files = (params.files || []).filter(Boolean);
    if (!files.length) {
      throw new BadRequestException('At least one .zip file is required');
    }
    if (files.length > 10) {
      throw new BadRequestException('You can upload a maximum of 10 ZIP files at once');
    }

    const companyCode = await this.resolveCompanyCode(params.companyCode);
    if (!companyCode) {
      throw new ForbiddenException('Company code is required');
    }

    await mkdir(BULK_ENROLMENT_STORAGE_DIR, { recursive: true });

    const savedRows: CorporateBulkEnrolmentUploadEntity[] = [];
    for (const file of files) {
      this.assertZipFile(file);
      const storedFileName = `${randomUUID()}.zip`;
      await writeFile(join(BULK_ENROLMENT_STORAGE_DIR, storedFileName), file.buffer);

      const row = this.bulkEnrolmentUploadRepository.create({
        companyCode,
        uploadedByUserId: params.uploadedByUserId || null,
        originalFileName: String(file.originalname || 'bulk-enrolment.zip').slice(0, 255),
        storedFileName,
        sizeBytes: file.size || file.buffer.length,
        mimeType: file.mimetype || 'application/zip',
      });
      savedRows.push(await this.bulkEnrolmentUploadRepository.save(row));
    }

    return {
      message:
        savedRows.length === 1
          ? 'Bulk enrolment ZIP uploaded successfully'
          : `${savedRows.length} bulk enrolment ZIP files uploaded successfully`,
      data: savedRows.map((row) => this.mapBulkUploadRow(row)),
    };
  }

  async listBulkEnrolmentUploads(params: {
    companyCode?: string;
    uploadedByUserId?: string;
    page?: number;
    limit?: number;
  }) {
    // Admin may omit companyCode to list all companies' uploads (no env fallback).
    const companyCode = String(params.companyCode || '').trim();
    const uploadedByUserId = String(params.uploadedByUserId || '').trim();
    const page = Number(params.page) > 0 ? Number(params.page) : 1;
    const limit = Number(params.limit) > 0 ? Math.min(Number(params.limit), 100) : 20;

    const qb = this.bulkEnrolmentUploadRepository
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (companyCode) {
      qb.andWhere('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code: companyCode });
    }
    if (uploadedByUserId) {
      qb.andWhere('u.uploadedByUserId = :uploadedByUserId', { uploadedByUserId });
    }

    const [rows, totalItems] = await qb.getManyAndCount();
    return {
      companyCode: companyCode || null,
      data: rows.map((row) => this.mapBulkUploadRow(row)),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }

  async downloadBulkEnrolmentZip(params: {
    uploadId: string;
    requesterUserId?: string;
    requesterRole?: string;
  }) {
    const id = String(params.uploadId || '').trim();
    if (!id) throw new BadRequestException('Upload id is required');

    const row = await this.bulkEnrolmentUploadRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Bulk enrolment upload not found');

    const role = String(params.requesterRole || '');
    const requesterUserId = String(params.requesterUserId || '').trim();
    const isAdmin = role === UserRole.Admin;
    const isOwner = Boolean(requesterUserId && row.uploadedByUserId === requesterUserId);

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only download ZIP files that you uploaded');
    }

    const absolutePath = join(BULK_ENROLMENT_STORAGE_DIR, row.storedFileName);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Bulk enrolment file is missing on the server');
    }

    const buffer = await readFile(absolutePath);
    const safeName = String(row.originalFileName || 'bulk-enrolment.zip').replace(
      /[^\w.\- ()[\]]+/g,
      '_',
    );

    return {
      filename: safeName.endsWith('.zip') ? safeName : `${safeName}.zip`,
      buffer,
      mimeType: 'application/zip',
    };
  }

  async deleteBulkEnrolmentZip(params: {
    uploadId: string;
    requesterUserId?: string;
    requesterRole?: string;
  }) {
    const id = String(params.uploadId || '').trim();
    if (!id) throw new BadRequestException('Upload id is required');

    const row = await this.bulkEnrolmentUploadRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Bulk enrolment upload not found');

    const role = String(params.requesterRole || '');
    const requesterUserId = String(params.requesterUserId || '').trim();
    const isAdmin = role === UserRole.Admin;
    const isOwner = Boolean(requesterUserId && row.uploadedByUserId === requesterUserId);

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only delete ZIP files that you uploaded');
    }

    const absolutePath = join(BULK_ENROLMENT_STORAGE_DIR, row.storedFileName);
    if (existsSync(absolutePath)) {
      await unlink(absolutePath).catch(() => undefined);
    }
    await this.bulkEnrolmentUploadRepository.delete(row.id);

    return {
      message: 'Bulk enrolment ZIP deleted successfully',
      data: { id: row.id },
    };
  }
}
