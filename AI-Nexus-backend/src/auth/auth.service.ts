// src/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserDto, LoginDto, ResendVerificationDto } from '../user/users.dto';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from './../user/users.entity';
import { UserRole, UserStatus, AuthProvider } from './../user/users.entity';
import { normalizeEmail, validateEmail } from './../utils/auth.utils';
import { assertEmailAvailableForRole } from '../user/user-email-availability.util';
import { verifyEmailAddress, validateHrContactEmail, validateStudentSchoolEmail, isAllowedStudentSchoolEmail } from './../utils/email-verification.util';
import { EmailService } from './../service/email.service';
import { LocalStorageService } from './../service/local-storage.service';
import { ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from '../user/users.dto';
import * as crypto from 'crypto';
import { OAuthAuthService } from './oauth-auth.service';
import {
  collectValidSingaporeNricFinCandidates,
  maskSingaporeNricFin,
  pickPreferredResolvedSingaporeNricFinCandidate,
  validateSingaporeNricFin,
  normalizeSingaporeNricFin,
  resolveSalesforceIdTypeByCardColorOrNationality,
  parseSingaporeNricDisplayName,
  SINGAPORE_NRIC_FIN_USER_MESSAGES,
} from './utils/singapore-nric-fin.util';
import {
  assertNricFinNotAlreadyRegistered,
  assignVerifiedNricFinToUser,
  canReuseUserForNricVerification,
  findUserByVerifiedNricFin,
} from './utils/nric-registration-guard.util';
import { LlmService } from '../llm/llm.service';
import { LlmProvider } from '../llm/llm.types';
import {
  EXPERIENCED_MEMBERSHIP_PATHWAY_RULE,
  EXPERIENCED_MEMBERSHIP_SYSTEM_PROMPT,
  STUDENT_MEMBERSHIP_PATHWAY_RULE,
  STUDENT_MEMBERSHIP_SYSTEM_PROMPT,
  STUDENT_CARD_IMAGE_SYSTEM_PROMPT,
  STUDENT_CARD_IMAGE_USER_PROMPT,
  ACCOUNTING_CERT_SYSTEM_PROMPT,
  ACCOUNTING_CERT_USER_PROMPT,
} from '../ai-prompts/membership-prompts';
import {
  buildNricSingleImageUserPrompt,
  NRIC_PAIR_IMAGE_SYSTEM_PROMPT,
  NRIC_PAIR_IMAGE_USER_PROMPT,
  NRIC_SINGLE_IMAGE_SYSTEM_PROMPT,
} from '../ai-prompts/nric-prompts';
import { CompanyEnrollmentService } from '../company-enrollment/company-enrollment.service';

interface ExtractedSingaporeIdentifier {
  identifier: string;
  candidates: string[];
  profile: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    cardColor: string;
    sex: string;
    address: string;
  };
  confidence: number | null;
  reason: string;
  rawResponse: string;
}

interface NricVerificationAttemptResult {
  frontExtracted: ExtractedSingaporeIdentifier;
  backExtracted: ExtractedSingaporeIdentifier;
  frontCandidateInputs: string[];
  backCandidateInputs: string[];
  frontValidCandidates: ReturnType<typeof collectValidSingaporeNricFinCandidates>;
  backValidCandidates: ReturnType<typeof collectValidSingaporeNricFinCandidates>;
  frontResolvedCandidate: ReturnType<typeof collectValidSingaporeNricFinCandidates>[number] | null;
  backResolvedCandidate: ReturnType<typeof collectValidSingaporeNricFinCandidates>[number] | null;
  matchingCandidate: ReturnType<typeof collectValidSingaporeNricFinCandidates>[number] | null;
}

interface StudentVerificationSession {
  schoolName: string;
  graduationDate: string;
  schoolEmail: string;
  pinHash: string;
  expiresAt: number;
  attempts: number;
}

interface StudentEligibilityAssessment {
  verified: boolean;
  score: number;
  status: 'eligible' | 'manual_review' | 'ineligible';
  reasons: string[];
  confidence: number | null;
  source: LlmProvider | 'heuristic';
}

interface StudentCardExtraction {
  isStudentCard: boolean;
  fullName: string;
  email: string;
  institution: string;
  studentId: string;
  confidence: number | null;
  reason: string;
}

interface StudentAcademicVerificationChecks {
  academicEmailValid: boolean;
  personalEmailValid: boolean | null;
  studentCardReadable: boolean;
  institutionVisible: boolean;
  cardEmailMatchesAcademic: boolean | null;
}

interface StudentAcademicVerificationResult extends StudentEligibilityAssessment {
  checks: StudentAcademicVerificationChecks;
  extracted?: {
    fullName: string;
    email: string;
    institution: string;
    studentId: string;
  };
  cardImageUrl?: string | null;
  emailVerificationSent?: boolean;
  pendingEmailVerification?: boolean;
  draftUserId?: string | null;
}

