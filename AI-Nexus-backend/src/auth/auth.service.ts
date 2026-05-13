// src/auth/auth.service.ts
import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserDto, LoginDto, ResendVerificationDto } from '../user/users.dto';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from './../user/users.entity';
import { UserRole, UserStatus, AuthProvider } from './../user/users.entity';
import { validateEmail } from './../utils/auth.utils';
import { verifyEmailAddress } from './../utils/email-verification.util';
import { EmailService } from './../service/email.service';
import { ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from '../user/users.dto';
import * as crypto from 'crypto';
import { OAuthAuthService } from './oauth-auth.service';
import {
  collectValidSingaporeNricFinCandidates,
  maskSingaporeNricFin,
  pickPreferredResolvedSingaporeNricFinCandidate,
  validateSingaporeNricFin,
  normalizeSingaporeNricFin,
} from './utils/singapore-nric-fin.util';

interface ExtractedSingaporeIdentifier {
  identifier: string;
  candidates: string[];
  profile: {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
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
  source: 'openrouter' | 'heuristic';
}

@Injectable()
export class AuthService {
  private readonly studentVerificationSessions = new Map<string, StudentVerificationSession>();

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private readonly JwtService: JwtService, // Inject JwtService
    private readonly emailService: EmailService,
    private readonly oauthAuthService: OAuthAuthService,
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

    if (!(schoolEmail.endsWith('.edu') || schoolEmail.endsWith('@yopmail.com'))) {
      throw new BadRequestException('School email must end with .edu or use @yopmail.com');
    }

    return { schoolName, graduationDate, schoolEmail };
  }

  private getStudentAiMaxTokens(): number {
    const configured = Number(process.env.OPENROUTER_STUDENT_MAX_TOKENS ?? '300');
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
    } else if (schoolEmail.endsWith('@yopmail.com')) {
      score += 12;
      reasons.push('Yopmail is accepted for testing, but it reduces verification confidence.');
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
    } else if (schoolEmail.endsWith('@yopmail.com')) {
      score += 3;
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

  private parseStudentEligibilityAiResponse(rawResponse: string): StudentEligibilityAssessment {
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
      source: 'openrouter',
    };
  }

  private async assessStudentEligibilityWithOpenRouter(input: {
    schoolName: string;
    graduationDate: string;
    schoolEmail: string;
  }): Promise<StudentEligibilityAssessment> {
    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
      throw new BadRequestException('OpenRouter is not configured. Please set OPENROUTER_API_KEY.');
    }

    const baseUrl = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').trim().replace(/\/$/, '');
    const model = String(process.env.OPENROUTER_STUDENT_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini').trim();
    const appName = String(process.env.OPENROUTER_APP_NAME || 'AI Nexus').trim();
    const appUrl = String(process.env.OPENROUTER_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').trim();

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': appUrl,
        'X-Title': appName,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: this.getStudentAiMaxTokens(),
        messages: [
          {
            role: 'system',
            content:
              'You are an ATS-style eligibility reviewer for student membership screening. Evaluate only the provided fields. Return strict JSON only with keys: score, status, reasons, confidence. "score" must be 0-100. "status" must be one of eligible, manual_review, ineligible. "reasons" must be an array of 1-5 short strings. "confidence" must be 0-1. Be conservative with temporary inboxes and inconsistent graduation dates. Do not add markdown.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              schoolName: input.schoolName,
              graduationDate: input.graduationDate,
              schoolEmail: input.schoolEmail,
              rule: 'Current tertiary student evidence only.',
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(
        this.getOpenRouterFriendlyErrorMessage(response.status, errorText, 'single'),
      );
    }

    const data = await response.json();
    const rawText = this.getOpenRouterMessageText(data?.choices?.[0]?.message?.content);
    return this.parseStudentEligibilityAiResponse(rawText);
  }

  private getNricDataKey(): Buffer {
    const explicitKey = String(process.env.NRIC_DATA_ENCRYPTION_KEY || '').trim();

    if (explicitKey) {
      if (/^[a-fA-F0-9]{64}$/.test(explicitKey)) {
        return Buffer.from(explicitKey, 'hex');
      }

      try {
        const base64Key = Buffer.from(explicitKey, 'base64');
        if (base64Key.length === 32) {
          return base64Key;
        }
      } catch {
        // Fall through to the validation error below.
      }

      throw new Error(
        'NRIC_DATA_ENCRYPTION_KEY must be a 32-byte base64 value or a 64-character hex string.'
      );
    }

    const fallbackKey = String(process.env.JWT_SECRET || '').trim();
    if (process.env.NODE_ENV !== 'production' && fallbackKey) {
      return crypto.createHash('sha256').update(`nric-dev:${fallbackKey}`).digest();
    }

    throw new Error('NRIC_DATA_ENCRYPTION_KEY is required for secure NRIC verification.');
  }

  private encryptNricValue(value: string): string {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) return '';

    const key = this.getNricDataKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(normalizedValue, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `v1:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private hashCanonicalNricValue(value: string): string {
    const normalizedValue = normalizeSingaporeNricFin(value);
    if (!normalizedValue) return '';

    return crypto
      .createHmac('sha256', this.getNricDataKey())
      .update(normalizedValue)
      .digest('hex');
  }

  private getMinimumNricConfidence(): number {
    const configured = Number(process.env.NRIC_MIN_AI_CONFIDENCE ?? '0.85');
    if (!Number.isFinite(configured)) return 0.85;
    return Math.min(1, Math.max(0, configured));
  }

  private getNricOpenRouterMaxTokens(): number {
    const configured = Number(process.env.OPENROUTER_NRIC_MAX_TOKENS ?? '400');
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

    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: userDto.email },
    });

    if (existingUserByEmail && existingUserByEmail.id !== existingUserId) {
      throw new BadRequestException('Email already exists');
    }

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
      if (!verifiedSignupUser.spPrStatusVerified) {
        throw new BadRequestException('This verified signup link is not eligible for NRIC signup.');
      }
      return verifiedSignupUser;
    }

    const draftUserId = String(userDto.draftUserId || '').trim();
    if (!draftUserId) {
      return null;
    }

    const existingDraft = await this.userRepository.findOne({
      where: { id: draftUserId },
    });

    if (!existingDraft || !existingDraft.isDraft) {
      return null;
    }

    return existingDraft;
  }

  async saveMembershipSignupDraft(userDto: UserDto): Promise<{ message: string; draftUserId: string; user: UserEntity }> {
    try {
      const existingDraft = await this.resolveExistingSignupDraft(userDto);
      const { normalizedUsername, hashedPassword } = await this.validateSignupInput(userDto, existingDraft?.id);

      let draftUser: UserEntity;

      if (existingDraft) {
        existingDraft.username = normalizedUsername;
        existingDraft.firstname = userDto.firstname;
        existingDraft.lastname = userDto.lastname;
        existingDraft.email = userDto.email;
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

    if (user.spPrStatusVerified && !String(signupAccessToken || '').trim()) {
      throw new BadRequestException('Verified signup access is required before continuing to payment.');
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

    draftUser.authProvider = AuthProvider.LOCAL;
    draftUser.role = draftUser.role || UserRole.User;
    draftUser.status = draftUser.status || UserStatus.Active;
    draftUser.isVerified = false;
    draftUser.isDraft = false;
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
      message: 'Membership payment confirmed. Account created successfully. Please verify your email.',
      user: draftUser,
      alreadyCompleted: false,
    };
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
   * Flattens OpenRouter message content into plain text.
   */
  private getOpenRouterMessageText(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part) {
            return String((part as { text?: unknown }).text || '');
          }
          return '';
        })
        .join('\n')
        .trim();
    }
    return '';
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
   */
  private buildDraftName(fullName: string): { firstname: string; lastname: string } {
    const cleaned = this.sanitizeExtractedTextField(fullName);
    if (!cleaned) {
      return { firstname: '', lastname: '' };
    }

    const parts = cleaned.split(' ').filter(Boolean);
    if (parts.length === 1) {
      return { firstname: parts[0], lastname: '' };
    }

    return {
      firstname: parts[0],
      lastname: parts.slice(1).join(' ') || '',
    };
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

  private getOpenRouterFriendlyErrorMessage(status: number, errorText: string, context: 'single' | 'pair'): string {
    const rawMessage = String(errorText || '').trim();
    const normalized = rawMessage.toLowerCase();
    const extractionLabel = context === 'pair' ? 'document pair extraction' : 'document extraction';

    if (
      status === 402
      || normalized.includes('requires more credits')
      || normalized.includes('insufficient credits')
      || normalized.includes('fewer max_tokens')
    ) {
      return 'Automatic NRIC verification is temporarily unavailable because the document OCR service has insufficient credits. Please try again later.';
    }

    if (status === 429 || normalized.includes('rate limit')) {
      return 'Automatic NRIC verification is temporarily busy. Please wait a moment and try again.';
    }

    if (status >= 500) {
      return 'Automatic NRIC verification is temporarily unavailable. Please try again later.';
    }

    if (normalized.includes('api key') || normalized.includes('not configured')) {
      return 'Automatic NRIC verification is not configured correctly right now. Please contact support.';
    }

    return `Automatic NRIC verification failed during ${extractionLabel}. Please try again later.`;
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
        sex: '',
        address: '',
      },
      confidence,
      reason,
      rawResponse: trimmed,
    };
  }

  /**
   * Uses the configured OpenRouter model to OCR a single uploaded NRIC image and extract a candidate NRIC/FIN.
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

    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
      throw new BadRequestException('OpenRouter is not configured. Please set OPENROUTER_API_KEY.');
    }

    const baseUrl = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').trim().replace(/\/$/, '');
    const model = String(process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini').trim();
    const appName = String(process.env.OPENROUTER_APP_NAME || 'AI Nexus').trim();
    const appUrl = String(process.env.OPENROUTER_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').trim();
    const maxTokens = this.getNricOpenRouterMaxTokens();

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': appUrl,
        'X-Title': appName,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content:
              'You extract Singapore NRIC/FIN identifiers and visible profile fields from identity document images. Return strict JSON only with keys: identifier, candidates, fullName, dateOfBirth, nationality, sex, address, confidence, reason. "identifier" must be the single best full Singapore NRIC or FIN candidate in the format prefix letter + 7 digits + checksum letter. "candidates" must be an array of up to 5 plausible full candidates ordered best-first. "fullName", "dateOfBirth", "nationality", "sex", and "address" must be strings, or empty strings if not visible. Valid prefixes are S, T, F, G, M. If nothing is visible, return {"identifier":"","candidates":[],"fullName":"","dateOfBirth":"","nationality":"","sex":"","address":"","confidence":0,"reason":"not found"}. Do not add markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `This is the NRIC ${side} image. Extract the best Singapore NRIC/FIN candidate and visible profile fields from this single identity image. Return strict JSON only.`,
              },
              {
                type: 'image_url',
                image_url: { url: this.buildDataUrl(image) },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[NRIC] OpenRouter single-image extraction failed | side=',
        side,
        'status=',
        response.status,
        'error=',
        String(errorText || 'Unknown error').slice(0, 500),
      );
      throw new BadRequestException(
        this.getOpenRouterFriendlyErrorMessage(response.status, errorText, 'single'),
      );
    }

    const data = await response.json();
    const rawText = this.getOpenRouterMessageText(data?.choices?.[0]?.message?.content);
    const extracted = this.parseOpenRouterNricResponse(rawText);

    if (!extracted.identifier) {
      throw new BadRequestException(`Could not extract a Singapore NRIC/FIN from the uploaded NRIC ${side} image.`);
    }

    return extracted;
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

    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (!apiKey) {
      throw new BadRequestException('OpenRouter is not configured. Please set OPENROUTER_API_KEY.');
    }

    const baseUrl = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').trim().replace(/\/$/, '');
    const model = String(process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini').trim();
    const appName = String(process.env.OPENROUTER_APP_NAME || 'AI Nexus').trim();
    const appUrl = String(process.env.OPENROUTER_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').trim();
    const maxTokens = this.getNricOpenRouterMaxTokens();

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': appUrl,
        'X-Title': appName,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content:
              'You verify whether two uploaded images are the front and back of the same Singapore NRIC/FIN document. Return strict JSON only with keys: identifier, candidates, fullName, dateOfBirth, nationality, sex, address, confidence, reason. "identifier" must be the single shared best full Singapore NRIC or FIN candidate visible across the two images in the format prefix letter + 7 digits + checksum letter. "candidates" must be an array of up to 5 plausible shared full candidates ordered best-first. Use both images together. If you cannot confirm a shared document identifier, return {"identifier":"","candidates":[],"fullName":"","dateOfBirth":"","nationality":"","sex":"","address":"","confidence":0,"reason":"not found"}. Do not add markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'These are the front and back images of one Singapore NRIC/FIN document. Read both images together, extract the shared NRIC/FIN identifier, and return strict JSON only.',
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        '[NRIC] OpenRouter pair extraction failed | status=',
        response.status,
        'error=',
        String(errorText || 'Unknown error').slice(0, 500),
      );
      throw new BadRequestException(
        this.getOpenRouterFriendlyErrorMessage(response.status, errorText, 'pair'),
      );
    }

    const data = await response.json();
    const rawText = this.getOpenRouterMessageText(data?.choices?.[0]?.message?.content);

    return this.parseOpenRouterNricResponse(rawText);
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
    const existingUser = await this.resolveUserForNricVerification(userId, authorizationHeader);
    if (existingUser) {
      return { user: existingUser, createdAsDraft: false };
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

  private hasStoredCanonicalNricFin(user: UserEntity | null | undefined, normalizedNricFin: string): boolean {
    if (!user) return false;

    const candidateHash = this.hashCanonicalNricValue(normalizedNricFin);
    if (user.nricFinCanonicalHash) {
      return user.nricFinCanonicalHash === candidateHash;
    }

    return String(user.nricFinCanonicalValue || user.nricFinValue || '').trim() === normalizedNricFin;
  }

  private async findExistingCompletedUserByNricFin(normalizedNricFin: string, excludeUserId?: string) {
    const canonicalHash = this.hashCanonicalNricValue(normalizedNricFin);
    const existingUser = await this.userRepository
      .createQueryBuilder('usr')
      .where(
        '(usr."nricFinCanonicalHash" = :canonicalHash OR usr."nricFinCanonicalValue" = :normalizedNricFin OR (usr."nricFinCanonicalValue" IS NULL AND usr."nricFinValue" = :normalizedNricFin))',
        { canonicalHash, normalizedNricFin }
      )
      .getOne();

    if (!existingUser) return null;
    if (excludeUserId && existingUser.id === excludeUserId) return null;
    if (existingUser.isDraft) return null;

    return existingUser;
  }

  private async findExistingVerifiedDraftByNricFin(normalizedNricFin: string, excludeUserId?: string) {
    const canonicalHash = this.hashCanonicalNricValue(normalizedNricFin);
    const existingUser = await this.userRepository
      .createQueryBuilder('usr')
      .where(
        '(usr."nricFinCanonicalHash" = :canonicalHash OR usr."nricFinCanonicalValue" = :normalizedNricFin OR (usr."nricFinCanonicalValue" IS NULL AND usr."nricFinValue" = :normalizedNricFin))',
        { canonicalHash, normalizedNricFin }
      )
      .getOne();

    if (!existingUser) return null;
    if (excludeUserId && existingUser.id === excludeUserId) return null;
    if (!existingUser.isDraft) return null;
    if (!existingUser.spPrStatusVerified) return null;

    return existingUser;
  }

  async sendStudentVerificationPin(params: {
    schoolName?: string;
    graduationDate?: string;
    schoolEmail?: string;
  }) {
    this.cleanupExpiredStudentVerificationSessions();

    const { schoolName, graduationDate, schoolEmail } = this.validateStudentVerificationInput(params);
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

    return {
      sent: true,
      verificationToken,
      schoolEmail,
      expiresAt: new Date(expiresAt).toISOString(),
      message: 'Verification PIN sent successfully.',
    };
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

  async getVerifiedSignupAccess(token: string) {
    const user = await this.resolveUserByVerifiedSignupAccessToken(token);

    if (!user.isDraft && user.spPrStatusVerified) {
      throw new UnauthorizedException(
        'You have already completed signup with this verified document. Please sign in with your credentials.',
      );
    }

    if (!user.isDraft || !user.spPrStatusVerified) {
      throw new UnauthorizedException('Verified signup access is no longer available.');
    }

    return {
      allowed: true,
      signupAccessTokenExpiresAt: user.signupAccessTokenExpiresAt,
      prefill: {
        username: user.username || '',
        firstName: user.firstname || '',
        lastName: user.lastname || '',
        email: user.email || '',
        address: user.nricExtractedAddress || '',
        dateOfBirth: user.nricExtractedDateOfBirth || '',
        nationality: user.nricExtractedNationality || '',
      },
    };
  }

  /**
   * Validates uploaded NRIC images, extracts the Singapore NRIC/FIN via OpenRouter vision,
   * validates the extracted identifier checksum, and stores a masked verification result on the user when available.
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
    this.logNricVerificationAttempt('openrouter-initial', verificationAttempt);

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
      this.logNricVerificationAttempt('openrouter-retry-merged', verificationAttempt);
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
        this.logNricVerificationAttempt('openrouter-pair-merged', verificationAttempt);
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
    const currentResolvedUser = await this.resolveUserForNricVerification(userId, authorizationHeader);
    const manualReviewReason = this.getManualReviewReason(frontExtracted, backExtracted);

    if (manualReviewReason) {
      throw new BadRequestException(manualReviewReason);
    }

    if (
      currentResolvedUser
      && !currentResolvedUser.isDraft
      && this.hasStoredCanonicalNricFin(currentResolvedUser, validation.normalized)
    ) {
      throw new BadRequestException(
        'You have already completed signup with this verified document. Please sign in with your credentials.',
      );
    }

    const existingCompletedUser = await this.findExistingCompletedUserByNricFin(
      validation.normalized,
      currentResolvedUser?.id,
    );

    if (existingCompletedUser) {
      throw new BadRequestException(
        'You have already verified this document. Please sign in with your credentials.',
      );
    }

    const existingVerifiedDraft = await this.findExistingVerifiedDraftByNricFin(
      validation.normalized,
      currentResolvedUser?.id,
    );

    const resolvedUserForVerification = existingVerifiedDraft
      ? { user: existingVerifiedDraft, createdAsDraft: false }
      : await this.resolveOrCreateUserForNricVerification(
          extracted,
          userId,
          authorizationHeader,
        );

    const { user, createdAsDraft } = resolvedUserForVerification;

    if (user) {
      const draftName = this.buildDraftName(extracted.profile.fullName);
      if (user.isDraft) {
        user.firstname = draftName.firstname || user.firstname;
        user.lastname = draftName.lastname || user.lastname;

        if (!user.username) {
          user.username = await this.buildDraftUsername(user.firstname, user.lastname);
        }
      }

      user.nricFinType = validation.documentType;
      user.nricFinSeries = validation.prefix;
      user.nricFinValue = null;
      user.nricFinMasked = maskSingaporeNricFin(exactIdentifier);
      user.nricFinCanonicalValue = null;
      user.nricFinCanonicalMasked = validation.masked;
      user.nricFinValueEncrypted = this.encryptNricValue(exactIdentifier);
      user.nricFinCanonicalHash = this.hashCanonicalNricValue(validation.normalized);
      user.nricExtractedFullName = extracted.profile.fullName || null;
      user.nricExtractedDateOfBirth = extracted.profile.dateOfBirth || null;
      user.nricExtractedNationality = extracted.profile.nationality || null;
      user.nricExtractedSex = extracted.profile.sex || null;
      user.nricExtractedAddress = extracted.profile.address || null;
      user.nricVerificationConfidence = extracted.confidence;
      user.spPrStatusVerified = true;
      user.nricVerificationSource = 'openrouter';
      user.spPrStatusVerifiedAt = new Date();
      await this.userRepository.save(user);
    }

    const verifiedSignupAccess = user
      ? await this.issueVerifiedSignupAccessToken(user)
      : { signupAccessToken: '', signupAccessTokenExpiresAt: null as Date | null };

    const verificationResponse = {
      verified: true,
      message: 'NRIC/FIN extracted and validated successfully.',
      extracted: {
        type: validation.documentType,
        prefix: validation.prefix,
        identifier: exactIdentifier,
        maskedIdentifier: maskSingaporeNricFin(exactIdentifier),
        confidence: extracted.confidence,
        reason: extracted.reason,
        profile: extracted.profile,
      },
      storedOnUser: Boolean(user),
      userId: user?.id || null,
      storedAsDraft: Boolean(user?.isDraft),
      draftUserCreated: createdAsDraft,
      signupAccessToken: verifiedSignupAccess.signupAccessToken || null,
      signupAccessTokenExpiresAt: verifiedSignupAccess.signupAccessTokenExpiresAt || null,
      checks: {
        frontImage: front,
        backImage: back,
        filesAreDistinct: true,
        frontBackDocumentMatch: true,
      },
    };

    return verificationResponse;
  }

  async register(userDto: UserDto): Promise<{ message: string, user: UserEntity }> {
    try {
      const verifiedSignupUser = userDto.signupAccessToken
        ? await this.resolveUserByVerifiedSignupAccessToken(userDto.signupAccessToken)
        : null;

      if (verifiedSignupUser && !verifiedSignupUser.isDraft) {
        throw new BadRequestException('This verified signup link has already been used.');
      }
      if (verifiedSignupUser && !verifiedSignupUser.spPrStatusVerified) {
        throw new BadRequestException('This verified signup link is not eligible for NRIC signup.');
      }

      const { normalizedUsername, hashedPassword } = await this.validateSignupInput(
        userDto,
        verifiedSignupUser?.id
      );

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      let newUser: UserEntity;

      if (verifiedSignupUser) {
        verifiedSignupUser.username = normalizedUsername;
        verifiedSignupUser.firstname = userDto.firstname;
        verifiedSignupUser.lastname = userDto.lastname;
        verifiedSignupUser.email = userDto.email;
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
  async login(loginDto: LoginDto): Promise<{ message: string, access_token: string; user: Partial<UserEntity> }> {
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

      // Find the user by email or username
      const user = isEmail
        ? await this.userRepository.findOne({ where: { email: identifier } })
        : await this.userRepository
            .createQueryBuilder('user')
            .where('LOWER(user.username) = LOWER(:username)', { username: this.normalizeUsername(identifier) })
            .getOne();

      if (!user) {
        throw new NotFoundException('User not found');
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
        throw new UnauthorizedException('Invalid email/username or password');
      }

      const payload = { 
        email: user.email, 
        id: user.id, 
        role: user.role, 
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
      };

      // Exclude sensitive fields from the returned user
      const { password, ...userWithoutPassword } = user;

      return {
        message: 'User Logged in successfully',
        user: userWithoutPassword,
        access_token: this.JwtService.sign(payload)
      }
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

  /** SSO-aware logout: revoke IdP token if OAUTH, clear social and refresh tokens. */
  async logout(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { message: 'Logged out successfully' };
    }
    const isOAuth = user.authProvider === AuthProvider.OAUTH && user.socialAccessToken;
    if (isOAuth) {
      try {
        await this.oauthAuthService.revokeIdpToken(user.socialAccessToken!);
      } catch (err) {
        console.warn('IdP revoke during logout (non-fatal):', err);
      }
    }
    user.socialAccessToken = null;
    await this.userRepository.save(user);
    return {
      message: isOAuth
        ? 'Logged out successfully from both app and SSO'
        : 'Logged out successfully',
    };
  }
}