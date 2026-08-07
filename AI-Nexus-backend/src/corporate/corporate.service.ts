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
import { verifyEmailAddress } from '../utils/email-verification.util';
import {
  normalizeSingaporeNricFin,
  resolveSalesforceIdTypeByCardColorOrNationality,
  validateSingaporeNricFin,
  SINGAPORE_NRIC_FIN_USER_MESSAGES,
} from '../auth/utils/singapore-nric-fin.util';
import {
  findUserByVerifiedNricFin,
  isNricFinRegistrationComplete,
  NRIC_ALREADY_REGISTERED_MESSAGE,
} from '../auth/utils/nric-registration-guard.util';
import * as XLSX from 'xlsx';

// ----------------------------------------------------------------------

const AT_RISK_INACTIVE_DAYS = 7;
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BULK_ENROLMENT_ZIP_MAX_BYTES = 500 * 1024 * 1024;
const BULK_ENROLMENT_CSV_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB
const BULK_ENROLMENT_CSV_MAX_ROWS = 2000;
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
    defaults?: { company?: string },
  ) {
    const firstName = String(row.first_name || '').trim();
    const lastName = String(row.last_name || '').trim();
    const email = String(row.email || '').trim().toLowerCase();
    if (!firstName || !lastName || !email) {
      throw new BadRequestException('first_name, last_name and email are required for each learner.');
    }

    const accountId =
      String(row.corporateAccountId || '').trim() || String(corporateAccountId || '').trim();

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
      corporateAccountId: accountId,
      isAuthorisedSubmit: true,
    };

    const salutation = String(row.salutation || '').trim();
    if (salutation) payload.salutation = salutation;

    // Sheet "NRIC/ Fin/ Passport" → Salesforce `id_number`.
    // Salesforce typically persists NRIC only when BOTH id_type + id_number are present.
    const idNumberRaw = String(row.id_number || '').trim();
    const idNumber = idNumberRaw
      ? (normalizeSingaporeNricFin(idNumberRaw) || idNumberRaw.toUpperCase().replace(/\s+/g, ''))
      : '';
    const idTypeResolved = this.resolveStaffSalesforceIdType({
      idType: String(row.id_type || '').trim(),
      idNumber,
      eligibility: String(row.eligibility || '').trim(),
      countryOfResidence: String(row.countryOfResidence || '').trim(),
    });
    if (idNumber) {
      payload.id_number = idNumber;
      if (idTypeResolved) payload.id_type = idTypeResolved;
    } else if (idTypeResolved) {
      payload.id_type = idTypeResolved;
    }

    const company =
      String(row.company || '').trim() || String(defaults?.company || '').trim();
    if (company) payload.company = company;

    const department = String(row.department || '').trim();
    if (department) payload.department = department;

    const jobFunction = String(row.jobFunction || '').trim();
    if (jobFunction) payload.jobFunction = jobFunction;

    const countryOfResidence = String(row.countryOfResidence || '').trim();
    if (countryOfResidence) payload.countryOfResidence = countryOfResidence;

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

    const learnerAsAnAccounting =
      String(row.learnerAsAnAccounting || '').trim() || 'Yes';
    payload.learnerAsAnAccounting = learnerAsAnAccounting;

    const membershipNumber = String(row.membershipNumber || '').trim();
    // Only real ISCA membership numbers go to Salesforce `membershipNumber`.
    // Do NOT map "Membership of other accounting bodies" (e.g. ACCA) into this field.
    if (membershipNumber) payload.membershipNumber = membershipNumber;

    // Sheet column "Phone Number" (DTO.phoneNumber) → Salesforce body field `phone` only.
    const phone = String(row.phoneNumber || (row as { mobile?: string }).mobile || '').trim();
    if (phone) payload.phone = phone;

    const organisationType = String(row.organisationType || '').trim();
    if (organisationType) payload.organisationType = organisationType;

    const iscaMemberStatus = String(row.iscaMemberStatus || '').trim();
    if (iscaMemberStatus) payload.iscaMemberStatus = iscaMemberStatus;

    // Sheet "ISCA member/ Non-member" → Salesforce `accountType`.
    const accountTypeFromRow = String((row as { accountType?: string }).accountType || '').trim();
    const accountType =
      accountTypeFromRow
      || this.resolveSalesforceAccountTypeFromIscaStatus(iscaMemberStatus);
    if (accountType) payload.accountType = accountType;

    const otherAccountingBodies = String(row.otherAccountingBodies || '').trim();
    if (otherAccountingBodies) {
      // Kept locally only — not Salesforce membershipNumber.
      payload.otherAccountingBodies = otherAccountingBodies;
    }

    const eligibilityRaw = String(row.eligibility || '').trim();
    if (eligibilityRaw) {
      const resolved = this.resolveStaffEligibility(eligibilityRaw);
      if (resolved.value) {
        payload.eligibility = resolved.value;
      } else {
        // Keep raw so precheck can skip with a clear reason (do not fail whole CSV).
        payload.eligibility = eligibilityRaw;
        (payload as Record<string, unknown>)._eligibilityInvalidReason = resolved.reason;
      }
    }

    // Salesforce Authorised_Submit_For_Nexus__c expects boolean true after HR checkbox validation.

    return payload;
  }

  /**
   * Map sheet ID Type (+ citizenship) → Salesforce id_type picklist.
   * When NRIC is present but ID Type is blank/"NRIC", derive Blue/Pink NRIC.
   */
  private resolveStaffSalesforceIdType(params: {
    idType?: string;
    idNumber?: string;
    eligibility?: string;
    countryOfResidence?: string;
  }): string {
    const raw = String(params.idType || '').trim();
    const lower = raw.toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim();
    const idNumber = String(params.idNumber || '').trim().toUpperCase();
    const eligibility = String(params.eligibility || '').trim().toLowerCase();

    if (lower === 'passport' || lower.includes('passport')) return 'Passport';
    if (lower.includes('pink')) return 'Pink NRIC';
    if (lower.includes('blue')) return 'Blue NRIC';
    if (lower === 'nric number' || lower === 'nric' || lower === 'fin' || lower.includes('nric')) {
      if (eligibility.includes('pr') || eligibility.includes('permanent')) return 'Pink NRIC';
      if (eligibility.includes('citizen')) return 'Blue NRIC';
      return resolveSalesforceIdTypeByCardColorOrNationality({
        nationality: params.countryOfResidence || params.eligibility,
      });
    }

    if (raw) return raw;

    // ID number filled but ID Type blank — still send a valid SF id_type so NRIC inserts.
    if (idNumber) {
      if (/^[STFG]\d{7}[A-Z]$/.test(idNumber)) {
        if (eligibility.includes('pr') || eligibility.includes('permanent')) return 'Pink NRIC';
        if (eligibility.includes('citizen')) return 'Blue NRIC';
        return resolveSalesforceIdTypeByCardColorOrNationality({
          nationality: params.countryOfResidence || params.eligibility,
        });
      }
      if (/^M\d{7}[A-Z]$/.test(idNumber)) return 'Pink NRIC';
      return 'Passport';
    }

    return '';
  }

  /**
   * True when the sheet ID looks like / is declared as Singapore NRIC/FIN
   * (skip checksum for Passport and other non-NRIC IDs).
   */
  private isStaffSingaporeNricFinCandidate(idNumber: string, idType?: string): boolean {
    const type = String(idType || '')
      .toLowerCase()
      .replace(/[_/]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (type.includes('passport')) return false;

    const normalized = normalizeSingaporeNricFin(idNumber);
    if (/^[STFGM]\d{7}[A-Z]$/.test(normalized)) return true;

    return (
      type.includes('pink')
      || type.includes('blue')
      || type.includes('nric')
      || type === 'fin'
      || type.includes('fin ')
    );
  }

  /**
   * When NRIC/FIN is present: validate format/checksum (same as registration),
   * then return normalized value. Passport / other IDs are returned uppercased only.
   */
  private validateStaffIdNumberFormat(params: {
    idNumber?: string;
    idType?: string;
  }): { ok: true; value: string; isNricFin: boolean } | { ok: false; message: string } {
    const raw = String(params.idNumber || '').trim();
    if (!raw) return { ok: true, value: '', isNricFin: false };

    if (!this.isStaffSingaporeNricFinCandidate(raw, params.idType)) {
      return {
        ok: true,
        value: normalizeSingaporeNricFin(raw) || raw.toUpperCase().replace(/\s+/g, ''),
        isNricFin: false,
      };
    }

    try {
      const validation = validateSingaporeNricFin(raw);
      if (!validation.isValid) {
        return { ok: false, message: SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidChecksum };
      }
      return { ok: true, value: validation.normalized, isNricFin: true };
    } catch {
      return { ok: false, message: SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidFormat };
    }
  }

  /** Local app + Salesforce duplicate check for a verified NRIC/FIN. */
  private async checkStaffNricAlreadyExists(normalizedNricFin: string): Promise<{
    ok: true;
  } | {
    ok: false;
    where: 'app' | 'salesforce' | 'lookup';
    message: string;
  }> {
    const normalized = normalizeSingaporeNricFin(normalizedNricFin);
    if (!normalized) return { ok: true };

    const local = await findUserByVerifiedNricFin(this.userRepository, normalized);
    if (local && isNricFinRegistrationComplete(local)) {
      return { ok: false, where: 'app', message: NRIC_ALREADY_REGISTERED_MESSAGE };
    }

    try {
      const byNric = await this.oauthAuthService.checkSalesforceUserByNric(normalized);
      if (Boolean(byNric?.found)) {
        return {
          ok: false,
          where: 'salesforce',
          message: 'This NRIC/FIN number already exists in Salesforce.',
        };
      }
    } catch {
      return {
        ok: false,
        where: 'lookup',
        message: 'Could not verify NRIC/FIN in Salesforce.',
      };
    }

    return { ok: true };
  }

  /** Map sheet "ISCA member/ Non-member" → Salesforce accountType. */
  private resolveSalesforceAccountTypeFromIscaStatus(status: string): string {
    const raw = String(status || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (/non\s*member/.test(lower)) return 'Non member';
    if (
      lower === 'member'
      || lower === 'isca member'
      || /^isca\s+member$/.test(lower)
      || (lower.includes('isca') && lower.includes('member') && !lower.includes('non'))
    ) {
      return 'Member';
    }
    if (lower.includes('member') && !lower.includes('non')) return 'Member';
    return raw;
  }

  /**
   * Corporate fee-waiver enrol — Salesforce Citizenship__c restricted picklist.
   * Allowed: Singapore Citizen, Singapore PR only.
   * Legacy CSV values Foreigner/foreign still map to Singapore PR.
   */
  private resolveStaffEligibility(raw: string): { value: string | null; reason?: string } {
    const trimmed = String(raw || '').trim();
    const allowedLabel = 'Singapore Citizen, Singapore PR';
    if (!trimmed) {
      return {
        value: null,
        reason: `Citizenship is required. Allowed: ${allowedLabel}.`,
      };
    }

    const aliases: Record<string, string> = {
      'singapore citizen': 'Singapore Citizen',
      singaporean: 'Singapore Citizen',
      'sg citizen': 'Singapore Citizen',
      citizen: 'Singapore Citizen',
      'singapore pr': 'Singapore PR',
      'singapore permanent resident': 'Singapore PR',
      'permanent resident': 'Singapore PR',
      'sg pr': 'Singapore PR',
      pr: 'Singapore PR',
      // Legacy CSV values — treat as Singapore PR (no Foreigner option in UI).
      foreigner: 'Singapore PR',
      foreign: 'Singapore PR',
      'non citizen': 'Singapore PR',
      'non-citizen': 'Singapore PR',
    };

    const key = trimmed.toLowerCase().replace(/\s+/g, ' ');
    if (aliases[key]) return { value: aliases[key] };

    const allowed = ['Singapore Citizen', 'Singapore PR'] as const;
    const exact = allowed.find((item) => item.toLowerCase() === key);
    if (exact) return { value: exact };

    return {
      value: null,
      reason:
        `Invalid citizenship "${trimmed}". `
        + `Allowed: ${allowedLabel}. `
        + 'ISCA Member is not a Citizenship value — use Singapore Citizen or Singapore PR. '
        + 'Do not put a country name (e.g. Malaysia).',
    };
  }

  /** Persist fee-waiver citizenship flags used by learner list display. */
  private applyStaffEligibilityFlags(
    user: UserEntity,
    eligibilityRaw: string,
  ): void {
    const eligibility = String(eligibilityRaw || '').trim();
    const lower = eligibility.toLowerCase();
    const isCitizen = lower === 'singapore citizen';
    const isPr =
      lower === 'singapore pr'
      || lower === 'foreigner'; // legacy input; treated as PR

    user.eligibilityType = eligibility || null;
    user.eligibilityIsIscaMember = false;
    // True for Singapore PR (and legacy Foreigner). Citizen keeps type but not the PR flag.
    user.eligibilityIsSingaporePr = isPr ? true : isCitizen ? false : null;
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
      jobFunction?: string;
      countryOfResidence?: string;
      noOfYearOfRelevantWorkExperience?: string | number;
      learnerAsAnAccounting?: string;
      membershipNumber?: string;
      eligibility?: string;
      /** Salesforce body field — mapped from sheet column "Phone Number". */
      phone?: string;
      organisationType?: string;
      iscaMemberStatus?: string;
      otherAccountingBodies?: string;
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

      const years =
        row.noOfYearOfRelevantWorkExperience !== undefined
        && row.noOfYearOfRelevantWorkExperience !== null
        && !Number.isNaN(Number(row.noOfYearOfRelevantWorkExperience))
          ? Number(row.noOfYearOfRelevantWorkExperience)
          : null;

      const learnerAsAnAccounting = String(row.learnerAsAnAccounting || '').trim();
      const isAccountingYes = /^yes$/i.test(learnerAsAnAccounting);
      const staffJobFunction = String(row.jobFunction || '').trim();
      const jobFunction =
        staffJobFunction || (isAccountingYes ? 'accounting-finance-related' : '');
      const jobFunctionLabel =
        staffJobFunction || (isAccountingYes ? 'Accounting and finance related' : '');

      const eligibilitySnapshot: Record<string, unknown> = {
        companyCode,
        companyName: companyName || String(row.company || '').trim() || '',
        jobFunction,
        jobFunctionLabel,
        jobFunctionOther: '',
        department: String(row.department || '').trim() || '',
        role: staffJobFunction || '',
        yearsOfRelevantWorkExperience: years,
        learnerAsAnAccounting,
        eligibility: String(row.eligibility || '').trim() || '',
        salutation: String(row.salutation || '').trim() || '',
        name_as_per_id: String(row.name_as_per_id || '').trim() || '',
        id_type: String(row.id_type || '').trim() || '',
        id_number: String(row.id_number || '').trim() || '',
        countryOfResidence: String(row.countryOfResidence || '').trim() || '',
        membershipNumber: String(row.membershipNumber || '').trim() || '',
        phoneNumber: String(row.phone || '').trim() || '',
        organisationType: String(row.organisationType || '').trim() || '',
        iscaMemberStatus: String(row.iscaMemberStatus || '').trim() || '',
        otherAccountingBodies: String(row.otherAccountingBodies || '').trim() || '',
      };
      const resolvedEligibility = String(row.eligibility || '').trim();

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
          this.applyStaffEligibilityFlags(existing, resolvedEligibility);
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
          this.applyStaffEligibilityFlags(user, resolvedEligibility);
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
    source?: 'single' | 'csv' | 'excel';
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
    const seenNrics = new Set<string>();
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

      // Same rules as registration: format, disposable domains, MX/DNS.
      const emailVerification = await verifyEmailAddress(email);
      if (!emailVerification.isValid) {
        skipped.push({
          email,
          step: 'precheck',
          reason: emailVerification.reason || 'Email must be a valid email address!',
        });
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

      const eligibilityInvalidReason = String(
        (row as Record<string, unknown>)._eligibilityInvalidReason || '',
      ).trim();
      if (eligibilityInvalidReason) {
        skipped.push({
          email,
          step: 'precheck',
          reason: eligibilityInvalidReason,
        });
        continue;
      }

      const eligibility = String(row.eligibility || '').trim();
      if (!eligibility) {
        skipped.push({
          email,
          step: 'precheck',
          reason:
            'Citizenship is required. Allowed: Singapore Citizen, Singapore PR.',
        });
        continue;
      }
      const eligibilityResolved = this.resolveStaffEligibility(eligibility);
      if (!eligibilityResolved.value) {
        skipped.push({
          email,
          step: 'precheck',
          reason:
            eligibilityResolved.reason
            || 'Invalid citizenship value.',
        });
        continue;
      }
      row.eligibility = eligibilityResolved.value;
      delete (row as Record<string, unknown>)._eligibilityInvalidReason;

      // Optional when blank; if provided they are included in the SF payload.
      const iscaMemberStatus = String(row.iscaMemberStatus || '').trim();
      if (
        iscaMemberStatus
        && /non[\s-]*member/i.test(iscaMemberStatus)
        && !String(row.otherAccountingBodies || '').trim()
      ) {
        skipped.push({
          email,
          step: 'precheck',
          reason: 'Membership of other accounting bodies is required for Non-member.',
        });
        continue;
      }
      if (!String(row.company || '').trim()) {
        skipped.push({ email, step: 'precheck', reason: 'Organisation name is required.' });
        continue;
      }
      if (!String(row.learnerAsAnAccounting || '').trim()) {
        skipped.push({
          email,
          step: 'precheck',
          reason: 'Is the job function accounting related? is required.',
        });
        continue;
      }

      // NRIC/FIN present → format/checksum + duplicate (local + Salesforce), same as registration.
      const idNumberRaw = String(row.id_number || '').trim();
      if (idNumberRaw) {
        const idCheck = this.validateStaffIdNumberFormat({
          idNumber: idNumberRaw,
          idType: String(row.id_type || '').trim(),
        });
        if (!idCheck.ok) {
          skipped.push({ email, step: 'precheck', reason: idCheck.message });
          continue;
        }
        row.id_number = idCheck.value;
        if (idCheck.isNricFin && idCheck.value) {
          if (seenNrics.has(idCheck.value)) {
            skipped.push({
              email,
              step: 'precheck',
              reason: 'Duplicate NRIC/FIN within the upload file.',
            });
            continue;
          }
          seenNrics.add(idCheck.value);
          const nricExists = await this.checkStaffNricAlreadyExists(idCheck.value);
          if (!nricExists.ok) {
            skipped.push({ email, step: 'precheck', reason: nricExists.message });
            continue;
          }
        }
      }

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
          source:
            params.source === 'csv' || params.source === 'excel'
              ? params.source
              : 'single',
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
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
  }

  /** Compact form for fuzzy compare (ignore separators). */
  private compactCsvHeader(value: string): string {
    return this.normalizeCsvHeader(value).replace(/_/g, '');
  }

  /** Similarity ratio 0..1 (Levenshtein-based). */
  private stringSimilarity(a: string, b: string): number {
    const left = String(a || '');
    const right = String(b || '');
    if (left === right) return 1;
    if (!left.length || !right.length) return 0;

    const rows = left.length + 1;
    const cols = right.length + 1;
    const dist: number[] = new Array(cols);
    for (let j = 0; j < cols; j += 1) dist[j] = j;

    for (let i = 1; i < rows; i += 1) {
      let prev = dist[0];
      dist[0] = i;
      for (let j = 1; j < cols; j += 1) {
        const temp = dist[j];
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        dist[j] = Math.min(
          dist[j] + 1,
          dist[j - 1] + 1,
          prev + cost,
        );
        prev = temp;
      }
    }

    const distance = dist[right.length];
    return 1 - distance / Math.max(left.length, right.length);
  }

  private bestHeaderSimilarity(
    header: string,
    aliases: string[],
  ): { alias: string; score: number } {
    const normalized = this.normalizeCsvHeader(header);
    const compact = this.compactCsvHeader(header);
    let bestAlias = aliases[0] || '';
    let bestScore = 0;

    for (const alias of aliases) {
      const aliasNorm = this.normalizeCsvHeader(alias);
      const aliasCompact = this.compactCsvHeader(alias);
      const score = Math.max(
        this.stringSimilarity(normalized, aliasNorm),
        this.stringSimilarity(compact, aliasCompact),
      );
      if (score > bestScore) {
        bestScore = score;
        bestAlias = aliasNorm;
      }
    }
    return { alias: bestAlias, score: bestScore };
  }

  /**
   * Resolve CSV columns with exact + fuzzy (≥80%) alias matching.
   * Near-miss headers (<80% but suggestive) return a clear suggestion error.
   */
  private resolveStaffEnrolmentHeaderIndexes(rawHeaders: string[]): {
    salutation: number;
    first_name: number;
    last_name: number;
    name_as_per_id: number;
    email: number;
    id_type: number;
    id_number: number;
    company: number;
    department: number;
    jobFunction: number;
    countryOfResidence: number;
    noOfYearOfRelevantWorkExperience: number;
    corporateAccountId: number;
    learnerAsAnAccounting: number;
    membershipNumber: number;
    eligibility: number;
    phoneNumber: number;
    organisationType: number;
    iscaMemberStatus: number;
    otherAccountingBodies: number;
  } {
    const FUZZY_ACCEPT = 0.8;

    type FieldKey =
      | 'salutation'
      | 'first_name'
      | 'last_name'
      | 'name_as_per_id'
      | 'email'
      | 'id_type'
      | 'id_number'
      | 'company'
      | 'department'
      | 'jobFunction'
      | 'countryOfResidence'
      | 'noOfYearOfRelevantWorkExperience'
      | 'corporateAccountId'
      | 'learnerAsAnAccounting'
      | 'membershipNumber'
      | 'eligibility'
      | 'phoneNumber'
      | 'organisationType'
      | 'iscaMemberStatus'
      | 'otherAccountingBodies';

    const fieldAliases: Record<FieldKey, string[]> = {
      salutation: ['salutation'],
      first_name: [
        'first_name',
        'firstname',
        'first',
        'first name',
      ],
      last_name: [
        'last_name',
        'lastname',
        'last',
        'last name',
        'last name (surname)',
        'last_name_preferred',
        'last_name_surname',
        'surname',
      ],
      name_as_per_id: [
        'name_as_per_id',
        'name as per id',
        'fullname_as_per_id',
        'full_name',
        'fullname',
      ],
      email: [
        'email',
        'work_email',
        'corporate_email_address',
        'corporate email address',
        'corporate_email',
        'email_address',
      ],
      id_number: [
        'nric/ fin/ passport',
        'nric/fin/passport',
        'nric fin passport',
        'nric / fin / passport',
        'nric/fin/passport number',
        'nric fin passport number',
        'nric_fin_passport',
        'nric_number',
        'nric number',
        'nric no',
        'nric_no',
        'nricno',
        'nric',
        'nrci',
        'nrci_number',
        'nrci number',
        'nrci no',
        'id_number',
        'id number',
        'idnumber',
        'id no',
        'id_no',
        'idno',
        'identity_number',
        'identity number',
        'identification_number',
        'identification number',
        'fin',
        'fin_number',
        'fin number',
        'passport',
        'passport_number',
        'passport number',
        'passport no',
      ],
      id_type: [
        'id_type',
        'id type',
        'idtype',
        'identity_type',
        'nric_type',
        'id type (nric/fin/passport)',
        'blue nric',
        'pink nric',
      ],
      company: [
        'company',
        'organisation_name',
        'organization_name',
        'organisation name',
        'organization name',
        'organisation',
        'organization',
        'company_name',
        'account_name',
      ],
      department: ['department', 'dept'],
      jobFunction: [
        'jobfunction',
        'job_function',
        'job function',
        'role',
        'staff_role',
        'staffrole',
        'job_title',
        'job_title_designation',
        'designation',
      ],
      countryOfResidence: [
        'countryofresidence',
        'country_of_residence',
        'country of residence',
        'country',
        'residence_country',
        'nationality',
      ],
      noOfYearOfRelevantWorkExperience: [
        'noofyearofrelevantworkexperience',
        'no_of_year_of_relevant_work_experience',
        'years_of_experience',
        'experience_years',
        'years_of_relevant_work_experience',
        'number_of_years_of_relevant_work_experience',
      ],
      corporateAccountId: [
        'corporateaccountid',
        'corporate_account_id',
        'company_account_id',
        'account_id',
        'corporate_accountid',
      ],
      learnerAsAnAccounting: [
        'learnerasanaccounting',
        'learner_as_an_accounting',
        'is the job function accounting related?',
        'is the job function accounting related',
        'is_the_job_function_accounting_related',
        'is_the_learner_working_as_an_accounting_and_related_profession',
        'accounting_related',
        'job_function_accounting_related',
        'learner_as_an_accounting_professional',
      ],
      membershipNumber: [
        'membershipnumber',
        'membership_number',
        'member_number',
        'isca_membership_number',
      ],
      eligibility: [
        'eligibility',
        'citizenship',
        'citizenship_eligibility',
      ],
      phoneNumber: [
        'phone',
        'phone number',
        'phone_number',
        'phonenumber',
        'phone no',
        'phone_no',
        'phoneno',
        'telephone',
        'tel',
        'mobile',
        'mobile_number',
        'mobile number',
        'handphone',
        'contact_number',
        'contact number',
        'contact no',
      ],
      organisationType: [
        'organisation type',
        'organization type',
        'organisation_type',
        'organization_type',
        'organisationtype',
        'organizationtype',
        'org_type',
      ],
      iscaMemberStatus: [
        'isca member/ non-member',
        'isca member / non-member',
        'isca member/non-member',
        'isca_member_non_member',
        'isca member non member',
        'isca member',
        'isca_member',
        'isca_member_status',
        'member_status',
        'isca membership status',
        'account type',
        'account_type',
        'accounttype',
        'non-member',
        'non member',
      ],
      otherAccountingBodies: [
        'membership of other accounting bodies (only if non isca member)',
        'membership of other accounting bodies',
        'other accounting bodies',
        'other_accounting_bodies',
        'membership_of_other_accounting_bodies',
      ],
    };

    const displayName: Record<FieldKey, string> = {
      salutation: 'Salutation (optional)',
      first_name: 'First Name (required)',
      last_name: 'Last Name (Surname) (required)',
      name_as_per_id: 'Name as per ID (optional)',
      email: 'Corporate email address (required)',
      id_type: 'ID Type (optional)',
      id_number: 'NRIC/ Fin/ Passport (optional → Salesforce id_number)',
      company: 'Organisation name (required)',
      department: 'Department (optional)',
      jobFunction: 'Job function (optional)',
      countryOfResidence: 'Nationality (optional → countryOfResidence)',
      noOfYearOfRelevantWorkExperience: 'Years of experience (optional)',
      corporateAccountId: 'Corporate Account ID (optional / auto)',
      learnerAsAnAccounting: 'Is the job function accounting related? (required)',
      membershipNumber: 'ISCA membership number (optional)',
      eligibility: 'Citizenship (required)',
      phoneNumber: 'Phone Number (optional → Salesforce phone)',
      organisationType: 'Organisation type (optional)',
      iscaMemberStatus: 'ISCA member/ Non-member (optional → accountType)',
      otherAccountingBodies:
        'Membership of other accounting bodies (required only if Non-member)',
    };

    const usedIndexes = new Set<number>();
    const resolved: Record<FieldKey, number> = {
      salutation: -1,
      first_name: -1,
      last_name: -1,
      name_as_per_id: -1,
      email: -1,
      id_type: -1,
      id_number: -1,
      company: -1,
      department: -1,
      jobFunction: -1,
      countryOfResidence: -1,
      noOfYearOfRelevantWorkExperience: -1,
      corporateAccountId: -1,
      learnerAsAnAccounting: -1,
      membershipNumber: -1,
      eligibility: -1,
      phoneNumber: -1,
      organisationType: -1,
      iscaMemberStatus: -1,
      otherAccountingBodies: -1,
    };

    const fieldKeys = Object.keys(fieldAliases) as FieldKey[];

    // Pass 1: exact normalized / compact match
    for (const key of fieldKeys) {
      const aliases = fieldAliases[key].map((a) => this.normalizeCsvHeader(a));
      const compactAliases = fieldAliases[key].map((a) => this.compactCsvHeader(a));
      for (let i = 0; i < rawHeaders.length; i += 1) {
        if (usedIndexes.has(i)) continue;
        const header = rawHeaders[i];
        const norm = this.normalizeCsvHeader(header);
        const compact = this.compactCsvHeader(header);
        if (aliases.includes(norm) || compactAliases.includes(compact)) {
          resolved[key] = i;
          usedIndexes.add(i);
          break;
        }
      }
    }

    // Pass 2: fuzzy ≥ 80% — map known fields only; never fail on extra columns
    for (const key of fieldKeys) {
      if (resolved[key] >= 0) continue;
      let bestIdx = -1;
      let bestScore = 0;
      for (let i = 0; i < rawHeaders.length; i += 1) {
        if (usedIndexes.has(i)) continue;
        const { score } = this.bestHeaderSimilarity(rawHeaders[i], fieldAliases[key]);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0 && bestScore >= FUZZY_ACCEPT) {
        resolved[key] = bestIdx;
        usedIndexes.add(bestIdx);
      }
    }

    // Phone Number fallback: any unused header that clearly means phone.
    if (resolved.phoneNumber < 0) {
      for (let i = 0; i < rawHeaders.length; i += 1) {
        if (usedIndexes.has(i)) continue;
        const compact = this.compactCsvHeader(rawHeaders[i]);
        if (
          compact.includes('phone')
          || compact === 'tel'
          || compact.includes('telephone')
          || compact.includes('mobile')
          || compact === 'hp'
          || compact.includes('handphone')
        ) {
          resolved.phoneNumber = i;
          usedIndexes.add(i);
          break;
        }
      }
    }

    // NRIC / ID number fallback: unused header that clearly means NRIC/FIN/Passport/ID no.
    if (resolved.id_number < 0) {
      for (let i = 0; i < rawHeaders.length; i += 1) {
        if (usedIndexes.has(i)) continue;
        const compact = this.compactCsvHeader(rawHeaders[i]);
        if (
          compact.includes('idtype')
          || compact === 'type'
          || compact.endsWith('type')
        ) {
          continue;
        }
        if (
          compact.includes('nric')
          || compact.includes('nrci')
          || compact.includes('passport')
          || (compact.includes('fin') && !compact.includes('finance'))
          || compact === 'idnumber'
          || compact === 'idno'
          || compact.includes('identitynumber')
        ) {
          resolved.id_number = i;
          usedIndexes.add(i);
          break;
        }
      }
    }

    // ISCA member/ Non-member → accountType
    if (resolved.iscaMemberStatus < 0) {
      for (let i = 0; i < rawHeaders.length; i += 1) {
        if (usedIndexes.has(i)) continue;
        const compact = this.compactCsvHeader(rawHeaders[i]);
        if (
          compact.includes('iscamember')
          || compact.includes('nonmember')
          || compact === 'accounttype'
          || (compact.includes('member') && compact.includes('isca'))
        ) {
          resolved.iscaMemberStatus = i;
          usedIndexes.add(i);
          break;
        }
      }
    }

    // Extra / unknown columns are intentionally ignored (valid).
    // Optional columns (insert into SF only when present):
    // id_type, id_number, department, jobFunction, countryOfResidence,
    // noOfYearOfRelevantWorkExperience, membershipNumber, phoneNumber,
    // organisationType, iscaMemberStatus, otherAccountingBodies.
    const missingRequired: string[] = [];
    if (resolved.first_name < 0) missingRequired.push(displayName.first_name);
    if (resolved.last_name < 0) missingRequired.push(displayName.last_name);
    if (resolved.email < 0) missingRequired.push(displayName.email);
    if (resolved.eligibility < 0) missingRequired.push(displayName.eligibility);
    if (resolved.company < 0) missingRequired.push('Organisation name');
    if (resolved.learnerAsAnAccounting < 0) {
      missingRequired.push('Is the job function accounting related?');
    }
    if (missingRequired.length) {
      throw new BadRequestException(
        `CSV header must include: ${missingRequired.join(', ')}. `
        + 'Extra columns are ignored. Close spellings (≥80% match) are accepted automatically.',
      );
    }

    return resolved;
  }

  private isStaffEnrolmentSpreadsheetFile(fileName: string): boolean {
    return /\.(csv|xlsx|xls)$/i.test(String(fileName || ''));
  }

  private isStaffEnrolmentExcelFile(fileName: string): boolean {
    return /\.(xlsx|xls)$/i.test(String(fileName || ''));
  }

  private parseExcludeRowNumbers(raw?: string | number[] | null): Set<number> {
    if (Array.isArray(raw)) {
      return new Set(
        raw.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 2),
      );
    }
    const text = String(raw || '').trim();
    if (!text) return new Set();
    return new Set(
      text
        .split(/[,\s]+/)
        .map((part) => Number(part))
        .filter((n) => Number.isFinite(n) && n >= 2),
    );
  }

  private spreadsheetCellToString(cell: unknown): string {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'number' && Number.isFinite(cell)) {
      // Excel often stores phone digits as numbers — avoid scientific notation.
      if (Number.isInteger(cell)) return String(Math.trunc(cell));
      return String(cell);
    }
    return String(cell)
      .replace(/\u00a0/g, ' ')
      .replace(/^\ufeff/, '')
      .trim();
  }

  private mapStaffEnrolmentTableToLearners(
    rawHeaders: string[],
    dataRows: string[][],
  ): CorporateStaffLearnerDto[] {
    const idx = this.resolveStaffEnrolmentHeaderIndexes(rawHeaders);
    const learners: CorporateStaffLearnerDto[] = [];

    for (const cells of dataRows) {
      const read = (columnIndex: number) =>
        columnIndex >= 0 ? this.spreadsheetCellToString(cells[columnIndex]) : '';

      const firstName = read(idx.first_name);
      const lastName = read(idx.last_name);
      const email = read(idx.email);
      if (!firstName && !lastName && !email) continue;

      const yearsRaw = read(idx.noOfYearOfRelevantWorkExperience);
      const years = yearsRaw ? Number(yearsRaw) : undefined;
      const phoneValue = read(idx.phoneNumber);

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
        jobFunction: read(idx.jobFunction) || undefined,
        countryOfResidence: read(idx.countryOfResidence) || undefined,
        noOfYearOfRelevantWorkExperience:
          years !== undefined && !Number.isNaN(years) ? years : undefined,
        corporateAccountId: read(idx.corporateAccountId) || undefined,
        learnerAsAnAccounting: read(idx.learnerAsAnAccounting) || undefined,
        membershipNumber: read(idx.membershipNumber) || undefined,
        eligibility: read(idx.eligibility) || undefined,
        phoneNumber: phoneValue || undefined,
        organisationType: read(idx.organisationType) || undefined,
        iscaMemberStatus: read(idx.iscaMemberStatus) || undefined,
        otherAccountingBodies: read(idx.otherAccountingBodies) || undefined,
      });
    }

    if (!learners.length) {
      throw new BadRequestException('No valid learner rows found in the upload file.');
    }
    if (learners.length > BULK_ENROLMENT_CSV_MAX_ROWS) {
      throw new BadRequestException(
        `Upload supports a maximum of ${BULK_ENROLMENT_CSV_MAX_ROWS} learner rows.`,
      );
    }
    return learners;
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

    const rawHeaders = this.parseCsvLine(lines[0]);
    const dataRows = lines.slice(1).map((line) => this.parseCsvLine(line));
    return this.mapStaffEnrolmentTableToLearners(rawHeaders, dataRows);
  }

  parseStaffEnrolmentExcel(buffer: Buffer): CorporateStaffLearnerDto[] {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false });
    } catch {
      throw new BadRequestException('Could not read the Excel file. Please upload a valid .xlsx or .xls file.');
    }

    const sheetName = workbook.SheetNames.find((name: string) => String(name || '').trim()) || '';
    if (!sheetName) {
      throw new BadRequestException('Excel file has no worksheets.');
    }
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new BadRequestException('Excel worksheet could not be read.');
    }

    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(
      sheet,
      {
        header: 1,
        defval: '',
        blankrows: false,
        raw: false,
      },
    );

    const normalizedRows = (Array.isArray(matrix) ? matrix : [])
      .map((row) =>
        (Array.isArray(row) ? row : []).map((cell) => this.spreadsheetCellToString(cell)),
      )
      .filter((row) => row.some((cell) => cell.length > 0));

    if (normalizedRows.length < 2) {
      throw new BadRequestException(
        'Excel must include a header row and at least one learner row on the first sheet.',
      );
    }

    const rawHeaders = normalizedRows[0];
    const dataRows = normalizedRows.slice(1);
    return this.mapStaffEnrolmentTableToLearners(rawHeaders, dataRows);
  }

  parseStaffEnrolmentFile(buffer: Buffer, fileName = ''): CorporateStaffLearnerDto[] {
    const name = String(fileName || '').toLowerCase();
    if (this.isStaffEnrolmentExcelFile(name)) {
      return this.parseStaffEnrolmentExcel(buffer);
    }
    return this.parseStaffEnrolmentCsv(buffer);
  }

  /**
   * Validate CSV before enrolment: columns, email format, in-file duplicates,
   * citizenship, company code, and existing local / Salesforce emails.
   * Does not create users.
   */
  async validateStaffEnrolmentCsv(params: {
    actorUserId?: string;
    companyCode?: string;
    file?: Express.Multer.File;
  }) {
    const file = params.file;
    const errors: Array<{
      type: 'file' | 'header' | 'row';
      row?: number;
      email?: string;
      field?: string;
      message: string;
    }> = [];

    if (!file?.buffer?.length) {
      return {
        valid: false,
        fileName: '',
        rowCount: 0,
        errors: [{ type: 'file', message: 'CSV or Excel file is required.' }],
        rows: [],
        summary: {
          requiredColumnsOk: false,
          emailFormatErrors: 0,
          duplicateEmails: 0,
          nricFormatErrors: 0,
          duplicateNrics: 0,
          citizenshipErrors: 0,
          alreadyInApp: 0,
          alreadyInSalesforce: 0,
          validRows: 0,
        },
      };
    }

    const original = String(file.originalname || '').toLowerCase();
    if (!this.isStaffEnrolmentSpreadsheetFile(original)) {
      return {
        valid: false,
        fileName: String(file.originalname || ''),
        rowCount: 0,
        errors: [{ type: 'file', message: 'Only .csv, .xlsx or .xls files are allowed.' }],
        rows: [],
        summary: {
          requiredColumnsOk: false,
          emailFormatErrors: 0,
          duplicateEmails: 0,
          nricFormatErrors: 0,
          duplicateNrics: 0,
          citizenshipErrors: 0,
          alreadyInApp: 0,
          alreadyInSalesforce: 0,
          validRows: 0,
        },
      };
    }

    if (file.size > BULK_ENROLMENT_CSV_MAX_BYTES) {
      return {
        valid: false,
        fileName: String(file.originalname || ''),
        rowCount: 0,
        errors: [{ type: 'file', message: 'CSV file must be 1GB or smaller.' }],
        rows: [],
        summary: {
          requiredColumnsOk: false,
          emailFormatErrors: 0,
          duplicateEmails: 0,
          nricFormatErrors: 0,
          duplicateNrics: 0,
          citizenshipErrors: 0,
          alreadyInApp: 0,
          alreadyInSalesforce: 0,
          validRows: 0,
        },
      };
    }

    let learners: CorporateStaffLearnerDto[] = [];
    let requiredColumnsOk = true;
    try {
      learners = this.parseStaffEnrolmentFile(file.buffer, file.originalname);
    } catch (err: unknown) {
      requiredColumnsOk = false;
      let messages: string[] = ['Invalid CSV headers or content.'];
      if (err instanceof BadRequestException) {
        const res = err.getResponse();
        if (typeof res === 'string') {
          messages = [res];
        } else if (res && typeof res === 'object' && 'message' in res) {
          const m = (res as { message?: string | string[] }).message;
          messages = Array.isArray(m) ? m.map(String) : [String(m || err.message)];
        } else {
          messages = [err.message];
        }
      } else if (err instanceof Error) {
        messages = [err.message];
      }
      for (const msg of messages) {
        errors.push({ type: 'header', message: String(msg) });
      }
      return {
        valid: false,
        fileName: String(file.originalname || ''),
        rowCount: 0,
        errors,
        rows: [],
        summary: {
          requiredColumnsOk: false,
          emailFormatErrors: 0,
          duplicateEmails: 0,
          nricFormatErrors: 0,
          duplicateNrics: 0,
          citizenshipErrors: 0,
          alreadyInApp: 0,
          alreadyInSalesforce: 0,
          validRows: 0,
        },
      };
    }

    let companyCode = '';
    try {
      companyCode = await this.resolveEnrolCompanyCode({
        actorUserId: params.actorUserId,
        companyCode: params.companyCode,
      });
    } catch (err: unknown) {
      errors.push({
        type: 'file',
        field: 'companyCode',
        message:
          err instanceof Error
            ? err.message
            : 'Company code is missing. Please sign in again via corporate SSO.',
      });
    }
    if (!String(companyCode || '').trim()) {
      if (!errors.some((e) => e.field === 'companyCode')) {
        errors.push({
          type: 'file',
          field: 'companyCode',
          message: 'Company code is required for bulk enrolment.',
        });
      }
    }

    const seenEmails = new Set<string>();
    const seenNrics = new Set<string>();
    let emailFormatErrors = 0;
    let duplicateEmails = 0;
    let nricFormatErrors = 0;
    let duplicateNrics = 0;
    let citizenshipErrors = 0;
    let alreadyInApp = 0;
    let alreadyInSalesforce = 0;
    let validRows = 0;
    const rows: Array<{
      row: number;
      email: string;
      status: 'ok' | 'error';
      statusLabel: string;
      messages: string[];
    }> = [];

    for (let i = 0; i < learners.length; i += 1) {
      const row = learners[i];
      const csvRow = i + 2; // header is row 1
      const email = String(row.email || '').trim().toLowerCase();
      const rowMessages: string[] = [];
      let rowHasError = false;

      const pushRowError = (field: string, message: string) => {
        rowHasError = true;
        rowMessages.push(message);
        errors.push({
          type: 'row',
          row: csvRow,
          email: email || undefined,
          field,
          message,
        });
      };

      if (!email) {
        emailFormatErrors += 1;
        pushRowError('email', 'Email is required.');
      } else {
        const emailVerification = await verifyEmailAddress(email);
        if (!emailVerification.isValid) {
          emailFormatErrors += 1;
          pushRowError(
            'email',
            emailVerification.reason || 'Email format is invalid.',
          );
        } else if (seenEmails.has(email)) {
          duplicateEmails += 1;
          pushRowError('email', 'Duplicate email within the CSV.');
        } else {
          seenEmails.add(email);
        }
      }

      const firstName = String(row.first_name || '').trim();
      const lastName = String(row.last_name || '').trim();
      if (!firstName) {
        pushRowError('first_name', 'First name is required.');
      }
      if (!lastName) {
        pushRowError('last_name', 'Last name is required.');
      }

      // Optional fields — validate only when present; blank is OK.
      // id_type, id_number, countryOfResidence, phoneNumber, organisationType,
      // jobFunction, iscaMemberStatus, department, years, membershipNumber.

      const eligibility = String(row.eligibility || '').trim();
      if (!eligibility) {
        citizenshipErrors += 1;
        pushRowError(
          'eligibility',
          'Citizenship is required. Allowed: Singapore Citizen, Singapore PR.',
        );
      } else {
        const resolved = this.resolveStaffEligibility(eligibility);
        if (!resolved.value) {
          citizenshipErrors += 1;
          pushRowError(
            'eligibility',
            resolved.reason || 'Invalid citizenship value.',
          );
        }
      }

      const iscaMemberStatus = String(row.iscaMemberStatus || '').trim();
      const isNonIscaMember =
        Boolean(iscaMemberStatus) && /non[\s-]*member/i.test(iscaMemberStatus);
      const otherAccountingBodies = String(row.otherAccountingBodies || '').trim();
      if (isNonIscaMember && !otherAccountingBodies) {
        pushRowError(
          'otherAccountingBodies',
          'Membership of other accounting bodies is required for Non-member.',
        );
      }

      const organisationName = String(row.company || '').trim();
      if (!organisationName) {
        pushRowError('company', 'Organisation name is required.');
      }

      const learnerAsAnAccounting = String(row.learnerAsAnAccounting || '').trim();
      if (!learnerAsAnAccounting) {
        pushRowError(
          'learnerAsAnAccounting',
          'Is the job function accounting related? is required.',
        );
      }

      // NRIC/FIN present → same validity + uniqueness checks as registration.
      const idNumberRaw = String(row.id_number || '').trim();
      const idTypeRaw = String(row.id_type || '').trim();
      let normalizedNricForLookup = '';
      if (idNumberRaw) {
        const idCheck = this.validateStaffIdNumberFormat({
          idNumber: idNumberRaw,
          idType: idTypeRaw,
        });
        if (!idCheck.ok) {
          nricFormatErrors += 1;
          pushRowError('id_number', idCheck.message);
        } else if (idCheck.isNricFin && idCheck.value) {
          normalizedNricForLookup = idCheck.value;
          if (seenNrics.has(normalizedNricForLookup)) {
            duplicateNrics += 1;
            pushRowError('id_number', 'Duplicate NRIC/FIN within the upload file.');
          } else {
            seenNrics.add(normalizedNricForLookup);
          }
        }
      }

      if (!rowHasError && email) {
        const localExisting = await this.userRepository.findOne({ where: { email } });
        if (localExisting) {
          alreadyInApp += 1;
          pushRowError('email', 'Already registered in the app.');
        } else {
          try {
            const byEmail = await this.oauthAuthService.checkSalesforceUserByEmail(email);
            if (Boolean(byEmail?.found)) {
              alreadyInSalesforce += 1;
              pushRowError('email', 'Already exists in Salesforce.');
            }
          } catch {
            pushRowError('email', 'Could not verify email in Salesforce.');
          }
        }
      }

      if (!rowHasError && normalizedNricForLookup) {
        const nricExists = await this.checkStaffNricAlreadyExists(normalizedNricForLookup);
        if (!nricExists.ok) {
          if (nricExists.where === 'app') alreadyInApp += 1;
          else if (nricExists.where === 'salesforce') alreadyInSalesforce += 1;
          pushRowError('id_number', nricExists.message);
        }
      }

      if (!rowHasError) validRows += 1;

      rows.push({
        row: csvRow,
        email: email || '(missing)',
        status: rowHasError ? 'error' : 'ok',
        statusLabel: rowHasError ? rowMessages[0] || 'Failed' : 'Ready',
        messages: rowMessages,
      });
    }

    const valid = errors.length === 0 && validRows > 0;

    return {
      valid,
      fileName: String(file.originalname || ''),
      rowCount: learners.length,
      companyCode: companyCode || null,
      errors,
      rows,
      summary: {
        requiredColumnsOk,
        emailFormatErrors,
        duplicateEmails,
        nricFormatErrors,
        duplicateNrics,
        citizenshipErrors,
        alreadyInApp,
        alreadyInSalesforce,
        validRows,
      },
    };
  }

  async enrolStaffBulkFromCsv(params: {
    actorUserId?: string;
    companyCode?: string;
    file?: Express.Multer.File;
    excludeRows?: string | number[] | null;
  }) {
    const file = params.file;
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV or Excel file is required.');
    }
    if (file.size > BULK_ENROLMENT_CSV_MAX_BYTES) {
      throw new BadRequestException('Upload file must be 1GB or smaller.');
    }
    const original = String(file.originalname || '').toLowerCase();
    if (!this.isStaffEnrolmentSpreadsheetFile(original)) {
      throw new BadRequestException(
        'Only .csv, .xlsx or .xls files are allowed for bulk learner enrolment.',
      );
    }

    let learners = this.parseStaffEnrolmentFile(file.buffer, file.originalname);
    const exclude = this.parseExcludeRowNumbers(params.excludeRows);
    if (exclude.size) {
      learners = learners.filter((_row, index) => !exclude.has(index + 2));
    }
    if (!learners.length) {
      throw new BadRequestException('No learner rows left to enrol after skipping errors.');
    }

    return this.enrolStaffBulk({
      actorUserId: params.actorUserId,
      companyCode: params.companyCode,
      learners,
      isAuthorisedSubmit: true,
      source: this.isStaffEnrolmentExcelFile(original) ? 'excel' : 'csv',
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

  /**
   * Corporate HR profile — prefer live Salesforce userinfoforcorporate when SSO token
   * is still available; otherwise return last synced salesforceUserInfoRaw.corporate.
   */
  async getHrProfile(actorUserId?: string) {
    const userId = String(actorUserId || '').trim();
    if (!userId) throw new ForbiddenException('Not authenticated');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.Corporate && user.role !== UserRole.Admin) {
      throw new ForbiddenException('Corporate profile is only available for Corporate HR accounts.');
    }

    let corporateInfo: Record<string, unknown> | null = null;
    let source: 'salesforce' | 'cached' = 'cached';

    const socialToken = String(user.socialAccessToken || '').trim();
    if (socialToken) {
      try {
        const fresh = await this.oauthAuthService.fetchSalesforceCorporateUserInfo(socialToken);
        if (this.oauthAuthService.isCorporateSalesforceUserInfo(fresh)) {
          corporateInfo = fresh;
          source = 'salesforce';
          user.salesforceUserInfoRaw = {
            ...(user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
              ? user.salesforceUserInfoRaw
              : {}),
            corporate: fresh,
          };
          const companyCode = this.oauthAuthService.resolveCorporateCompanyCode(fresh);
          const accountId = String((fresh as { accountId?: string }).accountId || '').trim();
          if (companyCode) user.companyCode = companyCode;
          if (accountId) user.salesforceAccountId = accountId;
          user.salesforceSyncedAt = new Date();
          await this.userRepository.save(user);
        }
      } catch (err) {
        console.warn('[CorporateProfile] Live Salesforce userinfo refresh failed:', err);
      }
    }

    if (!corporateInfo) {
      const raw = user.salesforceUserInfoRaw;
      if (raw && typeof raw === 'object') {
        const nested =
          (raw as Record<string, unknown>).corporate
          && typeof (raw as Record<string, unknown>).corporate === 'object'
            ? ((raw as Record<string, unknown>).corporate as Record<string, unknown>)
            : null;
        corporateInfo = nested || (raw as Record<string, unknown>);
      }
    }

    const info = corporateInfo && typeof corporateInfo === 'object' ? corporateInfo : {};

    return {
      source,
      syncedAt: user.salesforceSyncedAt || null,
      local: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        role: user.role,
        companyCode: user.companyCode || null,
        salesforceAccountId: user.salesforceAccountId || null,
        salesforceUsername: user.salesforceUsername || null,
      },
      salesforce: {
        success: info.success ?? null,
        role: info.role ?? null,
        isCorporateMember:
          info.isCoporateMember ?? info.isCorporateMember ?? null,
        companyCode: info.companyCode ?? user.companyCode ?? null,
        uenNumber: info.uenNumber ?? null,
        organisationType: info.organisationType ?? null,
        billingCountry: info.billingCountry ?? null,
        billingCity: info.billingCity ?? null,
        accountName: info.accountName ?? null,
        accountId: info.accountId ?? user.salesforceAccountId ?? null,
        username: info.username ?? user.salesforceUsername ?? null,
        contactId: info.contactId ?? null,
        contactFirstName: info.contactFirstName ?? user.firstname ?? null,
        contactLastName: info.contactLastName ?? user.lastname ?? null,
        contactEmail: info.contactEmail ?? user.email ?? null,
        contactMobile: info.contactMobile ?? null,
        contactPhone: info.contactPhone ?? null,
        contactDesignation: info.contactDesignation ?? null,
      },
    };
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
      let accountName = '';
      try {
        accountName = await this.oauthAuthService.resolveCorporateCompanyDisplayName(companyCode);
      } catch (nameErr) {
        console.warn('[CorporateOverview] Could not resolve company display name:', nameErr);
      }
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

    const snap =
      user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
        ? (user.eligibilitySnapshot as Record<string, unknown>)
        : null;
    const snapshotRole = String(
      snap?.jobFunction || snap?.role || snap?.staff_role || '',
    ).trim();
    const snapshotDept = String(snap?.department || '').trim();
    const snapshotAccounting = String(snap?.learnerAsAnAccounting || '').trim();

    return {
      userId: user.id,
      name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || user.username || 'Learner',
      email: user.email || '',
      department: snapshotDept || '—',
      role: snapshotRole || user.financeRole || user.persona || '—',
      eligibility: this.formatEligibility(user),
      profession: snapshotAccounting || (user.financeRole ? 'Yes' : '—'),
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
    const snap =
      user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
        ? (user.eligibilitySnapshot as Record<string, unknown>)
        : null;
    const fromSnap = String(snap?.eligibility || '').trim();
    if (fromSnap) {
      const lower = fromSnap.toLowerCase();
      if (lower === 'singapore citizen') return 'Singapore Citizen';
      if (lower === 'singapore pr') return 'Singapore PR';
      // Legacy CSV Foreigner → display as Singapore PR
      if (lower === 'foreigner' || lower === 'foreign') return 'Singapore PR';
      if (lower === 'isca member') return 'ISCA Member';
      return fromSnap;
    }

    if (user.eligibilityType) {
      const type = String(user.eligibilityType).trim();
      const lower = type.toLowerCase();
      if (lower === 'singapore citizen') return 'Singapore Citizen';
      if (lower === 'singapore pr') return 'Singapore PR';
      if (lower === 'foreigner' || lower === 'foreign') return 'Singapore PR';
      return type;
    }

    if (user.eligibilityIsSingaporePr === true) return 'Singapore PR';
    if (user.eligibilityIsIscaMember === true) return 'ISCA Member';
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