const QUESTIONNAIRE_ACADEMIC_EMAIL_SUFFIXES = [
  'nus.edu',
  'ntu.edu.sg',
  'smu.edu.sg',
  'sit.singaporetech.edu.sg',
  'sp.edu.sg',
  'np.edu.sg',
  'nyp.edu.sg',
  'tp.edu.sg',
  'rp.edu.sg',
  'isca.org.sg',
  'gmail.com',

];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly studentVerificationSessions = new Map<string, StudentVerificationSession>();

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private readonly JwtService: JwtService, // Inject JwtService
    private readonly emailService: EmailService,
    private readonly oauthAuthService: OAuthAuthService,
    private readonly llmService: LlmService,
    private readonly localStorageService: LocalStorageService,
    private readonly companyEnrollmentService: CompanyEnrollmentService,
  ) { }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private hashSignupAccessToken(token: string): string {
    return crypto.createHash('sha256').update(String(token || '').trim()).digest('hex');
  }

  private cleanupExpiredStudentVerificationSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.studentVerificationSessions.entries()) {
      if (!session || session.expiresAt <= now) {
        this.studentVerificationSessions.delete(token);
      }
    }
  }

  private normalizeStudentSchoolEmail(email: string): string {
    return String(email || '').trim().toLowerCase();
  }

  private isBasicEmailFormat(email: string): boolean {
    return /^(?!\.)(?!.*\.\.)([a-z0-9._%+-]{1,64})@([a-z0-9-]+\.)+[a-z]{2,}$/i.test(String(email || '').trim());
  }

  private shouldLogStudentVerificationPin(): boolean {
    const explicit = String(process.env.STUDENT_VERIFICATION_LOG_PIN || '').trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(explicit)) {
      return true;
    }

    return String(process.env.NODE_ENV || '').trim().toLowerCase() !== 'production';
  }

  private hashStudentVerificationPin(verificationToken: string, pin: string): string {
    const secret = String(process.env.JWT_SECRET || 'student-verification-secret').trim() || 'student-verification-secret';
    return crypto
      .createHmac('sha256', secret)
      .update(`${String(verificationToken || '').trim()}:${String(pin || '').trim()}`)
      .digest('hex');
  }

  private validateStudentVerificationInput(input: {
    schoolName?: string;
    graduationDate?: string;
    schoolEmail?: string;
  }) {
    const schoolName = String(input?.schoolName || '').trim();
    const graduationDate = String(input?.graduationDate || '').trim();
    const schoolEmail = this.normalizeStudentSchoolEmail(input?.schoolEmail || '');

    if (!schoolName || !graduationDate || !schoolEmail) {
      throw new BadRequestException('Please fill school name, graduation date, and school email first.');
    }

    if (!this.isBasicEmailFormat(schoolEmail)) {
      throw new BadRequestException('Please enter a valid school email address.');
    }

    if (!isAllowedStudentSchoolEmail(schoolEmail)) {
      throw new BadRequestException(
        'School email must use a supported academic domain (e.g. .edu) or @isca.org.sg.',
      );
    }

    return { schoolName, graduationDate, schoolEmail };
  }

  private getStudentAiMaxTokens(): number {
    const configured = Number(process.env.AI_STUDENT_MAX_TOKENS ?? process.env.OPENROUTER_STUDENT_MAX_TOKENS ?? '300');
    if (!Number.isFinite(configured)) return 300;
    return Math.min(1024, Math.max(128, Math.round(configured)));
  }

  private getStudentEligibilityHeuristicAssessment(input: {
    schoolName: string;
    graduationDate: string;
    schoolEmail: string;
  }): StudentEligibilityAssessment {
    const schoolName = this.sanitizeExtractedTextField(input.schoolName);
    const schoolEmail = this.normalizeStudentSchoolEmail(input.schoolEmail);
    const graduationDate = this.sanitizeExtractedTextField(input.graduationDate);
    const reasons: string[] = [];
    let score = 0;

    const hasInstitutionKeyword = /(university|college|polytechnic|institute|academy|school)/i.test(schoolName);
    if (hasInstitutionKeyword) {
      score += 30;
      reasons.push('School name matches a recognised education institution pattern.');
    } else if (schoolName.length >= 8) {
      score += 22;
      reasons.push('School name looks complete enough for review.');
    } else {
      score += 10;
      reasons.push('School name looks too limited, which lowers confidence.');
    }

    if (schoolEmail.endsWith('.edu')) {
      score += 30;
      reasons.push('Email uses an education domain, which improves confidence.');
    } else if (schoolEmail.endsWith('@isca.org.sg') || schoolEmail.includes('.isca.org.sg')) {
      score += 20;
      reasons.push('Email uses an ISCA organisation domain.');
    }

    const graduationTime = Date.parse(graduationDate);
    if (Number.isFinite(graduationTime)) {
      const now = Date.now();
      const sixMonthsAgo = now - (1000 * 60 * 60 * 24 * 30 * 6);
      const eightYearsAhead = now + (1000 * 60 * 60 * 24 * 365 * 8);
      if (graduationTime >= sixMonthsAgo && graduationTime <= eightYearsAhead) {
        score += 25;
        reasons.push('Graduation date falls in a believable student timeline.');
      } else {
        score += 8;
        reasons.push('Graduation date is outside the usual student range.');
      }
    } else {
      reasons.push('Graduation date could not be validated clearly.');
    }

    if (hasInstitutionKeyword && schoolEmail.endsWith('.edu')) {
      score += 15;
      reasons.push('School name and email domain are consistent with an academic profile.');
    }

    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    const status =
      normalizedScore >= 70 ? 'eligible' : normalizedScore >= 50 ? 'manual_review' : 'ineligible';

    return {
      verified: status === 'eligible',
      score: normalizedScore,
      status,
      reasons: reasons.slice(0, 4),
      confidence: null,
      source: 'heuristic',
    };
  }

  private parseStudentEligibilityAiResponse(
    rawResponse: string,
    source: LlmProvider = this.llmService.getActiveProvider(),
  ): StudentEligibilityAssessment {
    const trimmed = String(rawResponse || '').trim();
    const withoutFence = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');
    const jsonCandidate =
      firstBrace >= 0 && lastBrace > firstBrace
        ? withoutFence.slice(firstBrace, lastBrace + 1)
        : withoutFence;

    const parsed = JSON.parse(jsonCandidate) as {
      score?: number | string;
      status?: string;
      reasons?: unknown;
      confidence?: number | string;
    };

    const parsedScore = Number(parsed.score);
    const normalizedScore = Number.isFinite(parsedScore) ? Math.max(0, Math.min(100, Math.round(parsedScore))) : 0;
    const rawStatus = String(parsed.status || '').trim().toLowerCase();
    const status: StudentEligibilityAssessment['status'] =
      rawStatus === 'eligible' || rawStatus === 'manual_review' || rawStatus === 'ineligible'
        ? rawStatus
        : normalizedScore >= 70
          ? 'eligible'
          : normalizedScore >= 50
            ? 'manual_review'
            : 'ineligible';
    const reasons = Array.isArray(parsed.reasons)
      ? parsed.reasons.map((reason) => this.sanitizeExtractedTextField(reason)).filter(Boolean).slice(0, 5)
      : [];
    const parsedConfidence = Number(parsed.confidence);

    return {
      verified: status === 'eligible',
      score: normalizedScore,
      status,
      reasons,
      confidence: Number.isFinite(parsedConfidence) ? parsedConfidence : null,
      source,
    };
  }

  private async assessStudentEligibilityWithOpenRouter(input: {
    schoolName: string;
    graduationDate: string;
    schoolEmail: string;
  }): Promise<StudentEligibilityAssessment> {
    if (!this.llmService.isConfigured()) {
      throw new BadRequestException(this.llmService.getConfigurationErrorMessage());
    }

    try {
      const result = await this.llmService.chat({
        useCase: 'student',
        temperature: 0,
        maxTokens: this.getStudentAiMaxTokens(),
        messages: [
          {
            role: 'system',
            content: STUDENT_MEMBERSHIP_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: JSON.stringify({
              schoolName: input.schoolName,
              graduationDate: input.graduationDate,
              schoolEmail: input.schoolEmail,
              rule: STUDENT_MEMBERSHIP_PATHWAY_RULE,
            }),
          },
        ],
      });

      return this.parseStudentEligibilityAiResponse(result.text, result.provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI eligibility check failed.';
      throw new BadRequestException(message);
    }
  }

  private getMinimumNricConfidence(): number {
    const configured = Number(process.env.NRIC_MIN_AI_CONFIDENCE ?? '0.85');
    if (!Number.isFinite(configured)) return 0.85;
    return Math.min(1, Math.max(0, configured));
  }

  private getNricOpenRouterMaxTokens(): number {
    const configured = Number(process.env.AI_NRIC_MAX_TOKENS ?? process.env.OPENROUTER_NRIC_MAX_TOKENS ?? '400');
    if (!Number.isFinite(configured)) return 400;
    return Math.min(2048, Math.max(128, Math.round(configured)));
  }

  private isExternalNricAiAllowed(): boolean {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    const raw = String(process.env.NRIC_ALLOW_EXTERNAL_AI || '').trim().toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  }

  private shouldLogNricDebugDetails(): boolean {
    const configured = String(process.env.NRIC_DEBUG_LOGS || '').trim().toLowerCase();
    if (configured === '1' || configured === 'true' || configured === 'yes') {
      return true;
    }
    if (configured === '0' || configured === 'false' || configured === 'no') {
      return false;
    }
    return process.env.NODE_ENV !== 'production';
  }

  private maskNricCandidateForLog(candidate: string): string {
    const normalized = normalizeSingaporeNricFin(candidate);
    if (!normalized) return '(empty)';
    if (normalized.length === 9) {
      return maskSingaporeNricFin(normalized);
    }
    if (normalized.length === 8) {
      return `${normalized[0]}****${normalized.slice(-3)}`;
    }
    if (normalized.length <= 4) {
      return normalized;
    }
    return `${normalized[0]}****${normalized.slice(-Math.min(3, normalized.length - 1))}`;
  }

  private formatResolvedCandidateForLog(
    candidate: ReturnType<typeof collectValidSingaporeNricFinCandidates>[number] | null,
  ) {
    if (!candidate) return null;

    return {
      raw: this.maskNricCandidateForLog(candidate.rawNormalized),
      normalized: this.maskNricCandidateForLog(candidate.normalized),
      correctedByChecksum: candidate.correctedByChecksum,
    };
  }

  private logNricVerificationAttempt(stage: string, attempt: NricVerificationAttemptResult): void {
    if (!this.shouldLogNricDebugDetails()) {
      return;
    }

    console.info('[NRIC] Candidate debug | stage=', stage, {
      frontInputs: attempt.frontCandidateInputs.map((candidate) => this.maskNricCandidateForLog(candidate)),
      backInputs: attempt.backCandidateInputs.map((candidate) => this.maskNricCandidateForLog(candidate)),
      frontResolved: this.formatResolvedCandidateForLog(attempt.frontResolvedCandidate),
      backResolved: this.formatResolvedCandidateForLog(attempt.backResolvedCandidate),
      matching: this.formatResolvedCandidateForLog(attempt.matchingCandidate),
    });
  }

  private getManualReviewReason(frontExtracted: ExtractedSingaporeIdentifier, backExtracted: ExtractedSingaporeIdentifier): string | null {
    const minimumConfidence = this.getMinimumNricConfidence();
    const frontConfidence = typeof frontExtracted.confidence === 'number' ? frontExtracted.confidence : null;
    const backConfidence = typeof backExtracted.confidence === 'number' ? backExtracted.confidence : null;

    if (
      (frontConfidence !== null && frontConfidence < minimumConfidence)
      || (backConfidence !== null && backConfidence < minimumConfidence)
    ) {
      return 'Automatic NRIC verification confidence is too low for secure approval. Manual review is required.';
    }

    if (!this.sanitizeExtractedTextField(frontExtracted.profile.fullName)) {
      return 'Automatic NRIC verification could not confirm the full name clearly. Manual review is required.';
    }

    if (!this.sanitizeExtractedTextField(frontExtracted.profile.dateOfBirth)) {
      return 'Automatic NRIC verification could not confirm the date of birth clearly. Manual review is required.';
    }

    return null;
  }

  private async issueVerifiedSignupAccessToken(user: UserEntity) {
    const signupAccessToken = crypto.randomBytes(32).toString('hex');
    user.signupAccessTokenHash = this.hashSignupAccessToken(signupAccessToken);
    user.signupAccessTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await this.userRepository.save(user);

    return {
      signupAccessToken,
      signupAccessTokenExpiresAt: user.signupAccessTokenExpiresAt,
    };
  }

  private async resolveUserByVerifiedSignupAccessToken(token?: string) {
    const trimmedToken = String(token || '').trim();
    if (!trimmedToken) {
      throw new UnauthorizedException('Verified signup access token is required.');
    }

    const user = await this.userRepository.findOne({
      where: { signupAccessTokenHash: this.hashSignupAccessToken(trimmedToken) },
    });

    if (!user || !user.signupAccessTokenExpiresAt) {
      throw new UnauthorizedException('Verified signup access is invalid. Please run NRIC verification again.');
    }

    if (user.signupAccessTokenExpiresAt.getTime() < Date.now()) {
      user.signupAccessTokenHash = null;
      user.signupAccessTokenExpiresAt = null;
      await this.userRepository.save(user);
      throw new UnauthorizedException('Verified signup access has expired. Please run NRIC verification again.');
    }

    return user;
  }

  private async validateSignupInput(userDto: UserDto, existingUserId?: string) {
    const normalizedUsername = this.normalizeUsername(userDto.username || '');
    if (!normalizedUsername) {
      throw new BadRequestException('Username is required');
    }
    if (!/^(?=.*[a-z])(?=.*\d)[a-z0-9]+$/i.test(normalizedUsername)) {
      throw new BadRequestException(
        'Username must contain both letters and numbers, and no special characters.'
      );
    }
    if (!userDto.firstname) {
      throw new BadRequestException('Firstname is required');
    }
    if (!userDto.lastname) {
      throw new BadRequestException('Lastname is required');
    }
    if (!userDto.email) {
      throw new BadRequestException('Email is required');
    }

    const emailVerification = await verifyEmailAddress(userDto.email);
    if (!emailVerification.isValid) {
      throw new BadRequestException(
        emailVerification.reason || 'Please provide a valid real email address.'
      );
    }
    if (!userDto.password) {
      throw new BadRequestException('Password is required');
    }

    const normalizedEmail = normalizeEmail(userDto.email) || String(userDto.email || '').trim().toLowerCase();
    const signupRole = userDto.role || UserRole.User;

    // Same email: allow 1 User + 1 Corporate; reject duplicate role / third account.
    await assertEmailAvailableForRole(this.userRepository, normalizedEmail, signupRole, {
      excludeUserId: existingUserId,
    });

    // Also block if the email is already registered in Salesforce eServices.
    await this.assertEmailAvailableInSalesforce(normalizedEmail);

    const existingUserByUsername = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) = LOWER(:username)', { username: normalizedUsername })
      .getOne();

    if (existingUserByUsername && existingUserByUsername.id !== existingUserId) {
      throw new BadRequestException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(userDto.password, 10);

    return {
      normalizedUsername,
      hashedPassword,
    };
  }

  /**
   * Reject signup when Salesforce eServices already has this email
   * (user should sign in via SSO instead of creating a duplicate account).
   */
  private async assertEmailAvailableInSalesforce(email: string): Promise<void> {
    const normalized = normalizeEmail(email) || String(email || '').trim().toLowerCase();
    if (!normalized) {
      return;
    }

    try {
      await this.oauthAuthService.assertEmailAvailableForIndividualMembershipCreate(normalized);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Could not verify email with eServices. Please try again.';
      throw new BadRequestException(message);
    }
  }

  /** Used by membership checkout to block payment when Salesforce will reject the email. */
  async assertMembershipEmailReadyForPayment(email: string): Promise<void> {
    await this.assertEmailAvailableInSalesforce(email);
  }

  private sanitizeEligibilitySnapshot(snapshot: Record<string, unknown> | undefined): Record<string, unknown> | null {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readEligibilityBoolean(
    explicitValue: boolean | undefined,
    snapshot: Record<string, unknown> | null,
    key: string,
  ): boolean | null {
    if (typeof explicitValue === 'boolean') {
      return explicitValue;
    }

    const snapshotValue = snapshot?.[key];
    return typeof snapshotValue === 'boolean' ? snapshotValue : null;
  }

  private readEligibilityType(
    explicitValue: string | undefined,
    snapshot: Record<string, unknown> | null,
  ): string | null {
    const candidate = typeof explicitValue === 'string'
      ? explicitValue
      : typeof snapshot?.eligibilityType === 'string'
        ? String(snapshot.eligibilityType)
        : '';

    const normalized = candidate.trim();
    return normalized || null;
  }

  private resolveSalesforceMembershipEligibilityType(dto: {
    eligibilityType?: string;
    eligibilitySnapshot?: Record<string, unknown>;
  }): string {
    const explicit = String(dto.eligibilityType || '').trim();
    if (explicit) return explicit;

    const snapshot = dto.eligibilitySnapshot || {};
    const fromSnapshot = String(snapshot.eligibilityType || '').trim();
    if (fromSnapshot) return fromSnapshot;

    if (
      snapshot.spPrVerified === true
      || String(snapshot.verifiedNricFin || '').trim()
      || (snapshot.nricAudit && typeof snapshot.nricAudit === 'object')
    ) {
      return 'fee-waiver-nric';
    }

    if (
      snapshot.companyRegistrationUnderCompany === true
      && snapshot.companyReferenceConfirmed === true
    ) {
      return 'corporate-isca-partner';
    }

    return 'student';
  }

  private applyEligibilityTracking(user: UserEntity, userDto: UserDto) {
    const snapshot = this.sanitizeEligibilitySnapshot(userDto.eligibilitySnapshot);
    const eligibilityIsSingaporePr = this.readEligibilityBoolean(
      userDto.eligibilityIsSingaporePr,
      snapshot,
      'isSingaporePr',
    );
    const eligibilityIsIscaMember = this.readEligibilityBoolean(
      userDto.eligibilityIsIscaMember,
      snapshot,
      'isIscaMember',
    );
    const eligibilityWantsMembership = this.readEligibilityBoolean(
      userDto.eligibilityWantsMembership,
      snapshot,
      'wantsIscaMembership',
    );
    const eligibilityType = this.readEligibilityType(userDto.eligibilityType, snapshot);

    const hasEligibilityPayload = [
      eligibilityIsSingaporePr !== null,
      eligibilityIsIscaMember !== null,
      eligibilityWantsMembership !== null,
      Boolean(eligibilityType),
      Boolean(snapshot),
    ].some(Boolean);

    if (!hasEligibilityPayload) {
      return;
    }

    user.eligibilityIsSingaporePr = eligibilityIsSingaporePr;
    user.eligibilityIsIscaMember = eligibilityIsIscaMember;
    user.eligibilityWantsMembership = eligibilityWantsMembership;
    user.eligibilityType = eligibilityType;
    user.eligibilitySnapshot = snapshot ?? {
      isSingaporePr: eligibilityIsSingaporePr,
      isIscaMember: eligibilityIsIscaMember,
      wantsIscaMembership: eligibilityWantsMembership,
      eligibilityType,
    };
    user.eligibilityCheckedAt = new Date();
  }

  private async resolveExistingSignupDraft(userDto: UserDto) {
    const verifiedSignupUser = userDto.signupAccessToken
      ? await this.resolveUserByVerifiedSignupAccessToken(userDto.signupAccessToken)
      : null;

    if (verifiedSignupUser) {
      if (!verifiedSignupUser.isDraft) {
        throw new BadRequestException('This verified signup link has already been used.');
      }
      return verifiedSignupUser;
    }

    const draftUserId = String(userDto.draftUserId || '').trim();
    if (draftUserId) {
      const existingDraft = await this.userRepository.findOne({ where: { id: draftUserId } });
      if (existingDraft?.isDraft) {
        return existingDraft;
      }
    }

    // Fall back: match existing draft by NRIC so repeat attempts update instead of creating duplicates
    const snapshot = userDto.eligibilitySnapshot;
    if (snapshot && typeof snapshot === 'object') {
      const nricFin = String(
        (snapshot.verifiedNricFin as string)
        || ((snapshot.nricAudit as Record<string, unknown>)?.identifier as string)
        || '',
      ).trim();
      if (nricFin) {
        const byNric = await findUserByVerifiedNricFin(this.userRepository, nricFin);
        if (byNric?.isDraft) {
          return byNric;
        }
      }
    }

    return null;
  }

  async saveMembershipSignupDraft(userDto: UserDto): Promise<{ message: string; draftUserId: string; user: UserEntity }> {
    try {
      const existingDraft = await this.resolveExistingSignupDraft(userDto);
      const { normalizedUsername, hashedPassword } = await this.validateSignupInput(userDto, existingDraft?.id);
      const resolvedCompanyCode = this.resolveSignupCompanyCode(userDto);

      let draftUser: UserEntity;

      if (existingDraft) {
        existingDraft.username = normalizedUsername;
        existingDraft.firstname = userDto.firstname;
        existingDraft.lastname = userDto.lastname;
        existingDraft.email = userDto.email;
        existingDraft.contactNumber = userDto.contactNumber?.trim() || null;
        existingDraft.companyCode = resolvedCompanyCode;
        existingDraft.persona = userDto.persona?.trim() || existingDraft.persona || null;
        existingDraft.password = hashedPassword;
        existingDraft.authProvider = AuthProvider.LOCAL;
        existingDraft.role = userDto.role || existingDraft.role || UserRole.User;
        existingDraft.status = userDto.status || existingDraft.status || UserStatus.Active;
        existingDraft.isVerified = false;
        existingDraft.isDraft = true;
        existingDraft.verificationToken = null;
        existingDraft.verificationTokenExpires = null;
        this.applyEligibilityTracking(existingDraft, userDto);
        draftUser = existingDraft;
      } else {
        draftUser = this.userRepository.create({
          username: normalizedUsername,
          firstname: userDto.firstname,
          lastname: userDto.lastname,
          email: userDto.email,
          contactNumber: userDto.contactNumber?.trim() || null,
          companyCode: resolvedCompanyCode,
          persona: userDto.persona?.trim() || null,
          password: hashedPassword,
          authProvider: AuthProvider.LOCAL,
          role: userDto.role || UserRole.User,
          status: userDto.status || UserStatus.Active,
          isVerified: false,
          isDraft: true,
          verificationToken: null,
          verificationTokenExpires: null,
        });
        this.applyEligibilityTracking(draftUser, userDto);
      }

      await this.userRepository.save(draftUser);

      return {
        message: 'Membership signup draft saved successfully.',
        draftUserId: draftUser.id,
        user: draftUser,
      };
    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  /**
   * Persist student (and other) membership eligibility after Salesforce account + password setup.
   * No local password — user signs in via Salesforce SSO next.
   */
  async saveSalesforceMembershipRecord(dto: {
    email: string;
    firstname: string;
    lastname: string;
    salesforceUsername: string;
    salutation?: string;
    nameAsPerId?: string;
    draftUserId?: string;
    membershipOutcome?: string;
    eligibilityIsSingaporePr?: boolean;
    eligibilityIsIscaMember?: boolean;
    eligibilityWantsMembership?: boolean;
    eligibilityType?: string;
    eligibilitySnapshot?: Record<string, unknown>;
  }): Promise<{ message: string; userId: string; user: UserEntity }> {
    const email = normalizeEmail(dto.email);
    if (!email) {
      throw new BadRequestException('A valid email is required.');
    }

    const emailVerification = await verifyEmailAddress(email);
    if (!emailVerification.isValid) {
      throw new BadRequestException(
        emailVerification.reason || 'Please provide a valid real email address.',
      );
    }

    const firstname = dto.firstname?.trim() || 'User';
    const lastname = dto.lastname?.trim() || email.split('@')[0];
    const salesforceUsername = dto.salesforceUsername?.trim();
    if (!salesforceUsername) {
      throw new BadRequestException('Salesforce username is required.');
    }

    const draftUserId = String(dto.draftUserId || '').trim();
    let user: UserEntity | null = null;

    if (draftUserId) {
      user = await this.userRepository.findOne({ where: { id: draftUserId } });
      if (user && !user.isDraft) {
        throw new BadRequestException('This membership record is already completed. Please sign in.');
      }
    }

    if (!user) {
      user = await this.userRepository.findOne({ where: { email } });
    }

    if (user && !user.isDraft && user.authProvider === AuthProvider.LOCAL && user.password) {
      throw new BadRequestException('Email already registered with a local account. Please sign in.');
    }

    const resolvedEligibilityType = this.resolveSalesforceMembershipEligibilityType(dto);

    const snapshot = this.sanitizeEligibilitySnapshot({
      ...(dto.eligibilitySnapshot || {}),
      eligibilityType: resolvedEligibilityType,
      membershipOutcome: dto.membershipOutcome || dto.eligibilitySnapshot?.membershipOutcome || '',
      salesforceUsername,
      salutation: dto.salutation || null,
      nameAsPerId: dto.nameAsPerId || null,
      salesforceMembershipCompletedAt: new Date().toISOString(),
      ...(typeof dto.eligibilitySnapshot?.studentMembershipOptIn === 'boolean'
        ? { studentMembershipOptIn: dto.eligibilitySnapshot.studentMembershipOptIn }
        : resolvedEligibilityType === 'student'
          ? { studentMembershipOptIn: true }
          : {}),
    });

    const trackingDto = {
      username: '',
      firstname,
      lastname,
      email,
      password: '',
      eligibilityIsSingaporePr: dto.eligibilityIsSingaporePr,
      eligibilityIsIscaMember: dto.eligibilityIsIscaMember,
      eligibilityWantsMembership: dto.eligibilityWantsMembership,
      eligibilityType: resolvedEligibilityType,
      eligibilitySnapshot: snapshot || undefined,
    } as UserDto;

    const resolvedCompanyCode = this.resolveSignupCompanyCode({
      ...trackingDto,
      companyCode: String(
        (snapshot as Record<string, unknown> | null)?.companyReferenceId
        || (snapshot as Record<string, unknown> | null)?.companyCode
        || '',
      ).trim() || null,
      eligibilitySnapshot: snapshot || undefined,
    } as UserDto);

    // Company QR enrollment: reserve seat before saving the OAuth membership record.
    if (this.resolveSignupViaQr({ eligibilitySnapshot: snapshot || undefined } as UserDto)) {
      await this.consumeCompanyEnrollmentSeatIfNeeded(
        {
          ...trackingDto,
          companyCode: resolvedCompanyCode,
          eligibilitySnapshot: snapshot || undefined,
        } as UserDto,
        resolvedCompanyCode,
      );
    }

    if (user) {
      const username = user.username || (await this.buildDraftUsername(firstname, lastname));
      if (!username) {
        throw new BadRequestException('Could not generate a valid username.');
      }
      user.username = username;
      user.firstname = firstname;
      user.lastname = lastname;
      user.email = email;
      user.companyCode = resolvedCompanyCode;
      user.authProvider = AuthProvider.OAUTH;
      user.password = null;
      user.isDraft = false;
      user.isVerified = false;
      user.salesforceUsername = salesforceUsername;
      user.salesforceSyncedAt = new Date();
      this.applyEligibilityTracking(user, trackingDto);
    } else {
      const username = await this.buildDraftUsername(firstname, lastname);
      if (!username) {
        throw new BadRequestException('Could not generate a valid username.');
      }
      user = this.userRepository.create({
        username,
        firstname,
        lastname,
        email,
        companyCode: resolvedCompanyCode,
        password: null,
        authProvider: AuthProvider.OAUTH,
        role: UserRole.User,
        status: UserStatus.Active,
        isVerified: false,
        isDraft: false,
        salesforceUsername,
        salesforceSyncedAt: new Date(),
      });
      this.applyEligibilityTracking(user, trackingDto);
    }

    await this.userRepository.save(user);

    console.log('[Membership] Salesforce membership record saved:', {
      userId: user.id,
      email: user.email,
      eligibilityType: user.eligibilityType,
      salesforceUsername: user.salesforceUsername,
      companyCode: user.companyCode,
    });

    return {
      message: 'Membership record saved successfully.',
      userId: user.id,
      user,
    };
  }

  async resolveMembershipSignupDraftForPayment(draftUserId?: string, signupAccessToken?: string) {
    const user = await this.resolveExistingSignupDraft({
      username: '',
      firstname: '',
      lastname: '',
      email: '',
      password: '',
      draftUserId,
      signupAccessToken,
    } as UserDto);

    if (!user) {
      throw new BadRequestException('Membership signup draft was not found. Please fill the form again.');
    }

    if (!user.isDraft) {
      throw new BadRequestException('This membership signup is already completed. Please sign in.');
    }

    if (!user.username || !user.firstname || !user.lastname || !user.email || !user.password) {
      throw new BadRequestException('Please complete your signup details before continuing to payment.');
    }

    return user;
  }

  async completeMembershipSignupAfterPayment(userId: string) {
    const draftUser = await this.userRepository.findOne({ where: { id: userId } });

    if (!draftUser) {
      throw new NotFoundException('Membership signup draft was not found.');
    }

    if (!draftUser.isDraft) {
      return {
        message: 'Membership signup has already been completed.',
        user: draftUser,
        alreadyCompleted: true,
      };
    }

    if (!draftUser.username || !draftUser.firstname || !draftUser.lastname || !draftUser.email || !draftUser.password) {
      throw new BadRequestException('Membership signup draft is incomplete. Please return to the signup page and try again.');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    draftUser.role = draftUser.role || UserRole.User;
    draftUser.status = draftUser.status || UserStatus.Active;
    draftUser.isVerified = false;
    draftUser.isDraft = false;
    draftUser.authProvider = AuthProvider.OAUTH;
    draftUser.verificationToken = verificationToken;
    draftUser.verificationTokenExpires = verificationTokenExpires;
    draftUser.signupAccessTokenHash = null;
    draftUser.signupAccessTokenExpiresAt = null;

    await this.userRepository.save(draftUser);

    const userName = `${draftUser.firstname} ${draftUser.lastname}`.trim();
    try {
      await this.emailService.sendVerificationEmail(draftUser.email, verificationToken, userName);
    } catch (emailError) {
      console.error('Failed to send verification email after payment:', emailError);
    }

    return {
      message: 'Membership payment confirmed. Account finalized after successful payment.',
      user: draftUser,
      alreadyCompleted: false,
    };
  }

  /**
   * Hard-delete an unpaid membership signup draft.
   * Government-grade: no real account remains when payment is canceled or fails.
   */
  async abandonMembershipSignupDraft(draftUserId: string): Promise<{
    abandoned: boolean;
    reason?: string;
  }> {
    const id = String(draftUserId || '').trim();
    if (!id) {
      throw new BadRequestException('draftUserId is required.');
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      return { abandoned: true, reason: 'already_absent' };
    }

    if (!user.isDraft) {
      throw new BadRequestException(
        'Cannot abandon a completed membership account. Payment was already confirmed.',
      );
    }

    await this.userRepository.remove(user);
    console.info('[Auth] Membership signup draft abandoned (deleted) | draftUserId=', id);
    return { abandoned: true, reason: 'deleted' };
  }

  private getNricImageSignature(buffer?: Buffer): 'jpeg' | 'png' | 'webp' | null {
    if (!buffer || buffer.length < 12) return null;

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'jpeg';
    }

    if (
      buffer[0] === 0x89
      && buffer[1] === 0x50
      && buffer[2] === 0x4e
      && buffer[3] === 0x47
      && buffer[4] === 0x0d
      && buffer[5] === 0x0a
      && buffer[6] === 0x1a
      && buffer[7] === 0x0a
    ) {
      return 'png';
    }

    if (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return 'webp';
    }

    return null;
  }

  private validateStudentCardImage(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Please upload your student card image.');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('The student card image is empty.');
    }

    const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG or WEBP image files are allowed.');
    }

    const detectedSignature = this.getNricImageSignature(file.buffer);
    if (!detectedSignature) {
      throw new BadRequestException('The student card image is not a valid JPG, PNG or WEBP file.');
    }

    return file;
  }

  private validateNricImage(file: Express.Multer.File | undefined, side: 'front' | 'back') {
    if (!file) {
      throw new BadRequestException(`Please upload the NRIC ${side} image.`);
    }

    if (!file.buffer?.length) {
      throw new BadRequestException(`The NRIC ${side} image is empty.`);
    }

    const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG or WEBP image files are allowed.');
    }

    const detectedSignature = this.getNricImageSignature(file.buffer);
    if (!detectedSignature) {
      throw new BadRequestException(`The NRIC ${side} image is not a valid JPG, PNG or WEBP file.`);
    }

    const mimeTypeMatchesSignature = (
      (detectedSignature === 'jpeg' && ['image/jpeg', 'image/jpg'].includes(file.mimetype))
      || (detectedSignature === 'png' && file.mimetype === 'image/png')
      || (detectedSignature === 'webp' && file.mimetype === 'image/webp')
    );

    if (!mimeTypeMatchesSignature) {
      throw new BadRequestException(`The NRIC ${side} image file content does not match its file type.`);
    }

    return {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      detectedType: detectedSignature,
    };
  }

  /**
   * Converts a Multer file buffer into a data URL that can be passed to a vision-capable LLM.
   */
  private buildDataUrl(file: Express.Multer.File): string {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }

  private normalizeExtractedDocumentField(value: string): string {
    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Normalizes extracted OCR fields into clean strings safe for storage and API responses.
   */
  private sanitizeExtractedTextField(value: unknown, separator = ' '): string {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.sanitizeExtractedTextField(item, separator))
        .filter(Boolean)
        .join(separator)
        .trim();
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value).replace(/\s+/g, ' ').trim();
    }

    return '';
  }

  /**
   * Normalizes manual or OCR date-of-birth values into ISO `YYYY-MM-DD` for storage.
   */
  private normalizeDateOfBirthForStorage(value: unknown): string {
    const trimmed = this.sanitizeExtractedTextField(value);
    if (!trimmed) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return this.isValidIsoDateString(trimmed) ? trimmed : '';
    }

    const dmyMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (dmyMatch) {
      const iso = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
      return this.isValidIsoDateString(iso) ? iso : '';
    }

    const mdyMatch = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
    if (mdyMatch) {
      const parsed = new Date(`${mdyMatch[1]} ${mdyMatch[2]}, ${mdyMatch[3]}`);
      if (!Number.isNaN(parsed.getTime())) {
        const iso = this.formatDatePartsToIso(
          parsed.getFullYear(),
          parsed.getMonth() + 1,
          parsed.getDate(),
        );
        return this.isValidIsoDateString(iso) ? iso : '';
      }
    }

    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      const date = new Date(parsed);
      const iso = this.formatDatePartsToIso(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      );
      return this.isValidIsoDateString(iso) ? iso : '';
    }

    return '';
  }

  private formatDatePartsToIso(year: number, month: number, day: number): string {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private isValidIsoDateString(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const [year, month, day] = value.split('-').map((part) => Number(part));
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;

    const candidate = new Date(year, month - 1, day);
    return (
      candidate.getFullYear() === year
      && candidate.getMonth() === month - 1
      && candidate.getDate() === day
    );
  }

  private assertValidManualDateOfBirth(value: unknown): string {
    const normalized = this.normalizeDateOfBirthForStorage(value);
    if (!normalized) {
      throw new BadRequestException('Date of birth must be a valid date.');
    }

    const [year, month, day] = normalized.split('-').map((part) => Number(part));
    const dob = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dob.getTime() > today.getTime()) {
      throw new BadRequestException('Date of birth cannot be in the future.');
    }

    const earliest = new Date(today);
    earliest.setFullYear(earliest.getFullYear() - 120);
    if (dob.getTime() < earliest.getTime()) {
      throw new BadRequestException('Date of birth is outside the allowed range.');
    }

    return normalized;
  }

  /**
   * Normalizes OCR address blocks while preserving readable separators.
   */
  private sanitizeExtractedAddressField(value: unknown): string {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.sanitizeExtractedTextField(item, ', '))
        .filter(Boolean)
        .join(', ')
        .replace(/\s*,\s*/g, ', ')
        .trim();
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value)
        .replace(/\r?\n+/g, ', ')
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return '';
  }

  /**
   * Splits an OCR full name into first/last values without inventing fake names.
   * Singapore NRIC prints surname first, then given name(s).
   */
  private buildDraftName(fullName: string): { firstname: string; lastname: string } {
    const parsed = parseSingaporeNricDisplayName(this.sanitizeExtractedTextField(fullName));
    return { firstname: parsed.firstname, lastname: parsed.lastname };
  }

  /**
   * Builds a username from real extracted first/last name parts.
   */
  private async buildDraftUsername(firstname: string, lastname: string): Promise<string | null> {
    let rawBaseUsername = this
      .normalizeUsername(`${firstname}${lastname}`.replace(/[^a-zA-Z0-9]/g, ''))
      .slice(0, 40);

    if (!rawBaseUsername) {
      return null;
    }

    if (!/\d/.test(rawBaseUsername)) {
      rawBaseUsername = `${rawBaseUsername}01`.slice(0, 40);
    }

    let candidate = rawBaseUsername;
    let suffix = 1;

    while (true) {
      const existingUser = await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.username) = LOWER(:username)', { username: candidate })
        .getOne();

      if (!existingUser) {
        return candidate;
      }

      suffix += 1;
      const suffixText = String(suffix);
      const trimmedBase = rawBaseUsername.slice(0, Math.max(1, 40 - suffixText.length));
      candidate = `${trimmedBase}${suffixText}`;
    }
  }

  /**
   * Extracts the first likely Singapore NRIC/FIN candidate from plain text.
   */
  private extractSingaporeIdentifierCandidate(rawText: string): string {
    const matches = String(rawText || '')
      .match(/[STFGM567][A-Z0-9\s-]{6,20}[A-Z0-9]?/gi) || [];

    for (const candidate of matches) {
      const candidateWindows = this.expandPossibleIdentifierWindows(candidate);
      if (candidateWindows.length > 0) {
        return candidateWindows[0];
      }
    }

    return '';
  }

  private expandPossibleIdentifierWindows(candidate: string): string[] {
    const normalized = normalizeSingaporeNricFin(candidate);
    if (!normalized) return [];

    const windows = new Set<string>();
    if (normalized.length === 8 || normalized.length === 9) {
      windows.add(normalized);
    }

    if (normalized.length > 9) {
      for (const windowLength of [8, 9]) {
        for (let startIndex = 0; startIndex <= normalized.length - windowLength; startIndex += 1) {
          windows.add(normalized.slice(startIndex, startIndex + windowLength));
        }
      }
    }

    return [...windows].filter((value) => /^[STFGM567][A-Z0-9]{7,8}$/.test(value));
  }

  /**
   * Extracts all likely Singapore NRIC/FIN candidates from plain text.
   */
  private extractSingaporeIdentifierCandidates(rawText: string): string[] {
    const matches = String(rawText || '')
      .match(/[STFGM567][A-Z0-9\s-]{6,20}[A-Z0-9]?/gi) || [];

    const normalized: string[] = [];
    for (const candidate of matches) {
      normalized.push(...this.expandPossibleIdentifierWindows(candidate));
    }

    return [...new Set(normalized)];
  }

  private buildNricCandidateInputs(extracted: ExtractedSingaporeIdentifier): string[] {
    const candidateInputs: string[] = [];

    for (const candidate of [
      extracted.identifier,
      ...extracted.candidates,
      ...this.extractSingaporeIdentifierCandidates(extracted.rawResponse),
    ]) {
      candidateInputs.push(...this.expandPossibleIdentifierWindows(candidate));
    }

    return [...new Set(candidateInputs)];
  }

  private mergeNricCandidateInputs(...candidateGroups: string[][]): string[] {
    const merged: string[] = [];

    for (const group of candidateGroups) {
      for (const candidate of group) {
        for (const candidateWindow of this.expandPossibleIdentifierWindows(candidate)) {
          merged.push(candidateWindow);
        }
      }
    }

    return [...new Set(merged)];
  }

  private getExtractedProfileScore(extracted: ExtractedSingaporeIdentifier): number {
    const populatedFields = [
      extracted.profile.fullName,
      extracted.profile.dateOfBirth,
      extracted.profile.nationality,
      extracted.profile.sex,
      extracted.profile.address,
    ].filter((value) => this.sanitizeExtractedTextField(value)).length;
    const confidence = typeof extracted.confidence === 'number' ? extracted.confidence : 0;

    return (populatedFields * 1000) + confidence;
  }

  private pickPreferredExtractedResult(
    first: ExtractedSingaporeIdentifier,
    second: ExtractedSingaporeIdentifier,
  ): ExtractedSingaporeIdentifier {
    const firstScore = this.getExtractedProfileScore(first);
    const secondScore = this.getExtractedProfileScore(second);

    if (firstScore !== secondScore) {
      return secondScore > firstScore ? second : first;
    }

    const firstIdentifier = String(first.identifier || '').trim();
    const secondIdentifier = String(second.identifier || '').trim();
    if (!firstIdentifier && secondIdentifier) {
      return second;
    }

    return first;
  }

  private buildNricVerificationAttemptResult(
    frontExtracted: ExtractedSingaporeIdentifier,
    backExtracted: ExtractedSingaporeIdentifier,
    extraFrontCandidateInputs: string[] = [],
    extraBackCandidateInputs: string[] = [],
  ): NricVerificationAttemptResult {
    const frontCandidateInputs = this.mergeNricCandidateInputs(
      this.buildNricCandidateInputs(frontExtracted),
      extraFrontCandidateInputs,
    );
    const backCandidateInputs = this.mergeNricCandidateInputs(
      this.buildNricCandidateInputs(backExtracted),
      extraBackCandidateInputs,
    );

    const frontValidCandidates = collectValidSingaporeNricFinCandidates(frontCandidateInputs);
    const backValidCandidates = collectValidSingaporeNricFinCandidates(backCandidateInputs);
    const frontResolvedCandidate = frontValidCandidates[0] || null;
    const backResolvedCandidate = backValidCandidates[0] || null;
    const matchingFrontCandidate =
      frontValidCandidates.find((frontCandidate) =>
        backValidCandidates.some((backCandidate) => backCandidate.normalized === frontCandidate.normalized)
      ) || null;
    const matchingBackCandidate = matchingFrontCandidate
      ? backValidCandidates.find((backCandidate) => backCandidate.normalized === matchingFrontCandidate.normalized) || null
      : null;

    return {
      frontExtracted,
      backExtracted,
      frontCandidateInputs,
      backCandidateInputs,
      frontValidCandidates,
      backValidCandidates,
      frontResolvedCandidate,
      backResolvedCandidate,
      matchingCandidate: pickPreferredResolvedSingaporeNricFinCandidate(
        matchingFrontCandidate,
        matchingBackCandidate,
      ),
    };
  }

  /**
   * Parses the OpenRouter response and extracts a normalized Singapore NRIC/FIN candidate.
   */
  private parseOpenRouterNricResponse(rawResponse: string): ExtractedSingaporeIdentifier {
    const trimmed = String(rawResponse || '').trim();
    const withoutFence = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let identifier = '';
    let confidence: number | null = null;
    let reason = '';

    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');
    const jsonCandidate =
      firstBrace >= 0 && lastBrace > firstBrace
        ? withoutFence.slice(firstBrace, lastBrace + 1)
        : withoutFence;

    try {
      const parsed = JSON.parse(jsonCandidate) as {
        identifier?: string;
        candidates?: string[];
        fullName?: string | string[];
        dateOfBirth?: string | string[];
        nationality?: string | string[];
        cardColor?: string | string[];
        sex?: string | string[];
        address?: string | string[];
        confidence?: number | string;
        reason?: string;
      };

      const parsedCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
      const normalizedCandidates = parsedCandidates.map((candidate) => normalizeSingaporeNricFin(candidate)).filter(Boolean);
      identifier = normalizeSingaporeNricFin(parsed.identifier || normalizedCandidates[0] || '');
      const parsedConfidence = Number(parsed.confidence);
      confidence = Number.isFinite(parsedConfidence) ? parsedConfidence : null;
      reason = String(parsed.reason || '').trim();
      return {
        identifier,
        candidates: normalizedCandidates,
        profile: {
          fullName: this.sanitizeExtractedTextField(parsed.fullName),
          dateOfBirth: this.sanitizeExtractedTextField(parsed.dateOfBirth),
          nationality: this.sanitizeExtractedTextField(parsed.nationality),
          cardColor: this.sanitizeExtractedTextField(parsed.cardColor),
          sex: this.sanitizeExtractedTextField(parsed.sex),
          address: this.sanitizeExtractedAddressField(parsed.address),
        },
        confidence,
        reason,
        rawResponse: trimmed,
      };
    } catch {
      identifier = '';
    }

    if (!identifier) {
      identifier = this.extractSingaporeIdentifierCandidate(withoutFence);
    }

    return {
      identifier,
      candidates: this.extractSingaporeIdentifierCandidates(withoutFence),
      profile: {
        fullName: '',
        dateOfBirth: '',
        nationality: '',
        cardColor: '',
        sex: '',
        address: '',
      },
      confidence,
      reason,
      rawResponse: trimmed,
    };
  }

  /**
   * Uses the configured AI provider to OCR a single uploaded NRIC image and extract a candidate NRIC/FIN.
   */
  private async extractSingaporeIdentifierFromImageWithOpenRouter(
    image: Express.Multer.File,
    side: 'front' | 'back',
  ): Promise<ExtractedSingaporeIdentifier> {
    if (!this.isExternalNricAiAllowed()) {
      throw new BadRequestException(
        'Automatic NRIC verification with an external AI provider is disabled in this environment. Use an approved private OCR flow or explicitly set NRIC_ALLOW_EXTERNAL_AI=true after compliance approval.'
      );
    }

    if (!this.llmService.isConfigured()) {
      throw new BadRequestException(this.llmService.getConfigurationErrorMessage());
    }

    try {
      const result = await this.llmService.chat({
        useCase: 'nric',
        temperature: 0,
        maxTokens: this.getNricOpenRouterMaxTokens(),
        messages: [
          {
            role: 'system',
            content: NRIC_SINGLE_IMAGE_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: buildNricSingleImageUserPrompt(side),
              },
              {
                type: 'image_url',
                image_url: { url: this.buildDataUrl(image) },
              },
            ],
          },
        ],
      });

      const extracted = this.parseOpenRouterNricResponse(result.text);

      if (!extracted.identifier) {
        throw new BadRequestException(`Could not extract a Singapore NRIC/FIN from the uploaded NRIC ${side} image.`);
      }

      return extracted;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      const status = Number((error as Error & { status?: number })?.status || 0);
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        '[NRIC] AI single-image extraction failed | side=',
        side,
        'status=',
        status,
        'error=',
        String(message).slice(0, 500),
      );
      throw new BadRequestException(
        status > 0
          ? this.llmService.getFriendlyErrorMessage(status, message, 'single')
          : message,
      );
    }
  }

  private async extractSingaporeIdentifierFromImagePairWithOpenRouter(
    frontImage: Express.Multer.File,
    backImage: Express.Multer.File,
  ): Promise<ExtractedSingaporeIdentifier> {
    if (!this.isExternalNricAiAllowed()) {
      throw new BadRequestException(
        'Automatic NRIC verification with an external AI provider is disabled in this environment. Use an approved private OCR flow or explicitly set NRIC_ALLOW_EXTERNAL_AI=true after compliance approval.'
      );
    }

    if (!this.llmService.isConfigured()) {
      throw new BadRequestException(this.llmService.getConfigurationErrorMessage());
    }

    try {
      const result = await this.llmService.chat({
        useCase: 'nric',
        temperature: 0,
        maxTokens: this.getNricOpenRouterMaxTokens(),
        messages: [
          {
            role: 'system',
            content: NRIC_PAIR_IMAGE_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: NRIC_PAIR_IMAGE_USER_PROMPT,
              },
              {
                type: 'image_url',
                image_url: { url: this.buildDataUrl(frontImage) },
              },
              {
                type: 'image_url',
                image_url: { url: this.buildDataUrl(backImage) },
              },
            ],
          },
        ],
      });

      return this.parseOpenRouterNricResponse(result.text);
    } catch (error) {
      const status = Number((error as Error & { status?: number })?.status || 0);
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        '[NRIC] AI pair extraction failed | status=',
        status,
        'error=',
        String(message).slice(0, 500),
      );
      throw new BadRequestException(
        status > 0
          ? this.llmService.getFriendlyErrorMessage(status, message, 'pair')
          : message,
      );
    }
  }

  private async extractSingaporeIdentifierCandidatesWithLocalOcr(
    image: Express.Multer.File,
    side: 'front' | 'back',
  ): Promise<string[]> {
    try {
      const tesseractModule = await import('tesseract.js');
      const recognize =
        (tesseractModule as any).recognize
        || (tesseractModule as any).default?.recognize;

      if (typeof recognize !== 'function') {
        console.warn('[NRIC] Local OCR fallback unavailable | side=', side, 'reason=recognize function missing');
        return [];
      }

      const result = await recognize(image.buffer, 'eng');
      const rawText = String(result?.data?.text || '').trim();
      const candidateInputs = this.extractSingaporeIdentifierCandidates(rawText);

      console.info(
        '[NRIC] Local OCR fallback completed | side=',
        side,
        'candidateCount=',
        candidateInputs.length,
      );

      return candidateInputs;
    } catch (error) {
      console.warn(
        '[NRIC] Local OCR fallback failed | side=',
        side,
        'error=',
        (error as Error)?.message || 'unknown error',
      );
      return [];
    }
  }

  /**
   * Resolves the user to update for NRIC verification from either an explicit userId or a bearer token.
   */
  private async resolveOrCreateUserForStudentAcademicVerification(
    userId?: string,
    authorizationHeader?: string,
    params?: { personalEmail?: string; learnerName?: string },
  ): Promise<UserEntity | null> {
    const resolvedUser = await this.resolveUserForNricVerification(userId, authorizationHeader);
    if (resolvedUser?.id) return resolvedUser;

    const personalEmail = this.normalizeStudentSchoolEmail(params?.personalEmail || '');
    if (!personalEmail || !this.isBasicEmailFormat(personalEmail)) return null;

    const existingDraft = await this.userRepository.findOne({
      where: { email: personalEmail, isDraft: true },
    });
    if (existingDraft?.id) return existingDraft;

    const learnerName = String(params?.learnerName || 'Student Applicant').trim() || 'Student Applicant';
    const nameParts = learnerName.split(/\s+/).filter(Boolean);
    const draftUser = this.userRepository.create({
      username: `student_${crypto.randomBytes(8).toString('hex')}`,
      firstname: nameParts[0] || 'Student',
      lastname: nameParts.slice(1).join(' ') || 'Applicant',
      email: personalEmail,
      password: null,
      authProvider: AuthProvider.LOCAL,
      role: UserRole.User,
      status: UserStatus.Active,
      isVerified: false,
      isDraft: true,
      persona: 'student',
    });

    return this.userRepository.save(draftUser);
  }

  private async resolveUserForNricVerification(userId?: string, authorizationHeader?: string) {
    const trimmedUserId = String(userId || '').trim();
    if (trimmedUserId) {
      return this.userRepository.findOne({ where: { id: trimmedUserId } });
    }

    const tokenMatch = String(authorizationHeader || '').match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch?.[1]?.trim();
    if (!token) return null;

    try {
      const payload = this.JwtService.verify(token) as { id?: string };
      const resolvedId = String(payload?.id || '').trim();
      if (!resolvedId) return null;
      return this.userRepository.findOne({ where: { id: resolvedId } });
    } catch {
      return null;
    }
  }

  /**
   * Resolves an existing user for NRIC verification or creates a draft row when none exists yet.
   */
  private async resolveOrCreateUserForNricVerification(
    extracted: ExtractedSingaporeIdentifier,
    userId?: string,
    authorizationHeader?: string,
  ) {
    const resolvedUser = await this.resolveUserForNricVerification(userId, authorizationHeader);
    const normalizedNricFin = normalizeSingaporeNricFin(extracted.identifier || '');
    if (canReuseUserForNricVerification(resolvedUser, normalizedNricFin)) {
      return { user: resolvedUser!, createdAsDraft: false };
    }

    // Reuse an existing draft with the same NRIC instead of creating a duplicate
    if (normalizedNricFin) {
      const existingByNric = await findUserByVerifiedNricFin(this.userRepository, normalizedNricFin);
      if (existingByNric?.isDraft) {
        const draftName = this.buildDraftName(extracted.profile.fullName);
        existingByNric.firstname = draftName.firstname;
        existingByNric.lastname = draftName.lastname;
        await this.userRepository.save(existingByNric);
        return { user: existingByNric, createdAsDraft: false };
      }
    }

    const draftName = this.buildDraftName(extracted.profile.fullName);
    const draftUsername = await this.buildDraftUsername(draftName.firstname, draftName.lastname);

    const draftUser = this.userRepository.create({
      username: draftUsername,
      firstname: draftName.firstname,
      lastname: draftName.lastname,
      email: null,
      password: null,
      authProvider: AuthProvider.LOCAL,
      role: UserRole.User,
      status: UserStatus.Active,
      isVerified: false,
      isDraft: true,
    });

    await this.userRepository.save(draftUser);

    return { user: draftUser, createdAsDraft: true };
  }

  private resolveCurrentUserIdForNricGuard(
    user: UserEntity | null | undefined,
    normalizedNricFin: string,
  ): string | undefined {
    return canReuseUserForNricVerification(user, normalizedNricFin) ? user?.id : undefined;
  }

  private async assertNricFinAvailable(normalizedNricFin: string, currentUserId?: string): Promise<void> {
    await assertNricFinNotAlreadyRegistered(this.userRepository, normalizedNricFin, currentUserId);
  }

  async sendStudentVerificationPin(params: {
    schoolName?: string;
    graduationDate?: string;
    schoolEmail?: string;
  }) {
    this.cleanupExpiredStudentVerificationSessions();

    const { schoolName, graduationDate, schoolEmail } = this.validateStudentVerificationInput(params);

    const schoolEmailVerification = await validateStudentSchoolEmail(schoolEmail);
    if (!schoolEmailVerification.isValid) {
      throw new BadRequestException(
        schoolEmailVerification.reason || 'Please enter a valid school email address.',
      );
    }

    const verificationToken = crypto.randomBytes(24).toString('hex');
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    if (this.shouldLogStudentVerificationPin()) {
      console.info(`[Student Verification OTP] ${schoolEmail} -> ${pin}`);
    }

    this.studentVerificationSessions.set(verificationToken, {
      schoolName,
      graduationDate,
      schoolEmail,
      pinHash: this.hashStudentVerificationPin(verificationToken, pin),
      expiresAt,
      attempts: 0,
    });

    try {
      await this.emailService.sendStudentVerificationPinEmail(schoolEmail, pin, schoolName);
    } catch (error) {
      this.studentVerificationSessions.delete(verificationToken);
      throw new BadRequestException('Could not send verification PIN right now. Please try again in a moment.');
    }

    const response: {
      sent: boolean;
      verificationToken: string;
      schoolEmail: string;
      expiresAt: string;
      message: string;
      debugPin?: string;
    } = {
      sent: true,
      verificationToken,
      schoolEmail,
      expiresAt: new Date(expiresAt).toISOString(),
      message: 'Verification PIN sent successfully.',
    };

    // Temporary: expose PIN in API for UI testing when STUDENT_VERIFICATION_LOG_PIN=true (remove in production).
    if (this.shouldLogStudentVerificationPin()) {
      response.debugPin = pin;
    }

    return response;
  }

  async verifyStudentVerificationPin(params: {
    verificationToken?: string;
    pin?: string;
    schoolEmail?: string;
  }) {
    this.cleanupExpiredStudentVerificationSessions();

    const verificationToken = String(params?.verificationToken || '').trim();
    const pin = String(params?.pin || '').trim();
    const schoolEmail = this.normalizeStudentSchoolEmail(params?.schoolEmail || '');

    if (!verificationToken) {
      throw new BadRequestException('Please send verification PIN first.');
    }

    if (!pin) {
      throw new BadRequestException('Please enter the verification PIN.');
    }

    const session = this.studentVerificationSessions.get(verificationToken);
    if (!session || session.expiresAt <= Date.now()) {
      this.studentVerificationSessions.delete(verificationToken);
      throw new BadRequestException('Verification PIN expired or invalid. Please request a new PIN.');
    }

    if (schoolEmail && session.schoolEmail !== schoolEmail) {
      throw new BadRequestException('School email changed. Please request a new verification PIN.');
    }

    const expectedHash = this.hashStudentVerificationPin(verificationToken, pin);
    if (expectedHash !== session.pinHash) {
      session.attempts += 1;
      if (session.attempts >= 5) {
        this.studentVerificationSessions.delete(verificationToken);
        throw new BadRequestException('Too many invalid PIN attempts. Please request a new verification PIN.');
      }
      this.studentVerificationSessions.set(verificationToken, session);
      throw new BadRequestException('Invalid PIN. Please check and try again.');
    }

    this.studentVerificationSessions.delete(verificationToken);

    return {
      verified: true,
      schoolEmail: session.schoolEmail,
      schoolName: session.schoolName,
      graduationDate: session.graduationDate,
      message: 'Student email verification successful.',
    };
  }

  async verifyStudentEligibilityWithAi(params: {
    schoolName?: string;
    graduationDate?: string;
    schoolEmail?: string;
  }): Promise<StudentEligibilityAssessment> {
    const validated = this.validateStudentVerificationInput(params);

    const schoolEmailVerification = await validateStudentSchoolEmail(validated.schoolEmail);
    if (!schoolEmailVerification.isValid) {
      throw new BadRequestException(
        schoolEmailVerification.reason || 'Please enter a valid school email address.',
      );
    }

    const heuristicAssessment = this.getStudentEligibilityHeuristicAssessment(validated);

    try {
      const aiAssessment = await this.assessStudentEligibilityWithOpenRouter(validated);
      const blendedScore = Math.round((heuristicAssessment.score * 0.4) + (aiAssessment.score * 0.6));
      const normalizedScore = Math.max(0, Math.min(100, blendedScore));
      let status: StudentEligibilityAssessment['status'] =
        normalizedScore >= 70 ? 'eligible' : normalizedScore >= 50 ? 'manual_review' : 'ineligible';

      if (aiAssessment.status === 'ineligible' || heuristicAssessment.status === 'ineligible') {
        status = normalizedScore >= 50 ? 'manual_review' : 'ineligible';
      } else if (aiAssessment.status === 'manual_review' || heuristicAssessment.status === 'manual_review') {
        status = 'manual_review';
      }

      return {
        verified: status === 'eligible',
        score: normalizedScore,
        status,
        reasons: [...new Set([...aiAssessment.reasons, ...heuristicAssessment.reasons])].slice(0, 5),
        confidence: aiAssessment.confidence,
        source: aiAssessment.source,
      };
    } catch {
      return heuristicAssessment;
    }
  }

  private isQuestionnaireAcademicEmail(email: string): boolean {
    const value = this.normalizeStudentSchoolEmail(email);
    if (!value || !value.includes('@')) return false;
    return QUESTIONNAIRE_ACADEMIC_EMAIL_SUFFIXES.some((suffix) => value.endsWith(`@${suffix}`));
  }

  private parseStudentCardAiResponse(rawResponse: string): StudentCardExtraction {
    const trimmed = String(rawResponse || '').trim();
    const withoutFence = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const firstBrace = withoutFence.indexOf('{');
    const lastBrace = withoutFence.lastIndexOf('}');
    const jsonCandidate =
      firstBrace >= 0 && lastBrace > firstBrace
        ? withoutFence.slice(firstBrace, lastBrace + 1)
        : withoutFence;

    const parsed = JSON.parse(jsonCandidate) as {
      isStudentCard?: boolean;
      fullName?: string;
      email?: string;
      institution?: string;
      studentId?: string;
      confidence?: number | string;
      reason?: string;
    };

    const parsedConfidence = Number(parsed.confidence);
    return {
      isStudentCard: parsed.isStudentCard === true,
      fullName: this.sanitizeExtractedTextField(parsed.fullName),
      email: this.normalizeStudentSchoolEmail(parsed.email || ''),
      institution: this.sanitizeExtractedTextField(parsed.institution),
      studentId: this.sanitizeExtractedTextField(parsed.studentId),
      confidence: Number.isFinite(parsedConfidence) ? Math.max(0, Math.min(1, parsedConfidence)) : null,
      reason: this.sanitizeExtractedTextField(parsed.reason),
    };
  }

  private async extractStudentCardFromImageWithAi(
    image: Express.Multer.File,
  ): Promise<StudentCardExtraction> {
    if (!this.isExternalNricAiAllowed()) {
      throw new BadRequestException(
        'Automatic student card verification with an external AI provider is disabled in this environment. Set NRIC_ALLOW_EXTERNAL_AI=true after compliance approval.',
      );
    }

    if (!this.llmService.isConfigured()) {
      throw new BadRequestException(this.llmService.getConfigurationErrorMessage());
    }

    try {
      const result = await this.llmService.chat({
        useCase: 'student',
        temperature: 0,
        maxTokens: this.getStudentAiMaxTokens(),
        messages: [
          {
            role: 'system',
            content: STUDENT_CARD_IMAGE_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: STUDENT_CARD_IMAGE_USER_PROMPT,
              },
              {
                type: 'image_url',
                image_url: { url: this.buildDataUrl(image) },
              },
            ],
          },
        ],
      });

      return this.parseStudentCardAiResponse(result.text);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Student card AI verification failed.';
      throw new BadRequestException(message);
    }
  }

  private buildStudentAcademicVerificationAssessment(input: {
    academicEmail: string;
    personalEmail?: string;
    extracted: StudentCardExtraction;
    source: LlmProvider | 'heuristic';
  }): StudentAcademicVerificationResult {
    const academicEmail = this.normalizeStudentSchoolEmail(input.academicEmail);
    const personalEmail = String(input.personalEmail || '').trim();
    const extracted = input.extracted;
    const reasons: string[] = [];
    let score = 0;

    const academicEmailValid = this.isQuestionnaireAcademicEmail(academicEmail);
    if (academicEmailValid) {
      score += 34;
      reasons.push('Academic email domain is supported.');
    } else {
      reasons.push('Academic email domain is not supported.');
    }

    let personalEmailValid = false;
    if (personalEmail) {
      personalEmailValid = this.isBasicEmailFormat(personalEmail);
      if (personalEmailValid) {
        reasons.push('Personal email format is valid.');
      } else {
        reasons.push('Personal email format is invalid.');
      }
    } else {
      reasons.push('Personal email is required.');
    }

    const minConfidence = 0.4;
    const studentCardReadable =
      extracted.isStudentCard === true
      && (extracted.confidence ?? 0) >= minConfidence;

    if (studentCardReadable) {
      score += 33;
      reasons.push('Student ID card was read successfully.');
    } else {
      reasons.push(extracted.reason || 'Could not confirm a valid student ID card from the upload.');
    }

    const institutionVisible = String(extracted.institution || '').trim().length > 0;
    if (institutionVisible) {
      score += 33;
      reasons.push('Institution is visible on the student card.');
    } else {
      reasons.push('No institution was visible on the student card.');
    }

    let cardEmailMatchesAcademic: boolean | null = null;
    if (extracted.email && academicEmail) {
      cardEmailMatchesAcademic = extracted.email === academicEmail;
      if (cardEmailMatchesAcademic) {
        score += 14;
        reasons.push('Email on student card matches the academic email.');
      } else {
        reasons.push('Email on student card does not match the academic email.');
      }
    } else if (studentCardReadable) {
      score += 12;
      reasons.push('No email was visible on the student card; partial credit applied for manual review.');
    }

    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    let status: StudentEligibilityAssessment['status'] = 'ineligible';
    if (!academicEmailValid || !studentCardReadable || !institutionVisible) {
      status = normalizedScore >= 50 ? 'manual_review' : 'ineligible';
    } else if (normalizedScore >= 70) {
      status = 'eligible';
    } else if (normalizedScore >= 50) {
      status = 'manual_review';
    }

    const verified =
      academicEmailValid
      && personalEmailValid
      && studentCardReadable
      && institutionVisible
      && status === 'eligible';

    return {
      verified,
      score: normalizedScore,
      status,
      reasons: reasons.slice(0, 5),
      confidence: extracted.confidence,
      source: input.source,
      checks: {
        academicEmailValid,
        personalEmailValid,
        studentCardReadable,
        institutionVisible,
        cardEmailMatchesAcademic,
      },
      extracted: {
        fullName: extracted.fullName,
        email: extracted.email,
        institution: extracted.institution,
        studentId: extracted.studentId,
      },
    };
  }

  async verifyStudentAcademicDetailsWithAi(params: {
    academicEmail?: string;
    personalEmail?: string;
    studentCardImage?: Express.Multer.File;
    userId?: string;
    authorizationHeader?: string;
  }): Promise<StudentAcademicVerificationResult> {
    const academicEmail = this.normalizeStudentSchoolEmail(params?.academicEmail || '');
    const personalEmail = String(params?.personalEmail || '').trim();
    const cardImage = this.validateStudentCardImage(params?.studentCardImage);

    if (!academicEmail) {
      throw new BadRequestException('Please enter your academic email.');
    }

    if (!this.isQuestionnaireAcademicEmail(academicEmail)) {
      throw new BadRequestException('Academic email domain is not supported for student verification.');
    }

    if (!personalEmail) {
      throw new BadRequestException('Please enter your personal email.');
    }

    if (!this.isBasicEmailFormat(personalEmail)) {
      throw new BadRequestException('Please enter a valid personal email address.');
    }

    const extracted = await this.extractStudentCardFromImageWithAi(params!.studentCardImage!);
    const assessment = this.buildStudentAcademicVerificationAssessment({
      academicEmail,
      personalEmail,
      extracted,
      source: this.llmService.getActiveProvider(),
    });
    let emailVerificationSent = false;
    let draftUserId: string | null = null;

    try {
      const learnerName = assessment.extracted?.fullName?.trim() || 'Student Applicant';
      const auditUser = await this.resolveOrCreateUserForStudentAcademicVerification(
        params?.userId,
        params?.authorizationHeader,
        { personalEmail, learnerName },
      );
      draftUserId = auditUser?.id || null;

      if (auditUser?.id) {
        const cardUrl = await this.localStorageService.saveFile(
          params!.studentCardImage!,
          `fee-waiver-audit/student-card/${auditUser.id}`,
          { fileName: 'student-card' },
        );
        const existingSnapshot =
          auditUser.eligibilitySnapshot && typeof auditUser.eligibilitySnapshot === 'object'
            ? auditUser.eligibilitySnapshot
            : {};
        auditUser.eligibilitySnapshot = {
          ...existingSnapshot,
          studentCardAudit: {
            cardUrl,
            academicEmail,
            personalEmail: personalEmail || null,
            score: assessment.score,
            status: assessment.status,
            verified: assessment.verified,
            checks: assessment.checks,
            extracted: assessment.extracted,
            savedAt: new Date().toISOString(),
          },
        };
        await this.userRepository.save(auditUser);
        assessment.cardImageUrl = cardUrl;
      }

      if (assessment.verified && academicEmail) {
        try {
          const hrVerificationToken = crypto.randomBytes(32).toString('hex');
          await this.emailService.sendStudentAcademicVerificationEmail({
            academicEmail,
            learnerName: assessment.extracted?.fullName?.trim()
              || (auditUser ? `${auditUser.firstname || ''} ${auditUser.lastname || ''}`.trim() : '')
              || 'Student',
            verificationToken: hrVerificationToken,
          });
          emailVerificationSent = true;
          if (auditUser?.id) {
            this.mergeFeeWaiverAuditSnapshot(auditUser, {
              method: 'student-academic',
              hrEmail: academicEmail,
              learnerEmail: auditUser.email || personalEmail || academicEmail,
              status: 'pending_hr_verification',
              auditSubmitted: true,
              hrVerificationToken,
              hrVerificationTokenHash: this.hashFeeWaiverHrVerificationToken(hrVerificationToken),
              submittedAt: new Date().toISOString(),
            });
            auditUser.feeWaiverJobVerified = false;
            await this.userRepository.save(auditUser);
          }
        } catch (emailError) {
          this.logger.warn(
            `Could not send student academic verification email: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Could not persist student card audit image: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const pendingEmailVerification = emailVerificationSent;
    const requiresEmailVerification = assessment.verified && Boolean(academicEmail);

    return {
      ...assessment,
      verified: requiresEmailVerification ? false : assessment.verified,
      emailVerificationSent,
      pendingEmailVerification,
      draftUserId,
    };
  }

  async getStudentAcademicEmailVerificationStatus(params: {
    academicEmail?: string;
    userId?: string;
  }) {
    const academicEmail = this.normalizeStudentSchoolEmail(params?.academicEmail || '');
    const userId = String(params?.userId || '').trim();
    if (!academicEmail && !userId) {
      throw new BadRequestException('Academic email or user ID is required.');
    }

    let user: UserEntity | null = null;
    if (userId) {
      user = await this.userRepository.findOne({ where: { id: userId } });
    }

    if (!user && academicEmail) {
      user = await this.userRepository
        .createQueryBuilder('usr')
        .where(`usr."eligibilitySnapshot"::jsonb @> :auditFilter::jsonb`, {
          auditFilter: JSON.stringify({
            feeWaiverAudit: { hrEmail: academicEmail, method: 'student-academic' },
          }),
        })
        .getOne();
    }

    if (!user) {
      return {
        verified: false,
        pending: Boolean(academicEmail),
        academicEmail: academicEmail || null,
      };
    }

    const audit = user.eligibilitySnapshot?.feeWaiverAudit;
    const auditRecord =
      audit && typeof audit === 'object' ? (audit as Record<string, unknown>) : null;
    const method = String(auditRecord?.method || '').trim();
    const status = String(auditRecord?.status || '').trim();
    const storedAcademicEmail = this.normalizeStudentSchoolEmail(String(auditRecord?.hrEmail || ''));
    const emailMatches = !academicEmail || storedAcademicEmail === academicEmail;
    const verified =
      emailMatches
      && method === 'student-academic'
      && (status === 'hr_verified' || user.feeWaiverJobVerified === true);

    return {
      verified,
      pending: emailMatches && method === 'student-academic' && !verified,
      academicEmail: storedAcademicEmail || academicEmail || null,
      draftUserId: user.id,
    };
  }

  private getExperiencedAiMaxTokens(): number {
    const configured = Number(process.env.AI_EXPERIENCED_MAX_TOKENS ?? process.env.OPENROUTER_EXPERIENCED_MAX_TOKENS ?? '400');
    if (!Number.isFinite(configured)) return 400;
    return Math.min(1024, Math.max(200, Math.round(configured)));
  }

  private getExperiencedResumeFormat(file: Express.Multer.File): 'pdf' | 'docx' | 'doc' | null {
    const name = String(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
    if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || name.endsWith('.docx')
    ) {
      return 'docx';
    }
    if (mime === 'application/msword' || name.endsWith('.doc')) return 'doc';
    return null;
  }

  private validateExperiencedResumeFile(file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Please upload your resume.');
    }
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException('Resume file is too large. Maximum size is 8MB.');
    }
    if (!this.getExperiencedResumeFormat(file)) {
      throw new BadRequestException('Please upload a PDF or Word file (.pdf, .doc, or .docx).');
    }
  }

  private async extractResumePlainTextFromPdfBuffer(buffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse') as (data: Buffer) => Promise<{ text?: string }>;
      const result = await pdfParse(buffer);
      return this.sanitizeExtractedTextField(String(result?.text || ''));
    } catch {
      throw new BadRequestException(
        'Could not read text from this PDF. Try a text-based PDF (exported from Word), not a scanned image-only file.',
      );
    }
  }

  private async extractResumePlainTextFromUpload(file: Express.Multer.File): Promise<string> {
    const format = this.getExperiencedResumeFormat(file);
    if (format === 'pdf') {
      return this.extractResumePlainTextFromPdfBuffer(file.buffer);
    }
    if (format === 'docx') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const mammoth = require('mammoth') as {
          extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
        };
        const { value } = await mammoth.extractRawText({ buffer: file.buffer });
        return this.sanitizeExtractedTextField(String(value || ''));
      } catch {
        throw new BadRequestException('Could not read this Word document (.docx). Please try another file or save as PDF.');
      }
    }
    if (format === 'doc') {
      const fs = await import('fs/promises');
      const os = await import('os');
      const path = await import('path');
      const tmp = path.join(os.tmpdir(), `resume-${Date.now()}-${Math.random().toString(36).slice(2)}.doc`);
      await fs.writeFile(tmp, file.buffer);
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
        const WordExtractor = require('word-extractor') as new () => {
          extract: (p: string) => Promise<{ getBody: () => string }>;
        };
        const extractor = new WordExtractor();
        const document = await extractor.extract(tmp);
        return this.sanitizeExtractedTextField(String(document.getBody() || ''));
      } catch {
        throw new BadRequestException('Could not read this Word document (.doc). Please try .docx or PDF.');
      } finally {
        await fs.unlink(tmp).catch(() => undefined);
      }
    }
    return '';
  }

  private getExperiencedResumeHeuristicAssessment(resumeText: string): StudentEligibilityAssessment {
    const text = String(resumeText || '').toLowerCase();
    const reasons: string[] = [];
    let score = 0;

    if (resumeText.length > 600) {
      score += 18;
      reasons.push('Resume contains substantial detail for review.');
    } else if (resumeText.length > 200) {
      score += 12;
      reasons.push('Resume contains moderate detail.');
    } else {
      score += 5;
      reasons.push('Resume text is very short, which lowers confidence.');
    }

    const managerial = /(manager|director|head of|head,|team lead|lead\b|supervisor|cfo|chief financial|controller|finance manager|accounting manager)/i.test(text);
    if (managerial) {
      score += 28;
      reasons.push('Resume suggests managerial or senior leadership experience.');
    }

    const domain = /(accounting|finance|audit|auditing|treasury|fp&a|financial control|corporate finance|management accounting)/i.test(text);
    if (domain) {
      score += 28;
      reasons.push('Resume references accounting or finance-related roles.');
    }

    const fivePlusYears =
      /\b(1[0-9]|[2-9][0-9])\s*\+?\s*(years?|yrs?)\b/i.test(text)
      || /\b(5|6|7|8|9)\s*\+?\s*(years?|yrs?)\b/i.test(text)
      || /\b(5|6|7|8|9)\s*\+?\s*years?\s+of\b/i.test(text)
      || /(10|15|20)\s*\+?\s*(years?|yrs?)/i.test(text);

    if (fivePlusYears) {
      score += 22;
      reasons.push('Resume text suggests at least five years of professional experience.');
    } else if (/\b(3|4)\s*\+?\s*(years?|yrs?)\b/i.test(text)) {
      score += 10;
      reasons.push('Resume suggests several years of experience, but five or more years is not clearly stated.');
    }

    const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
    const status =
      normalizedScore >= 70 ? 'eligible' : normalizedScore >= 50 ? 'manual_review' : 'ineligible';

    return {
      verified: status === 'eligible',
      score: normalizedScore,
      status,
      reasons: reasons.slice(0, 4),
      confidence: null,
      source: 'heuristic',
    };
  }

  private logOpenRouterExperiencedResumeTokenUsage(
    model: string,
    excerptCharLength: number,
    usage: unknown,
  ): void {
    if (!usage || typeof usage !== 'object') {
      this.logger.log(
        `Experienced resume OpenRouter: model=${model} excerptChars=${excerptCharLength} — usage field missing from API response.`,
      );
      return;
    }
    const u = usage as Record<string, unknown>;
    const prompt = u.prompt_tokens;
    const completion = u.completion_tokens;
    const total = u.total_tokens;
    this.logger.log(
      `Experienced resume OpenRouter token usage: model=${model} excerptChars=${excerptCharLength} prompt_tokens=${String(prompt)} completion_tokens=${String(completion)} total_tokens=${String(total)}`,
    );
  }

  private async assessExperiencedResumeWithOpenRouter(resumeText: string): Promise<StudentEligibilityAssessment> {
    if (!this.llmService.isConfigured()) {
      throw new BadRequestException(this.llmService.getConfigurationErrorMessage());
    }

    const excerpt = resumeText.slice(0, 12000);

    try {
      const result = await this.llmService.chat({
        useCase: 'experienced',
        temperature: 0,
        maxTokens: this.getExperiencedAiMaxTokens(),
        messages: [
          {
            role: 'system',
            content: EXPERIENCED_MEMBERSHIP_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: JSON.stringify({
              pathwayRule: EXPERIENCED_MEMBERSHIP_PATHWAY_RULE,
              resumeTextExcerpt: excerpt,
            }),
          },
        ],
      });

      this.logOpenRouterExperiencedResumeTokenUsage(result.model, excerpt.length, result.usage);
      return this.parseStudentEligibilityAiResponse(result.text, result.provider);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI resume check failed.';
      throw new BadRequestException(message);
    }
  }

  async verifyExperiencedResume(file: Express.Multer.File | undefined): Promise<StudentEligibilityAssessment> {
    this.validateExperiencedResumeFile(file);

    const plainText = await this.extractResumePlainTextFromUpload(file!);
    if (plainText.length < 120) {
      throw new BadRequestException(
        'Not enough readable text was found in this file. Please upload a document with selectable text.',
      );
    }

    const heuristicAssessment = this.getExperiencedResumeHeuristicAssessment(plainText);

    try {
      const aiAssessment = await this.assessExperiencedResumeWithOpenRouter(plainText);
      const blendedScore = Math.round((heuristicAssessment.score * 0.4) + (aiAssessment.score * 0.6));
      const normalizedScore = Math.max(0, Math.min(100, blendedScore));
      let status: StudentEligibilityAssessment['status'] =
        normalizedScore >= 70 ? 'eligible' : normalizedScore >= 50 ? 'manual_review' : 'ineligible';

      if (aiAssessment.status === 'ineligible' || heuristicAssessment.status === 'ineligible') {
        status = normalizedScore >= 50 ? 'manual_review' : 'ineligible';
      } else if (aiAssessment.status === 'manual_review' || heuristicAssessment.status === 'manual_review') {
        status = 'manual_review';
      }

      return {
        verified: status === 'eligible',
        score: normalizedScore,
        status,
        reasons: [...new Set([...aiAssessment.reasons, ...heuristicAssessment.reasons])].slice(0, 5),
        confidence: aiAssessment.confidence,
        source: aiAssessment.source,
      };
    } catch {
      return heuristicAssessment;
    }
  }

  private normalizeAuditEmail(email?: string | null) {
    return String(email || '').trim().toLowerCase();
  }

  private async assertValidHrAuditEmail(hrEmail?: string | null, learnerEmail?: string | null) {
    const normalizedHrEmail = this.normalizeAuditEmail(hrEmail);
    if (!normalizedHrEmail) {
      throw new BadRequestException('Please enter a valid HR email address.');
    }

    const verification = await validateHrContactEmail(normalizedHrEmail);
    if (!verification.isValid) {
      throw new BadRequestException(
        verification.reason || 'Please enter a valid HR email address.',
      );
    }

    const normalizedLearnerEmail = this.normalizeAuditEmail(learnerEmail);
    if (normalizedLearnerEmail && normalizedHrEmail === normalizedLearnerEmail) {
      throw new BadRequestException('HR email must be different from your registration email.');
    }

    return normalizedHrEmail;
  }

  private async resolveUserForFeeWaiverAudit(userId?: string, learnerEmail?: string) {
    const trimmedId = String(userId || '').trim();
    if (trimmedId) {
      const byId = await this.userRepository.findOne({ where: { id: trimmedId } });
      if (byId) return byId;
    }

    const normalizedEmail = this.normalizeAuditEmail(learnerEmail);
    if (!normalizedEmail) {
      throw new BadRequestException('Learner email is required.');
    }

    const byEmail = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: normalizedEmail })
      .getOne();
    if (!byEmail) {
      throw new BadRequestException('Could not find the registration record for this learner email.');
    }

    return byEmail;
  }

  private mergeFeeWaiverAuditSnapshot(
    user: UserEntity,
    audit: Record<string, unknown>,
  ) {
    const existing =
      user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
        ? user.eligibilitySnapshot
        : {};
    const mergedAudit: Record<string, unknown> = {
      ...(typeof existing.feeWaiverAudit === 'object' && existing.feeWaiverAudit
        ? (existing.feeWaiverAudit as Record<string, unknown>)
        : {}),
      ...audit,
      updatedAt: new Date().toISOString(),
    };
    user.eligibilitySnapshot = {
      ...existing,
      feeWaiverAudit: mergedAudit,
    };
    user.eligibilityCheckedAt = new Date();

    const status = String(mergedAudit.status || '').trim();
    if (status === 'hr_verified' || status === 'certificate_verified' || status === 'admin_verified') {
      user.feeWaiverJobVerified = true;
    } else if (status === 'pending_hr_verification' || status === 'pending_certificate_review') {
      user.feeWaiverJobVerified = false;
    }
  }

  private hashFeeWaiverHrVerificationToken(token: string) {
    return crypto.createHash('sha256').update(String(token || '').trim()).digest('hex');
  }

  private async saveFeeWaiverAuditFile(
    user: UserEntity,
    folder: string,
    file: Express.Multer.File,
    fileLabel: string,
  ) {
    const userFolder = `fee-waiver-audit/${folder}/${user.id}`;
    const fileUrl = await this.localStorageService.saveFile(file, userFolder, {
      fileName: fileLabel,
    });
    return fileUrl;
  }

  private async findUserByFeeWaiverHrToken(token: string) {
    const tokenHash = this.hashFeeWaiverHrVerificationToken(token);
    const byHash = await this.userRepository
      .createQueryBuilder('usr')
      .where(`usr."eligibilitySnapshot"::jsonb @> :auditFilter::jsonb`, {
        auditFilter: JSON.stringify({
          feeWaiverAudit: { hrVerificationTokenHash: tokenHash },
        }),
      })
      .getOne();

    if (byHash) return byHash;

    return this.userRepository
      .createQueryBuilder('usr')
      .where(`usr."eligibilitySnapshot"::jsonb @> :auditFilter::jsonb`, {
        auditFilter: JSON.stringify({
          feeWaiverAudit: { hrVerificationToken: token },
        }),
      })
      .getOne();
  }

  private validateFeeWaiverCertificateFile(file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Please upload your education certificate.');
    }
    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException('Certificate file is too large. Maximum size is 8MB.');
    }

    const name = String(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    const allowed =
      mime === 'application/pdf'
      || name.endsWith('.pdf')
      || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || name.endsWith('.docx')
      || mime === 'application/msword'
      || name.endsWith('.doc')
      || mime.startsWith('image/')
      || /\.(jpe?g|png|webp)$/i.test(name);

    if (!allowed) {
      throw new BadRequestException('Please upload a PDF, Word document, or image file.');
    }
  }

  async submitFeeWaiverAuditHrEmail(params: {
    userId?: string;
    learnerEmail?: string;
    learnerName?: string;
    hrEmail?: string;
  }) {
    const learnerEmail = this.normalizeAuditEmail(params?.learnerEmail);
    const learnerName = String(params?.learnerName || '').trim() || 'Learner';

    if (!learnerEmail) {
      throw new BadRequestException('Learner email is required.');
    }

    const hrEmail = await this.assertValidHrAuditEmail(params?.hrEmail, learnerEmail);

    const user = await this.resolveUserForFeeWaiverAudit(params?.userId, learnerEmail);
    if (this.normalizeAuditEmail(user.email) !== learnerEmail) {
      throw new BadRequestException('Learner email does not match the registration record.');
    }

    const existingAudit =
      user.eligibilitySnapshot?.feeWaiverAudit
      && typeof user.eligibilitySnapshot.feeWaiverAudit === 'object'
        ? (user.eligibilitySnapshot.feeWaiverAudit as Record<string, unknown>)
        : null;
    const existingToken = String(existingAudit?.hrVerificationToken || '').trim();
    const canReuseToken =
      existingAudit?.status === 'pending_hr_verification'
      && existingToken.length > 0;

    const hrVerificationToken = canReuseToken
      ? existingToken
      : crypto.randomBytes(32).toString('hex');

    // Persist token before emailing so the HR link is valid as soon as it is sent.
    this.mergeFeeWaiverAuditSnapshot(user, {
      method: 'hr-email',
      hrEmail,
      learnerEmail,
      status: 'pending_hr_verification',
      auditSubmitted: true,
      hrVerificationToken,
      hrVerificationTokenHash: this.hashFeeWaiverHrVerificationToken(hrVerificationToken),
      submittedAt: new Date().toISOString(),
      rejectionReason: null,
      rejectedAt: null,
      rejectedBy: null,
    });
    user.feeWaiverJobVerified = false;
    await this.userRepository.save(user);

    await this.emailService.sendFeeWaiverHrVerificationEmail({
      hrEmail,
      learnerEmail,
      learnerName: learnerName || `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'Learner',
      verificationToken: hrVerificationToken,
    });

    return {
      submitted: true,
      method: 'hr-email',
      hrEmail,
      jobVerified: false,
      message:
        'A verification email has been sent to your HR contact. Please verify your registration email, then sign in to start the programme.',
    };
  }

  async resendFeeWaiverHrVerificationEmail(params: {
    userId?: string;
    learnerEmail?: string;
    hrEmail?: string;
    requestedBy?: 'user' | 'admin' | 'system';
  }) {
    const requestedBy = params?.requestedBy || 'user';
    const user = await this.resolveUserForFeeWaiverAudit(params?.userId, params?.learnerEmail);

    const hrEmail = await this.assertValidHrAuditEmail(params?.hrEmail, user.email);

    const learnerEmail = this.normalizeAuditEmail(user.email);

    const existingAudit =
      user.eligibilitySnapshot?.feeWaiverAudit
      && typeof user.eligibilitySnapshot.feeWaiverAudit === 'object'
        ? (user.eligibilitySnapshot.feeWaiverAudit as Record<string, unknown>)
        : null;

    const method = String(existingAudit?.method || '').trim();
    const status = String(existingAudit?.status || '').trim();

    if (
      status === 'hr_verified'
      || status === 'certificate_verified'
      || status === 'admin_verified'
      || user.feeWaiverJobVerified === true
    ) {
      throw new BadRequestException('Job role verification is already complete.');
    }

    if (status === 'pending_certificate_review') {
      throw new BadRequestException(
        'A certificate is under review. HR email verification cannot be sent until that review is complete.',
      );
    }

    const auditMethod = ['hr-email', 'accounting-declaration-hr'].includes(method)
      ? method
      : 'hr-email';

    const hrVerificationToken = crypto.randomBytes(32).toString('hex');
    const learnerName =
      `${user.firstname || ''} ${user.lastname || ''}`.trim()
      || String(existingAudit?.learnerEmail || user.email || 'Learner');

    this.mergeFeeWaiverAuditSnapshot(user, {
      method: auditMethod,
      hrEmail,
      learnerEmail: this.normalizeAuditEmail(String(existingAudit?.learnerEmail || '')) || learnerEmail,
      status: 'pending_hr_verification',
      auditSubmitted: true,
      hrVerificationToken,
      hrVerificationTokenHash: this.hashFeeWaiverHrVerificationToken(hrVerificationToken),
      resubmittedAt: new Date().toISOString(),
      resubmittedBy: requestedBy,
      rejectionReason: null,
      rejectedAt: null,
      rejectedBy: null,
      ...(existingAudit?.submittedAt ? {} : { submittedAt: new Date().toISOString() }),
    });
    user.feeWaiverJobVerified = false;
    await this.userRepository.save(user);

    await this.emailService.sendFeeWaiverHrVerificationEmail({
      hrEmail,
      learnerEmail: learnerEmail || hrEmail,
      learnerName,
      verificationToken: hrVerificationToken,
    });

    return {
      success: true,
      method: auditMethod,
      hrEmail,
      jobVerified: false,
      message: `HR verification email has been sent to ${hrEmail}.`,
    };
  }

  async verifyFeeWaiverAuditHrToken(token?: string) {
    const trimmedToken = String(token || '').trim();
    if (!trimmedToken) {
      throw new BadRequestException('Verification token is required.');
    }

    const user = await this.findUserByFeeWaiverHrToken(trimmedToken);
    if (!user) {
      throw new BadRequestException('This HR verification link is invalid.');
    }

    const audit = user.eligibilitySnapshot?.feeWaiverAudit;
    const auditRecord =
      audit && typeof audit === 'object' ? (audit as Record<string, unknown>) : null;
    if (!auditRecord) {
      throw new BadRequestException('This HR verification link is invalid.');
    }

    if (String(auditRecord.method || '').trim() === 'student-academic') {
      throw new BadRequestException('This verification link is invalid.');
    }

    const learnerName =
      `${user.firstname || ''} ${user.lastname || ''}`.trim()
      || String(auditRecord.learnerEmail || user.email || 'Learner');

    if (auditRecord.status === 'hr_verified' || user.feeWaiverJobVerified === true) {
      return {
        verified: true,
        alreadyVerified: true,
        learnerName,
        learnerEmail: user.email,
        message: 'This learner job role has already been verified. Thank you.',
      };
    }

    this.mergeFeeWaiverAuditSnapshot(user, {
      status: 'hr_verified',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'hr-email-link',
      hrVerificationToken: trimmedToken,
      hrVerificationTokenHash: this.hashFeeWaiverHrVerificationToken(trimmedToken),
    });
    await this.userRepository.save(user);

    return {
      verified: true,
      learnerName,
      learnerEmail: user.email,
      message: 'Thank you. The learner job role has been verified successfully.',
    };
  }

  async verifyStudentAcademicEmailToken(token?: string) {
    const trimmedToken = String(token || '').trim();
    if (!trimmedToken) {
      throw new BadRequestException('Verification token is required.');
    }

    const user = await this.findUserByFeeWaiverHrToken(trimmedToken);
    if (!user) {
      throw new BadRequestException('This student verification link is invalid.');
    }

    const audit = user.eligibilitySnapshot?.feeWaiverAudit;
    const auditRecord =
      audit && typeof audit === 'object' ? (audit as Record<string, unknown>) : null;
    if (!auditRecord || String(auditRecord.method || '').trim() !== 'student-academic') {
      throw new BadRequestException('This student verification link is invalid.');
    }

    const learnerName =
      `${user.firstname || ''} ${user.lastname || ''}`.trim()
      || String(auditRecord.learnerEmail || user.email || 'Student');

    if (auditRecord.status === 'hr_verified' || user.feeWaiverJobVerified === true) {
      const resumeToken = await this.ensureStudentFeeWaiverResumeToken(user);
      return {
        verified: true,
        alreadyVerified: true,
        learnerName,
        learnerEmail: user.email,
        resumeToken,
        draftUserId: user.id,
        message: 'Your student status has already been verified. Thank you.',
      };
    }

    const resumeToken = crypto.randomBytes(32).toString('hex');
    this.mergeFeeWaiverAuditSnapshot(user, {
      status: 'hr_verified',
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'student-academic-email-link',
      hrVerificationToken: trimmedToken,
      hrVerificationTokenHash: this.hashFeeWaiverHrVerificationToken(trimmedToken),
      studentFeeWaiverResumeToken: resumeToken,
      studentFeeWaiverResumeTokenHash: this.hashFeeWaiverHrVerificationToken(resumeToken),
    });
    await this.userRepository.save(user);

    return {
      verified: true,
      learnerName,
      learnerEmail: user.email,
      resumeToken,
      draftUserId: user.id,
      message: 'Thank you. Your student status has been verified successfully.',
    };
  }

  async getStudentFeeWaiverResumeFlow(resumeToken?: string) {
    const trimmedToken = String(resumeToken || '').trim();
    if (!trimmedToken) {
      throw new BadRequestException('Resume token is required.');
    }

    const user = await this.findUserByStudentFeeWaiverResumeToken(trimmedToken);
    if (!user) {
      throw new BadRequestException('This registration resume link is invalid or expired.');
    }

    const audit = user.eligibilitySnapshot?.feeWaiverAudit;
    const auditRecord =
      audit && typeof audit === 'object' ? (audit as Record<string, unknown>) : null;
    if (!auditRecord || String(auditRecord.method || '').trim() !== 'student-academic') {
      throw new BadRequestException('This registration resume link is invalid or expired.');
    }

    const status = String(auditRecord.status || '').trim();
    if (status !== 'hr_verified' && user.feeWaiverJobVerified !== true) {
      throw new BadRequestException('Student academic email verification is not complete yet.');
    }

    const snapshot =
      user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
        ? user.eligibilitySnapshot
        : {};
    const studentCardAudit =
      snapshot.studentCardAudit && typeof snapshot.studentCardAudit === 'object'
        ? (snapshot.studentCardAudit as Record<string, unknown>)
        : {};

    const academicEmail = this.normalizeStudentSchoolEmail(String(studentCardAudit.academicEmail || auditRecord.hrEmail || ''));
    const personalEmail = String(studentCardAudit.personalEmail || auditRecord.learnerEmail || user.email || '').trim();

    return {
      membershipOutcome: 'student-fee-waiver',
      draftUserId: user.id,
      flow: {
        feeWaiverApplicationChoice: true,
        initialQuestionnaireSubmitted: true,
        isIscaMember: false,
        isSingaporePr: false,
        companyRegistrationUnderCompany: false,
        registrationPersona: 'student',
        studentFinalYearLocal: true,
        studentDetailsSubmitted: true,
        studentVerificationTriggered: true,
        studentAcademicEmailVerified: true,
        studentAcademicEmailVerificationPending: false,
        studentAcademicEmail: academicEmail,
        studentPersonalEmail: personalEmail,
        studentCardImageName: academicEmail ? 'student-card-verified' : '',
        studentVerificationFailureAcknowledged: false,
        iscaMemberEservicesFallback: false,
        iscaMemberFailureAcknowledged: false,
        iscaMemberVerificationPassed: null,
        eligibilityVerified: true,
        studentMembershipApplicationAgreed: true,
        studentMembershipOptIn: true,
        eligibilityType: 'student',
      },
    };
  }

  private async ensureStudentFeeWaiverResumeToken(user: UserEntity) {
    const audit = user.eligibilitySnapshot?.feeWaiverAudit;
    const auditRecord =
      audit && typeof audit === 'object' ? (audit as Record<string, unknown>) : {};
    const existingToken = String(auditRecord.studentFeeWaiverResumeToken || '').trim();
    if (existingToken) {
      return existingToken;
    }

    const resumeToken = crypto.randomBytes(32).toString('hex');
    this.mergeFeeWaiverAuditSnapshot(user, {
      studentFeeWaiverResumeToken: resumeToken,
      studentFeeWaiverResumeTokenHash: this.hashFeeWaiverHrVerificationToken(resumeToken),
    });
    await this.userRepository.save(user);
    return resumeToken;
  }

  private async findUserByStudentFeeWaiverResumeToken(token: string) {
    const tokenHash = this.hashFeeWaiverHrVerificationToken(token);
    const byHash = await this.userRepository
      .createQueryBuilder('usr')
      .where(`usr."eligibilitySnapshot"::jsonb @> :auditFilter::jsonb`, {
        auditFilter: JSON.stringify({
          feeWaiverAudit: { studentFeeWaiverResumeTokenHash: tokenHash },
        }),
      })
      .getOne();

    if (byHash) return byHash;

    return this.userRepository
      .createQueryBuilder('usr')
      .where(`usr."eligibilitySnapshot"::jsonb @> :auditFilter::jsonb`, {
        auditFilter: JSON.stringify({
          feeWaiverAudit: { studentFeeWaiverResumeToken: token },
        }),
      })
      .getOne();
  }

  async verifyFeeWaiverAuditCertificate(params: {
    userId?: string;
    learnerEmail?: string;
    certificate?: Express.Multer.File;
  }) {
    const learnerEmail = this.normalizeAuditEmail(params?.learnerEmail);
    if (!learnerEmail) {
      throw new BadRequestException('Learner email is required.');
    }

    this.validateFeeWaiverCertificateFile(params?.certificate);
    const user = await this.resolveUserForFeeWaiverAudit(params?.userId, learnerEmail);
    if (this.normalizeAuditEmail(user.email) !== learnerEmail) {
      throw new BadRequestException('Learner email does not match the registration record.');
    }

    const certificateUrl = await this.saveFeeWaiverAuditFile(
      user,
      'certificates',
      params!.certificate!,
      'education-certificate',
    );

    this.mergeFeeWaiverAuditSnapshot(user, {
      method: 'education-certificate',
      learnerEmail,
      status: 'pending_certificate_review',
      auditSubmitted: true,
      certificateUrl,
      fileName: params?.certificate?.originalname || '',
      submittedAt: new Date().toISOString(),
    });
    user.feeWaiverJobVerified = false;
    await this.userRepository.save(user);

    return {
      submitted: true,
      method: 'education-certificate',
      verified: false,
      pendingReview: true,
      jobVerified: false,
      message:
        'Your certificate has been submitted for review. Please verify your registration email, then sign in while an administrator completes verification.',
    };
  }

  async getVerifiedSignupAccess(token: string) {
    const user = await this.resolveUserByVerifiedSignupAccessToken(token);

    if (!user.isDraft) {
      throw new UnauthorizedException(
        'You have already completed signup with this verified document. Please sign in with your credentials.',
      );
    }

    return {
      allowed: true,
      signupAccessTokenExpiresAt: user.signupAccessTokenExpiresAt,
      prefill: {
        username: user.username || '',
        firstName: user.firstname || '',
        lastName: user.lastname || '',
        email: user.email || '',
        contactNumber: user.contactNumber || '',
        nricFin:
          user.eligibilitySnapshot &&
          typeof user.eligibilitySnapshot === 'object' &&
          user.eligibilitySnapshot.nricAudit &&
          typeof user.eligibilitySnapshot.nricAudit === 'object'
            ? String((user.eligibilitySnapshot.nricAudit as { identifier?: string }).identifier || '').trim()
            : '',
        idType:
          user.eligibilitySnapshot &&
          typeof user.eligibilitySnapshot === 'object' &&
          user.eligibilitySnapshot.nricAudit &&
          typeof user.eligibilitySnapshot.nricAudit === 'object'
            ? String((user.eligibilitySnapshot.nricAudit as { idType?: string }).idType || '').trim()
            : '',
      },
    };
  }

  /**
   * Validates uploaded NRIC images, extracts the Singapore NRIC/FIN via OpenRouter vision,
   * and returns verification JSON without persisting NRIC fields at this stage.
   */
  async verifyNricImages(
    frontImage?: Express.Multer.File,
    backImage?: Express.Multer.File,
    userId?: string,
    authorizationHeader?: string,
  ) {
    const front = this.validateNricImage(frontImage, 'front');
    const back = this.validateNricImage(backImage, 'back');

    const frontHash = crypto.createHash('sha256').update(frontImage!.buffer).digest('hex');
    const backHash = crypto.createHash('sha256').update(backImage!.buffer).digest('hex');

    if (frontHash === backHash) {
      throw new BadRequestException('Front and back NRIC images must be different files.');
    }

    let verificationAttempt = this.buildNricVerificationAttemptResult(
      await this.extractSingaporeIdentifierFromImageWithOpenRouter(frontImage!, 'front'),
      await this.extractSingaporeIdentifierFromImageWithOpenRouter(backImage!, 'back'),
    );
    this.logNricVerificationAttempt(`${this.llmService.getActiveProvider()}-initial`, verificationAttempt);

    let pairExtracted: ExtractedSingaporeIdentifier | null = null;

    if (
      !verificationAttempt.frontResolvedCandidate
      || !verificationAttempt.backResolvedCandidate
      || !verificationAttempt.matchingCandidate
    ) {
      console.warn(
        '[NRIC] Verification retry triggered due to inconsistent OCR extraction. Retrying once with the same uploaded images.',
      );

      const retryAttempt = this.buildNricVerificationAttemptResult(
        await this.extractSingaporeIdentifierFromImageWithOpenRouter(frontImage!, 'front'),
        await this.extractSingaporeIdentifierFromImageWithOpenRouter(backImage!, 'back'),
      );

      verificationAttempt = this.buildNricVerificationAttemptResult(
        this.pickPreferredExtractedResult(verificationAttempt.frontExtracted, retryAttempt.frontExtracted),
        this.pickPreferredExtractedResult(verificationAttempt.backExtracted, retryAttempt.backExtracted),
        this.mergeNricCandidateInputs(
          verificationAttempt.frontCandidateInputs,
          retryAttempt.frontCandidateInputs,
        ),
        this.mergeNricCandidateInputs(
          verificationAttempt.backCandidateInputs,
          retryAttempt.backCandidateInputs,
        ),
      );
      this.logNricVerificationAttempt(`${this.llmService.getActiveProvider()}-retry-merged`, verificationAttempt);
    }

    if (
      !verificationAttempt.frontResolvedCandidate
      || !verificationAttempt.backResolvedCandidate
      || !verificationAttempt.matchingCandidate
    ) {
      console.warn(
        '[NRIC] Pair OCR fallback triggered. Attempting shared front/back document extraction.',
      );

      pairExtracted = await this.extractSingaporeIdentifierFromImagePairWithOpenRouter(
        frontImage!,
        backImage!,
      );

      const pairCandidateInputs = this.buildNricCandidateInputs(pairExtracted);
      if (pairCandidateInputs.length > 0) {
        verificationAttempt = this.buildNricVerificationAttemptResult(
          this.pickPreferredExtractedResult(verificationAttempt.frontExtracted, pairExtracted),
          this.pickPreferredExtractedResult(verificationAttempt.backExtracted, pairExtracted),
          this.mergeNricCandidateInputs(
            verificationAttempt.frontCandidateInputs,
            pairCandidateInputs,
          ),
          this.mergeNricCandidateInputs(
            verificationAttempt.backCandidateInputs,
            pairCandidateInputs,
          ),
        );
        this.logNricVerificationAttempt(`${this.llmService.getActiveProvider()}-pair-merged`, verificationAttempt);
      }
    }

    if (
      !verificationAttempt.frontResolvedCandidate
      || !verificationAttempt.backResolvedCandidate
      || !verificationAttempt.matchingCandidate
    ) {
      console.warn(
        '[NRIC] Local OCR fallback triggered. Attempting offline OCR candidate extraction.',
      );

      const localFrontCandidateInputs = await this.extractSingaporeIdentifierCandidatesWithLocalOcr(
        frontImage!,
        'front',
      );
      const localBackCandidateInputs = await this.extractSingaporeIdentifierCandidatesWithLocalOcr(
        backImage!,
        'back',
      );

      if (localFrontCandidateInputs.length > 0 || localBackCandidateInputs.length > 0) {
        verificationAttempt = this.buildNricVerificationAttemptResult(
          verificationAttempt.frontExtracted,
          verificationAttempt.backExtracted,
          this.mergeNricCandidateInputs(
            verificationAttempt.frontCandidateInputs,
            localFrontCandidateInputs,
          ),
          this.mergeNricCandidateInputs(
            verificationAttempt.backCandidateInputs,
            localBackCandidateInputs,
          ),
        );
        this.logNricVerificationAttempt('local-ocr-merged', verificationAttempt);
      }
    }

    const {
      frontExtracted,
      backExtracted,
      frontResolvedCandidate,
      backResolvedCandidate,
      matchingCandidate,
    } = verificationAttempt;

    if (!frontResolvedCandidate || !backResolvedCandidate) {
      throw new BadRequestException(
        'Could not confirm both front and back images as the same NRIC/FIN document. Please upload clear images of both sides.',
      );
    }

    if (!matchingCandidate) {
      throw new BadRequestException(
        'Front and back images do not belong to the same NRIC/FIN document. Please upload both sides of the same document.',
      );
    }

    const frontName = this.normalizeExtractedDocumentField(frontExtracted.profile.fullName);
    const backName = this.normalizeExtractedDocumentField(backExtracted.profile.fullName);
    if (frontName && backName && frontName !== backName) {
      throw new BadRequestException(
        'Front and back images contain different identity details. Please upload both sides of the same document.',
      );
    }

    const frontDob = this.normalizeExtractedDocumentField(frontExtracted.profile.dateOfBirth);
    const backDob = this.normalizeExtractedDocumentField(backExtracted.profile.dateOfBirth);
    if (frontDob && backDob && frontDob !== backDob) {
      throw new BadRequestException(
        'Front and back images contain different identity details. Please upload both sides of the same document.',
      );
    }

    const extracted = pairExtracted
      ? this.pickPreferredExtractedResult(frontExtracted, pairExtracted)
      : frontExtracted;
    const resolvedCandidate = matchingCandidate;
    const exactIdentifier = resolvedCandidate.rawNormalized || resolvedCandidate.normalized;

    const validation = validateSingaporeNricFin(resolvedCandidate.normalized);
    const salesforceIdType = resolveSalesforceIdTypeByCardColorOrNationality({
      cardColor: extracted.profile.cardColor,
      nationality: extracted.profile.nationality,
    });
    const currentResolvedUser = await this.resolveUserForNricVerification(userId, authorizationHeader);
    const manualReviewReason = this.getManualReviewReason(frontExtracted, backExtracted);

    if (manualReviewReason) {
      throw new BadRequestException(manualReviewReason);
    }

    await this.assertNricFinAvailable(
      validation.normalized,
      this.resolveCurrentUserIdForNricGuard(currentResolvedUser, validation.normalized),
    );

    const parsedVerifiedName = parseSingaporeNricDisplayName(extracted.profile.fullName);
    const verifiedNameAsPerId =
      parsedVerifiedName.nameAsPerId
      || extracted.profile.fullName
      || '';

    const verificationResponse = {
      verified: true,
      message: 'NRIC/FIN extracted and validated successfully.',
      extracted: {
        type: validation.documentType,
        prefix: validation.prefix,
        idType: salesforceIdType,
        identifier: exactIdentifier,
        maskedIdentifier: maskSingaporeNricFin(exactIdentifier),
        firstName: parsedVerifiedName.firstname,
        lastName: parsedVerifiedName.lastname,
        nameAsPerId: verifiedNameAsPerId,
        fullName: verifiedNameAsPerId,
        confidence: extracted.confidence,
        reason: extracted.reason,
        profile: extracted.profile,
      },
      storedOnUser: false,
      userId: currentResolvedUser?.id || null,
      storedAsDraft: false,
      draftUserCreated: false,
      signupAccessToken: null as string | null,
      signupAccessTokenExpiresAt: null as Date | null,
      checks: {
        frontImage: front,
        backImage: back,
        filesAreDistinct: true,
        frontBackDocumentMatch: true,
      },
    };

    try {
      const { user: auditUser, createdAsDraft } = await this.resolveOrCreateUserForNricVerification(
        extracted,
        userId,
        authorizationHeader,
      );
      const frontUrl = await this.localStorageService.saveFile(frontImage!, `fee-waiver-audit/nric/${auditUser.id}`, {
        fileName: 'nric-front',
      });
      const backUrl = await this.localStorageService.saveFile(backImage!, `fee-waiver-audit/nric/${auditUser.id}`, {
        fileName: 'nric-back',
      });
      const existingSnapshot =
        auditUser.eligibilitySnapshot && typeof auditUser.eligibilitySnapshot === 'object'
          ? auditUser.eligibilitySnapshot
          : {};
      auditUser.eligibilitySnapshot = {
        ...existingSnapshot,
        verifiedNricFin: validation.normalized,
        nricAudit: {
          frontUrl,
          backUrl,
          maskedIdentifier: maskSingaporeNricFin(exactIdentifier),
          identifier: validation.normalized,
          prefix: validation.prefix,
          idType: salesforceIdType,
          savedAt: new Date().toISOString(),
        },
      };
      assignVerifiedNricFinToUser(auditUser, validation.normalized);
      const access = await this.issueVerifiedSignupAccessToken(auditUser);
      verificationResponse.storedOnUser = true;
      verificationResponse.userId = auditUser.id;
      verificationResponse.storedAsDraft = auditUser.isDraft;
      verificationResponse.draftUserCreated = createdAsDraft;
      verificationResponse.signupAccessToken = access.signupAccessToken;
      verificationResponse.signupAccessTokenExpiresAt = access.signupAccessTokenExpiresAt;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.warn(
        `Could not persist NRIC audit images: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Could not complete NRIC verification. Please try again.');
    }

    if (!verificationResponse.storedOnUser) {
      throw new BadRequestException('Could not complete NRIC verification. Please try again.');
    }

    return verificationResponse;
  }

  private assertValidNricIdentifier(identifier?: string): ReturnType<typeof validateSingaporeNricFin> {
    const normalized = normalizeSingaporeNricFin(identifier || '');

    if (!normalized) {
      throw new BadRequestException('NRIC/FIN number is required.');
    }

    let validation: ReturnType<typeof validateSingaporeNricFin>;
    try {
      validation = validateSingaporeNricFin(normalized);
    } catch {
      throw new BadRequestException(SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidFormat);
    }

    if (!validation.isValid) {
      throw new BadRequestException(SINGAPORE_NRIC_FIN_USER_MESSAGES.invalidChecksum);
    }

    return validation;
  }

  /**
   * Lightweight checksum-only validation for a Singapore NRIC/FIN identifier (no AI / persistence).
   */
  validateNricIdentifier(identifier?: string) {
    const validation = this.assertValidNricIdentifier(identifier);

    return {
      valid: true,
      normalized: validation.normalized,
      type: validation.documentType,
      prefix: validation.prefix,
      idType: resolveSalesforceIdTypeByCardColorOrNationality({
        cardColor: '',
        nationality: '',
      }),
      maskedIdentifier: validation.masked,
    };
  }

  /**
   * Validates a manually entered Singapore NRIC/FIN using checksum rules only (no AI / image upload).
   */
  async verifyNricManual(params: {
    identifier?: string;
    fullName?: string;
    nameAsPerId?: string;
    firstName?: string;
    lastName?: string;
    nationality?: string;
    idType?: string;
    dateOfBirth?: string;
    userId?: string;
    authorizationHeader?: string;
  }) {
    const identifier = normalizeSingaporeNricFin(params.identifier || '');
    const dateOfBirth = this.assertValidManualDateOfBirth(params.dateOfBirth);
    const nationality = this.sanitizeExtractedTextField(params.nationality);

    const nameAsPerIdInput = this.sanitizeExtractedTextField(
      params.nameAsPerId || params.fullName,
    );
    const parsedName = parseSingaporeNricDisplayName(nameAsPerIdInput);
    const firstName = this.sanitizeExtractedTextField(params.firstName) || parsedName.firstname;
    const lastName = this.sanitizeExtractedTextField(params.lastName) || parsedName.lastname;
    const nameAsPerId =
      nameAsPerIdInput
      || parsedName.nameAsPerId
      || [lastName, firstName].filter(Boolean).join(' ').trim();

    if (!nameAsPerId) {
      throw new BadRequestException('Name as per ID is required for manual NRIC verification.');
    }

    if (!identifier) {
      throw new BadRequestException('NRIC/FIN number is required.');
    }

    const validation = this.assertValidNricIdentifier(identifier);
    const explicitIdType = String(params.idType || '').trim();
    const salesforceIdType =
      explicitIdType === 'Blue NRIC' || explicitIdType === 'Pink NRIC'
        ? explicitIdType
        : resolveSalesforceIdTypeByCardColorOrNationality({ nationality });

    const currentResolvedUser = await this.resolveUserForNricVerification(
      params.userId,
      params.authorizationHeader,
    );

    await this.assertNricFinAvailable(
      validation.normalized,
      this.resolveCurrentUserIdForNricGuard(currentResolvedUser, validation.normalized),
    );

    const extracted: ExtractedSingaporeIdentifier = {
      identifier: validation.normalized,
      candidates: [validation.normalized],
      profile: {
        fullName: nameAsPerId,
        dateOfBirth,
        nationality,
        cardColor: '',
        sex: '',
        address: '',
      },
      confidence: 1,
      reason: 'manual entry',
      rawResponse: '',
    };

    const verificationResponse = {
      verified: true,
      verificationMethod: 'manual' as const,
      message: 'NRIC/FIN validated successfully.',
      extracted: {
        type: validation.documentType,
        prefix: validation.prefix,
        idType: salesforceIdType,
        identifier: validation.normalized,
        maskedIdentifier: validation.masked,
        firstName,
        lastName,
        nameAsPerId,
        fullName: nameAsPerId,
        confidence: 1,
        reason: 'manual entry',
        profile: extracted.profile,
      },
      storedOnUser: false,
      userId: currentResolvedUser?.id || null,
      storedAsDraft: false,
      draftUserCreated: false,
      signupAccessToken: null as string | null,
      signupAccessTokenExpiresAt: null as Date | null,
      checks: {
        checksumValid: true,
        manualEntry: true,
      },
    };

    try {
      const { user: auditUser, createdAsDraft } = await this.resolveOrCreateUserForNricVerification(
        extracted,
        params.userId,
        params.authorizationHeader,
      );
      const existingSnapshot =
        auditUser.eligibilitySnapshot && typeof auditUser.eligibilitySnapshot === 'object'
          ? auditUser.eligibilitySnapshot
          : {};
      auditUser.eligibilitySnapshot = {
        ...existingSnapshot,
        verifiedNricFin: validation.normalized,
        nricAudit: {
          verificationMethod: 'manual',
          maskedIdentifier: validation.masked,
          identifier: validation.normalized,
          prefix: validation.prefix,
          idType: salesforceIdType,
          fullName: nameAsPerId,
          firstName,
          lastName,
          nameAsPerId,
          dateOfBirth,
          nationality,
          savedAt: new Date().toISOString(),
        },
      };
      assignVerifiedNricFinToUser(auditUser, validation.normalized);
      const access = await this.issueVerifiedSignupAccessToken(auditUser);
      verificationResponse.storedOnUser = true;
      verificationResponse.userId = auditUser.id;
      verificationResponse.storedAsDraft = auditUser.isDraft;
      verificationResponse.draftUserCreated = createdAsDraft;
      verificationResponse.signupAccessToken = access.signupAccessToken;
      verificationResponse.signupAccessTokenExpiresAt = access.signupAccessTokenExpiresAt;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.warn(
        `Could not persist manual NRIC verification audit: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('Could not complete NRIC verification. Please try again.');
    }

    if (!verificationResponse.storedOnUser) {
      throw new BadRequestException('Could not complete NRIC verification. Please try again.');
    }

    if (this.shouldLogNricDebugDetails()) {
      console.info('[NRIC] Manual verification result:', {
        verified: verificationResponse.verified,
        extracted: verificationResponse.extracted,
        userId: verificationResponse.userId,
        storedOnUser: verificationResponse.storedOnUser,
      });
    }

    return verificationResponse;
  }

  /**
   * Public membership check: company reference ID must match a Corporate HR account's companyCode
   * (or an explicitly configured public/demo company code).
   */
  async verifyCompanyReference(companyReferenceId: string): Promise<{
    verified: boolean;
    companyCode?: string;
    name?: string;
    industry?: string;
  }> {
    const code = String(companyReferenceId || '').trim();
    if (!code) {
      return { verified: false };
    }

    const enrollmentInvite = await this.companyEnrollmentService.findByCompanyCode(code);
    if (enrollmentInvite?.isActive) {
      const validation = await this.companyEnrollmentService.validateForEnrollment({
        companyCode: code,
        viaQr: false,
      });
      if (validation.valid) {
        return {
          verified: true,
          companyCode: enrollmentInvite.companyCode,
          name: enrollmentInvite.label || enrollmentInvite.companyCode,
          industry: 'To be confirmed',
        };
      }
      // Invite exists but blocked (quota) — still treat as known company for name, but mark unverified? 
      // Prefer failing verify with clear path via enrollment validate on signup.
      if (validation.reason === 'quota_full' || validation.reason === 'inactive') {
        throw new BadRequestException(validation.message);
      }
    }

    const corporateUsers = await this.userRepository
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.Corporate })
      .andWhere('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code })
      .andWhere('u.isDraft = :isDraft', { isDraft: false })
      .getMany();

    if (corporateUsers.length) {
      const resolvedCode = String(corporateUsers[0]?.companyCode || code).trim();
      const resolvedName = await this.resolveVerifiedCorporateCompanyName(resolvedCode, corporateUsers);
      return {
        verified: true,
        companyCode: resolvedCode,
        name: resolvedName,
        industry: this.resolveCorporateAccountIndustry(corporateUsers[0]),
      };
    }

    const envMatch = this.matchConfiguredCorporateCompanyCode(code);
    if (envMatch) {
      const resolvedName = await this.resolveVerifiedCorporateCompanyName(envMatch, []);
      return {
        verified: true,
        companyCode: envMatch,
        name: resolvedName,
        industry: 'To be confirmed',
      };
    }

    return { verified: false };
  }

  private async resolveVerifiedCorporateCompanyName(
    companyCode: string,
    corporateUsers: UserEntity[],
  ): Promise<string> {
    for (const corporateUser of corporateUsers) {
      const fromUserInfo = this.readCorporateAccountNameFromUserInfo(corporateUser);
      if (fromUserInfo) return fromUserInfo;
    }

    const fromSalesforce = await this.oauthAuthService.resolveCorporateCompanyDisplayName(companyCode);
    if (fromSalesforce) return fromSalesforce;

    return '';
  }

  private readCorporateAccountNameFromUserInfo(user: UserEntity): string {
    const raw = user.salesforceUserInfoRaw;
    if (!raw || typeof raw !== 'object') return '';
    const corporate =
      (raw as Record<string, unknown>).corporate
      && typeof (raw as Record<string, unknown>).corporate === 'object'
        ? ((raw as Record<string, unknown>).corporate as Record<string, unknown>)
        : null;
    return String(corporate?.accountName || '').trim();
  }

  private matchConfiguredCorporateCompanyCode(code: string): string | null {
    const candidates = [
      process.env.CORPORATE_PUBLIC_COMPANY_CODE,
      process.env.CORPORATE_DEMO_COMPANY_CODE,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    const match = candidates.find((candidate) => candidate.toLowerCase() === code.toLowerCase());
    return match || null;
  }

  private resolveCorporateAccountIndustry(user: UserEntity): string {
    const raw = user.salesforceUserInfoRaw;
    if (raw && typeof raw === 'object') {
      const corporate =
        (raw as Record<string, unknown>).corporate
        && typeof (raw as Record<string, unknown>).corporate === 'object'
          ? ((raw as Record<string, unknown>).corporate as Record<string, unknown>)
          : null;
      const organisationType = String(corporate?.organisationType || '').trim();
      if (organisationType) return organisationType;
    }
    return 'To be confirmed';
  }

  /** Prefer explicit companyCode; else use verified company reference from eligibility snapshot. */
  private resolveSignupCompanyCode(userDto: UserDto): string | null {
    const explicit = String(userDto.companyCode || '').trim();
    if (explicit) return explicit;

    const snapshot =
      userDto.eligibilitySnapshot && typeof userDto.eligibilitySnapshot === 'object'
        ? userDto.eligibilitySnapshot
        : null;
    if (!snapshot) return null;

    const confirmed = (snapshot as Record<string, unknown>).companyReferenceConfirmed === true;
    const referenceId = String(
      (snapshot as Record<string, unknown>).companyReferenceId || '',
    ).trim();
    if (confirmed && referenceId) return referenceId;
    return null;
  }

  private resolveSignupViaQr(userDto: UserDto): boolean {
    const snapshot =
      userDto.eligibilitySnapshot && typeof userDto.eligibilitySnapshot === 'object'
        ? (userDto.eligibilitySnapshot as Record<string, unknown>)
        : null;
    return snapshot?.companyEnrollmentViaQr === true;
  }

  /**
   * When a company enrollment invite exists for the code, enforce quota / QR rules
   * and consume one seat atomically before registration completes.
   */
  private async consumeCompanyEnrollmentSeatIfNeeded(userDto: UserDto, companyCode: string | null) {
    if (!companyCode) return;
    await this.companyEnrollmentService.consumeSeatForEnrollment({
      companyCode,
      viaQr: this.resolveSignupViaQr(userDto),
    });
  }

  async register(userDto: UserDto): Promise<{ message: string, user: UserEntity }> {
    try {
      const verifiedSignupUser = userDto.signupAccessToken
        ? await this.resolveUserByVerifiedSignupAccessToken(userDto.signupAccessToken)
        : null;

      if (verifiedSignupUser && !verifiedSignupUser.isDraft) {
        throw new BadRequestException('This verified signup link has already been used.');
      }
      const { normalizedUsername, hashedPassword } = await this.validateSignupInput(
        userDto,
        verifiedSignupUser?.id
      );
      const resolvedCompanyCode = this.resolveSignupCompanyCode(userDto);
      // Reserve seat before creating the account so concurrent signups cannot overbook.
      await this.consumeCompanyEnrollmentSeatIfNeeded(userDto, resolvedCompanyCode);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      let newUser: UserEntity;

      if (verifiedSignupUser) {
        verifiedSignupUser.username = normalizedUsername;
        verifiedSignupUser.firstname = userDto.firstname;
        verifiedSignupUser.lastname = userDto.lastname;
        verifiedSignupUser.email = userDto.email;
        verifiedSignupUser.contactNumber = userDto.contactNumber?.trim() || null;
        verifiedSignupUser.companyCode = resolvedCompanyCode;
        verifiedSignupUser.persona = userDto.persona?.trim() || verifiedSignupUser.persona || null;
        verifiedSignupUser.password = hashedPassword;
        verifiedSignupUser.authProvider = AuthProvider.LOCAL;
        verifiedSignupUser.role = userDto.role || verifiedSignupUser.role || UserRole.User;
        verifiedSignupUser.status = userDto.status || UserStatus.Active;
        verifiedSignupUser.isVerified = false;
        verifiedSignupUser.isDraft = false;
        verifiedSignupUser.verificationToken = verificationToken;
        verifiedSignupUser.verificationTokenExpires = verificationTokenExpires;
        verifiedSignupUser.signupAccessTokenHash = null;
        verifiedSignupUser.signupAccessTokenExpiresAt = null;
        this.applyEligibilityTracking(verifiedSignupUser, userDto);
        newUser = verifiedSignupUser;
      } else {
        // Create the new user (LOCAL auth provider)
        newUser = this.userRepository.create({
          username: normalizedUsername,
          firstname: userDto.firstname,
          lastname: userDto.lastname,
          email: userDto.email,
          contactNumber: userDto.contactNumber?.trim() || null,
          companyCode: resolvedCompanyCode,
          persona: userDto.persona?.trim() || null,
          password: hashedPassword,
          authProvider: AuthProvider.LOCAL,
          role: userDto.role || UserRole.User,
          status: userDto.status || UserStatus.Active,
          isVerified: false,
          verificationToken: verificationToken,
          verificationTokenExpires: verificationTokenExpires,
        });
        this.applyEligibilityTracking(newUser, userDto);
      }

      await this.userRepository.save(newUser); // Save the new user

      // Send verification email
      const userName = `${newUser.firstname} ${newUser.lastname}`;
      try {
        await this.emailService.sendVerificationEmail(newUser.email!, verificationToken, userName);
      } catch (emailError) {
        // Log error but don't fail registration if email fails
        console.error('Failed to send verification email:', emailError);
      }

      return {
        message: 'User registered successfully. Please check your email to verify your account.',
        user: newUser,
      };

    } catch (err: unknown) {
      if (err instanceof Error) {
        throw new BadRequestException(err.message);
      }
      throw err;

    }
  }

  // Login user with email/username and password
  async login(loginDto: LoginDto): Promise<{ message: string; user: Partial<UserEntity> }> {
    try {
      // Support both 'identifier' (from frontend) and 'email' (from Postman)
      const identifier = (loginDto.identifier || loginDto.email || '').trim();
      
      if (!identifier) {
        throw new BadRequestException('Email or username must be provided.');
      }

      if (!loginDto.password) {
        throw new BadRequestException('Password must be provided.');
      }
      // const isEmail = validateEmail(identifier);
      // For login identification, only check email format (do not apply disposable/blocked-name rules).
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
      const preferredRoleRaw = String(loginDto.preferredRole || '').trim().toLowerCase();
      const preferredRole =
        preferredRoleRaw === 'corporate'
          ? UserRole.Corporate
          : preferredRoleRaw === 'user' || preferredRoleRaw === 'individual'
            ? UserRole.User
            : null;

      // Role-aware lookup when Individual + Corporate share the same email/username
      let user: UserEntity | null = null;
      if (isEmail) {
        if (preferredRole) {
          user = await this.userRepository.findOne({
            where: { email: identifier, role: preferredRole },
          });
        } else {
          user =
            (await this.userRepository.findOne({
              where: { email: identifier, role: UserRole.User },
            }))
            || (await this.userRepository.findOne({
              where: { email: identifier, role: UserRole.Corporate },
            }))
            || (await this.userRepository.findOne({ where: { email: identifier } }));
        }
      } else {
        const normalizedUsername = this.normalizeUsername(identifier);
        const byLocal = this.userRepository
          .createQueryBuilder('user')
          .where('LOWER(user.username) = LOWER(:username)', { username: normalizedUsername });
        if (preferredRole) {
          byLocal.andWhere('user.role = :role', { role: preferredRole });
        }
        user = await byLocal.getOne();

        if (!user) {
          const bySf = this.userRepository
            .createQueryBuilder('user')
            .where('LOWER(user.salesforceUsername) = LOWER(:username)', {
              username: normalizedUsername,
            });
          if (preferredRole) {
            bySf.andWhere('user.role = :role', { role: preferredRole });
          }
          user = await bySf.getOne();
        }
      }

      if (!user) {
        throw new UnauthorizedException(
          isEmail
            ? 'No account found with this email address. Please check and try again.'
            : 'No account found with this username. Please check and try again.',
        );
      }

      if (!user.password) {
        throw new UnauthorizedException('This account uses SSO. Please sign in with SSO.');
      }

      // Banned accounts are blocked.
      if (user.status === UserStatus.Banned) {
        throw new UnauthorizedException('Your account has been banned. Please contact support.');
      }

      if (user.isDraft) {
        throw new UnauthorizedException('Your membership signup is still a draft. Please complete payment first.');
      }

      // Check if user is verified
      if (!user.isVerified) {
        // Generate new verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // Save verification token to user
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await this.userRepository.save(user);

        // Send verification email
        const userName = `${user.firstname} ${user.lastname}`;
        try {
          await this.emailService.sendVerificationEmail(user.email!, verificationToken, userName);
        } catch (emailError) {
          // Log error but don't fail login if email fails
          console.error('Failed to send verification email:', emailError);
        }

        throw new UnauthorizedException('Your account is not verified. Please check your email to verify your account. A new verification email has been sent.');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect password. Please try again.');
      }

      // Exclude sensitive fields from the returned user
      const { password, ...userWithoutPassword } = user;

      return {
        message: 'User Logged in successfully',
        user: userWithoutPassword,
      };
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Login failed. Please check your credentials and try again.', error.message);
    }
  }

  // Forgot password - send reset link to email 0
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    try {
      if (!forgotPasswordDto.email) {
        throw new BadRequestException('Email is required');
      }

      const isEmail = validateEmail(forgotPasswordDto.email);
      if (!isEmail) {
        throw new BadRequestException('Please provide a valid email address.');
      }

      // Find the user by email
      const user = await this.userRepository.findOne({
        where: { email: forgotPasswordDto.email },
      });

      if (!user) {
        throw new NotFoundException('Email not found. Please enter a registered email address.');
      }

      // Banned accounts are blocked.
      if (user.status === UserStatus.Banned) {
        throw new UnauthorizedException('Your account has been banned. Please contact support.');
      }

      // Check if user is verified
      if (!user.isVerified) {
        throw new UnauthorizedException('Please verify your email before resetting password');
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save reset token to user
      user.resetToken = resetToken;
      user.resetTokenExpires = resetTokenExpires;
      await this.userRepository.save(user);

      // Send reset password email
      const userName = `${user.firstname} ${user.lastname}`;
      await this.emailService.sendResetPasswordEmail(user.email!, resetToken, userName);

      return { message: 'Password reset link has been sent to your email.' };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to process password reset request.', error.message);
    }
  }

  // Reset password with token
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    try {
      if (!resetPasswordDto.token) {
        throw new BadRequestException('Reset token is required');
      }

      if (!resetPasswordDto.password) {
        throw new BadRequestException('New password is required');
      }

      // Find user by reset token
      const user = await this.userRepository.findOne({
        where: { resetToken: resetPasswordDto.token },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Banned accounts are blocked.
      if (user.status === UserStatus.Banned) {
        throw new UnauthorizedException('Your account has been banned. Please contact support.');
      }

      // Check if user is verified
      if (!user.isVerified) {
        throw new UnauthorizedException('Please verify your email before resetting password');
      }

      // Check if token has expired
      if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
        // Clear expired token
        user.resetToken = null;
        user.resetTokenExpires = null;
        await this.userRepository.save(user);
        throw new BadRequestException('Reset token has expired. Please request a new one.');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);

      // Update password and clear reset token
      user.password = hashedPassword;
      user.resetToken = null;
      user.resetTokenExpires = null;
      await this.userRepository.save(user);

      return { message: 'Password has been reset successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to reset password.', error.message);
    }
  }

  // Verify email with token
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ message: string }> {
    try {
      if (!verifyEmailDto.token) {
        throw new BadRequestException('Verification token is required');
      }

      // Find user by verification token
      const user = await this.userRepository.findOne({
        where: { verificationToken: verifyEmailDto.token },
      });

      if (!user) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      // Check if user is already verified
      if (user.isVerified) {
        return { message: 'Email is already verified' };
      }

      // Check if token has expired
      if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
        // Clear expired token
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await this.userRepository.save(user);
        throw new BadRequestException('Verification token has expired. Please register again or request a new verification email.');
      }

      // Mark user as verified and clear verification token
      user.isVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      await this.userRepository.save(user);

      return { message: 'Email verified successfully' };
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to verify email.', error.message);
    }
  }

  // Resend verification email
  async resendVerification(resendVerificationDto: ResendVerificationDto): Promise<{ message: string }> {
    try {
      if (!resendVerificationDto.email) {
        throw new BadRequestException('Email is required');
      }

      const isEmail = validateEmail(resendVerificationDto.email);
      if (!isEmail) {
        throw new BadRequestException('Please provide a valid email address.');
      }

      // Find the user by email
      const user = await this.userRepository.findOne({
        where: { email: resendVerificationDto.email },
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return { message: 'If the email exists, a verification email has been sent.' };
      }

      // Check if user is already verified
      if (user.isVerified) {
        return { message: 'Email is already verified. You can log in now.' };
      }

      // Banned accounts are blocked.
      if (user.status === UserStatus.Banned) {
        throw new UnauthorizedException('Your account has been banned. Please contact support.');
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Save verification token to user
      user.verificationToken = verificationToken;
      user.verificationTokenExpires = verificationTokenExpires;
      await this.userRepository.save(user);

      // Send verification email
      const userName = `${user.firstname} ${user.lastname}`;
      try {
        await this.emailService.sendVerificationEmail(user.email!, verificationToken, userName);
      } catch (emailError) {
        // Log error but don't fail if email fails
        console.error('Failed to send verification email:', emailError);
        throw new BadRequestException('Failed to send verification email. Please try again later.');
      }

      return { message: 'If the email exists, a verification email has been sent.' };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to resend verification email.', error.message);
    }
  }

  /** Return sanitized user profile for /auth/me. */
  async getUserProfile(userId: string): Promise<Partial<UserEntity>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, verificationToken, resetToken, socialAccessToken, signupAccessTokenHash, ...safe } =
      user;
    return safe;
  }

  /** SSO-aware logout: clear Salesforce session, revoke IdP token, clear social token. */
  async logout(
    userId: string,
    options?: { supplementalSocialToken?: string },
  ): Promise<{ message: string; browserLogoutUrl?: string | null }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { message: 'Logged out successfully' };
    }

    const socialToken =
      String(user.socialAccessToken || '').trim()
      || String(options?.supplementalSocialToken || '').trim();

    if (socialToken) {
      try {
        await this.oauthAuthService.clearSalesforceMobileSession(socialToken);
      } catch (err) {
        console.warn('Salesforce clearSession during logout (non-fatal):', err);
      }
      try {
        await this.oauthAuthService.revokeIdpToken(socialToken);
      } catch (err) {
        console.warn('IdP revoke during logout (non-fatal):', err);
      }
    }

    user.socialAccessToken = null;
    await this.userRepository.save(user);

    const shouldEndIdpBrowserSession =
      user.authProvider === AuthProvider.OAUTH || Boolean(socialToken);
    const browserLogoutUrl = shouldEndIdpBrowserSession
      ? this.oauthAuthService.buildBrowserLogoutUrl()
      : null;

    return {
      message: shouldEndIdpBrowserSession
        ? 'Logged out successfully from both app and SSO'
        : 'Logged out successfully',
      browserLogoutUrl,
    };
  }

  async submitAccountingDeclarationHrEmail(params: {
    nricFin?: string;
    learnerName?: string;
    hrEmail?: string;
  }) {
    const learnerName = String(params?.learnerName || '').trim() || 'Applicant';
    const nricFin = normalizeSingaporeNricFin(params?.nricFin || '');

    if (!nricFin) {
      throw new BadRequestException(
        'Verified NRIC details are required to send employer verification.',
      );
    }

    const user = await findUserByVerifiedNricFin(this.userRepository, nricFin);
    if (!user) {
      throw new BadRequestException(
        'Could not find the registration record for this applicant. Please complete NRIC verification again.',
      );
    }

    const hrEmail = await this.assertValidHrAuditEmail(params?.hrEmail, user.email);

    const existingAudit =
      user.eligibilitySnapshot?.feeWaiverAudit
      && typeof user.eligibilitySnapshot.feeWaiverAudit === 'object'
        ? (user.eligibilitySnapshot.feeWaiverAudit as Record<string, unknown>)
        : null;
    const existingToken = String(existingAudit?.hrVerificationToken || '').trim();
    const canReuseToken =
      existingAudit?.status === 'pending_hr_verification'
      && String(existingAudit?.method || '').trim() === 'accounting-declaration-hr'
      && existingToken.length > 0;

    const hrVerificationToken = canReuseToken
      ? existingToken
      : crypto.randomBytes(32).toString('hex');

    const learnerEmail =
      this.normalizeAuditEmail(user.email) || nricFin;

    // Persist token before emailing so the HR job-verification link resolves.
    this.mergeFeeWaiverAuditSnapshot(user, {
      method: 'accounting-declaration-hr',
      hrEmail,
      learnerEmail,
      nricFin,
      status: 'pending_hr_verification',
      auditSubmitted: true,
      hrVerificationToken,
      hrVerificationTokenHash: this.hashFeeWaiverHrVerificationToken(hrVerificationToken),
      submittedAt: new Date().toISOString(),
    });
    user.feeWaiverJobVerified = false;
    await this.userRepository.save(user);

    await this.emailService.sendFeeWaiverHrVerificationEmail({
      hrEmail,
      learnerEmail,
      learnerName,
      verificationToken: hrVerificationToken,
    });

    return { success: true, message: 'Verification email sent to your employer.' };
  }

  async verifyAccountingDeclarationCertificate(params: {
    certificate?: Express.Multer.File;
    nricFin?: string;
  }) {
    if (!params?.certificate?.buffer?.length) {
      throw new BadRequestException('Please upload your certificate.');
    }
    if (params.certificate.size > 8 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Maximum size is 8MB.');
    }
    const mime = String(params.certificate.mimetype || '').toLowerCase();
    const isImage = mime.startsWith('image/');
    try {
      if (isImage) {
        return await this.assessAccountingCertFromImage(params.certificate);
      }
      const text = await this.extractResumePlainTextFromUpload(params.certificate);
      return await this.assessAccountingCertFromText(text);
    } catch (err) {
      this.logger.warn(`Accounting cert AI verification failed: ${(err as Error)?.message}`);
      return {
        verified: false,
        status: 'rejected',
        score: 0,
        candidateName: '',
        qualificationName: '',
        institutionName: '',
        awardingUniversity: '',
        graduationDate: '',
        certificateNumber: '',
        isAccountingRelated: false,
        needsManualReview: false,
        reason: '',
        message: 'This qualification does not appear to be accounting-related.',
      };
    }
  }

  private async assessAccountingCertFromText(text: string) {
    const result = await this.llmService.chat({
      useCase: 'experienced',
      temperature: 0,
      maxTokens: 600,
      messages: [
        { role: 'system', content: ACCOUNTING_CERT_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify({ documentTextExcerpt: text.slice(0, 8000) }) },
      ],
    });
    return this.parseAccountingCertAiResponse(result.text);
  }

  private async assessAccountingCertFromImage(file: Express.Multer.File) {
    const result = await this.llmService.chat({
      useCase: 'experienced',
      temperature: 0,
      maxTokens: 800,
      messages: [
        { role: 'system', content: ACCOUNTING_CERT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: ACCOUNTING_CERT_USER_PROMPT },
            { type: 'image_url', image_url: { url: this.buildDataUrl(file) } },
          ],
        },
      ],
    });
    return this.parseAccountingCertAiResponse(result.text);
  }

  private parseAccountingCertAiResponse(text: string) {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No JSON found in AI response: ${cleaned.slice(0, 200)}`);
    }
    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const confidence = Number(raw.confidence ?? 0);
    const score = Math.round(confidence * 100);
    const isValid = Boolean(raw.isValidDocument);
    const isAccounting = Boolean(raw.isAccountingRelated);
    const needsReview = Boolean(raw.needsManualReview);
    const finalStatus: 'approved' | 'rejected' =
      isValid && isAccounting && !needsReview && score >= 70 ? 'approved' : 'rejected';
    return {
      verified: finalStatus === 'approved',
      status: finalStatus,
      score,
      candidateName: String(raw.candidateName || ''),
      qualificationName: String(raw.qualificationName || ''),
      institutionName: String(raw.institutionName || ''),
      awardingUniversity: String(raw.awardingUniversity || ''),
      graduationDate: String(raw.graduationDate || ''),
      certificateNumber: raw.certificateNumber ? String(raw.certificateNumber) : '',
      isAccountingRelated: isAccounting,
      needsManualReview: needsReview,
      reason: String(raw.reason || ''),
      message:
        finalStatus === 'approved'
          ? 'Your qualification has been verified as accounting-related.'
          : 'This qualification does not appear to be accounting-related.',
    };
  }
}