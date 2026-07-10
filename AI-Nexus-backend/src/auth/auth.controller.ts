// src/auth/auth.controller.ts
import { Controller, Post, Body, Res, HttpStatus, Get, Req, UseGuards, UseInterceptors, UploadedFiles, UploadedFile, UnauthorizedException, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, LoginDto, ResendVerificationDto } from '../user/users.dto';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SaveSalesforceMembershipRecordDto } from './save-salesforce-membership-record.dto';
import { AuthTokenService } from './auth-token.service';
import { OAuthAuthService } from './oauth-auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authTokenService: AuthTokenService,
    private readonly oauthAuthService: OAuthAuthService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Check authentication service health' })
  healthCheck() {
    return {
      status: 'ok',
      message: 'Backend is running successfully',
      timestamp: new Date().toISOString(),
      service: 'AI-Nexus Backend',
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: UserDto })
  async register(
    @Res() response: Response,
    @Body() userDto: UserDto, 
  ) {
    const result = await this.authService.register(userDto);
    return response.status(HttpStatus.OK).json({
      message: result.message,
      user: result.user,
    });
  }

  @Post('salesforce-membership-record')
  @ApiOperation({
    summary: 'Save student/membership eligibility to database after Salesforce account setup',
  })
  @ApiBody({ type: SaveSalesforceMembershipRecordDto })
  async saveSalesforceMembershipRecord(
    @Res() response: Response,
    @Body() dto: SaveSalesforceMembershipRecordDto,
  ) {
    const result = await this.authService.saveSalesforceMembershipRecord(dto);
    return response.status(HttpStatus.OK).json({
      message: result.message,
      userId: result.userId,
      user: result.user,
    });
  }

  @Post('membership-signup-draft')
  @ApiOperation({ summary: 'Save membership signup details as a draft before payment' })
  @ApiBody({ type: UserDto })
  async saveMembershipSignupDraft(
    @Res() response: Response,
    @Body() userDto: UserDto,
  ) {
    const result = await this.authService.saveMembershipSignupDraft(userDto);
    return response.status(HttpStatus.OK).json({
      message: result.message,
      draftUserId: result.draftUserId,
      user: result.user,
    });
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user and set HttpOnly auth cookies' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    await this.authTokenService.issueTokenPair(result.user as any, res, { req });
    return {
      message: result.message,
      user: result.user,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = this.authTokenService.readRefreshTokenFromRequest(req);
    if (!raw) {
      throw new UnauthorizedException('Refresh token required');
    }
    const { user } = await this.authTokenService.refreshSession(raw, res, req);
    return { message: 'Session refreshed', user };
  }

  @Post('establish-session')
  @ApiOperation({
    summary: 'Set HttpOnly cookies from a valid access JWT (deferred membership login)',
  })
  async establishSession(
    @Body() body: { token?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = body?.token?.trim();
    if (!token) {
      throw new UnauthorizedException('Token is required');
    }
    const { id } = this.authTokenService.verifyAccessToken(token);
    const user = await this.authService.getUserProfile(id);
    await this.authTokenService.issueTokenPair(user as any, res, { req });
    await this.oauthAuthService.markSalesforceAccountAsAiNexusUser(user.salesforceAccountId);
    return { message: 'Session established', user };
  }

  @Get('flowise-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Short-lived token for Flowise external-login bridge' })
  async flowiseToken(@Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }
    const user = await this.authService.getUserProfile(userId);
    const accessToken = this.authTokenService.signAccessToken(user as any);
    return { accessToken };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Return the currently authenticated user' })
  async me(@Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new UnauthorizedException('Unauthorized');
    }
    const user = await this.authService.getUserProfile(userId);
    return { user };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send password reset instructions' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using provided token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify user email address' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend account verification email' })
  @ApiBody({ type: ResendVerificationDto })
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerification(resendVerificationDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Logout the current user session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body?: { socialAccessToken?: string },
  ) {
    const userId = (req as any).user?.id;
    const rawRefresh = this.authTokenService.readRefreshTokenFromRequest(req);
    await this.authTokenService.revokeRefreshToken(rawRefresh ?? undefined);
    if (userId) {
      await this.authTokenService.revokeAllUserRefreshTokens(userId);
    }
    this.authTokenService.clearAuthCookies(res);
    if (!userId) {
      return { message: 'Logged out successfully' };
    }
    const supplementalSocialToken = String(body?.socialAccessToken || '').trim() || undefined;
    return this.authService.logout(userId, { supplementalSocialToken });
  }

  @Post('verify-nric')
  @ApiOperation({ summary: 'Verify NRIC front/back images for membership flow' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', format: 'uuid', nullable: true },
        frontImage: { type: 'string', format: 'binary' },
        backImage: { type: 'string', format: 'binary' },
      },
      required: ['frontImage', 'backImage'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'frontImage', maxCount: 1 },
        { name: 'backImage', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per file
      }
    )
  )
  async verifyNric(
    @Req() req: Request,
    @UploadedFiles()
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
    },
    @Body('userId') userId?: string,
  ) {
    const front = files?.frontImage?.[0];
    const back = files?.backImage?.[0];
    return this.authService.verifyNricImages(front, back, userId, req.headers.authorization);
  }

  @Post('verify-nric-manual')
  @ApiOperation({ summary: 'Verify NRIC/FIN manually via checksum validation (no AI)' })
  async verifyNricManual(
    @Req() req: Request,
    @Body('identifier') identifier: string,
    @Body('fullName') fullName: string,
    @Body('nameAsPerId') nameAsPerId: string,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
    @Body('nationality') nationality: string,
    @Body('idType') idType: string,
    @Body('dateOfBirth') dateOfBirth: string,
    @Body('userId') userId?: string,
  ) {
    return this.authService.verifyNricManual({
      identifier,
      fullName,
      nameAsPerId,
      firstName,
      lastName,
      nationality,
      idType,
      dateOfBirth,
      userId,
      authorizationHeader: req.headers.authorization,
    });
  }

  @Post('validate-nric')
  @ApiOperation({ summary: 'Validate Singapore NRIC/FIN checksum only (no AI / persistence)' })
  async validateNric(@Body('identifier') identifier: string) {
    return this.authService.validateNricIdentifier(identifier);
  }

  @Post('verified-signup-access')
  @ApiOperation({ summary: 'Validate verified NRIC signup access token and return signup prefill data' })
  async getVerifiedSignupAccess(@Body('token') token: string) {
    return this.authService.getVerifiedSignupAccess(token);
  }

  @Post('student-verification/send-pin')
  @ApiOperation({ summary: 'Send a student verification PIN to the provided school email' })
  async sendStudentVerificationPin(
    @Body('schoolName') schoolName: string,
    @Body('graduationDate') graduationDate: string,
    @Body('schoolEmail') schoolEmail: string,
  ) {
    return this.authService.sendStudentVerificationPin({ schoolName, graduationDate, schoolEmail });
  }

  @Post('student-verification/verify-pin')
  @ApiOperation({ summary: 'Verify the student verification PIN entered in the membership modal' })
  async verifyStudentVerificationPin(
    @Body('verificationToken') verificationToken: string,
    @Body('pin') pin: string,
    @Body('schoolEmail') schoolEmail?: string,
  ) {
    return this.authService.verifyStudentVerificationPin({ verificationToken, pin, schoolEmail });
  }

  @Post('student-verification/eligibility-check')
  @ApiOperation({ summary: 'Run AI eligibility scoring for student membership information' })
  async verifyStudentEligibilityWithAi(
    @Body('schoolName') schoolName: string,
    @Body('graduationDate') graduationDate: string,
    @Body('schoolEmail') schoolEmail: string,
  ) {
    return this.authService.verifyStudentEligibilityWithAi({ schoolName, graduationDate, schoolEmail });
  }

  @Post('student-verification/verify-academic-details')
  @ApiOperation({ summary: 'Verify student academic email and student ID card with AI' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        academicEmail: { type: 'string' },
        personalEmail: { type: 'string' },
        studentCardImage: { type: 'string', format: 'binary' },
        userId: { type: 'string' },
      },
      required: ['academicEmail', 'studentCardImage'],
    },
  })
  @UseInterceptors(
    FileInterceptor('studentCardImage', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async verifyStudentAcademicDetails(
    @Req() req: Request,
    @UploadedFile() studentCardImage: Express.Multer.File,
    @Body('academicEmail') academicEmail?: string,
    @Body('personalEmail') personalEmail?: string,
    @Body('userId') userId?: string,
  ) {
    return this.authService.verifyStudentAcademicDetailsWithAi({
      academicEmail,
      personalEmail,
      studentCardImage,
      userId,
      authorizationHeader: req.headers.authorization,
    });
  }

  @Post('experienced-pathway/verify-resume')
  @ApiOperation({ summary: 'Verify experienced pathway resume/CV and return ATS-style eligibility score' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        resume: { type: 'string', format: 'binary' },
      },
      required: ['resume'],
    },
  })
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async verifyExperiencedResume(@UploadedFile() resume: Express.Multer.File) {
    return this.authService.verifyExperiencedResume(resume);
  }

  @Post('fee-waiver-audit/hr-email')
  @ApiOperation({ summary: 'Send HR verification email for fee-waiver job role audit' })
  async submitFeeWaiverAuditHrEmail(
    @Body('userId') userId: string,
    @Body('learnerEmail') learnerEmail: string,
    @Body('learnerName') learnerName: string,
    @Body('hrEmail') hrEmail: string,
  ) {
    return this.authService.submitFeeWaiverAuditHrEmail({
      userId,
      learnerEmail,
      learnerName,
      hrEmail,
    });
  }

  @Post('fee-waiver-audit/resend-hr-email')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Send or resend HR verification email for fee-waiver job role audit' })
  async resendFeeWaiverAuditHrEmail(
    @Req() request: Request,
    @Body('userId') userId: string,
    @Body('learnerEmail') learnerEmail: string,
    @Body('hrEmail') hrEmail: string,
  ) {
    const authUserId = request.user?.id;
    return this.authService.resendFeeWaiverHrVerificationEmail({
      userId: authUserId || userId,
      learnerEmail: authUserId ? undefined : learnerEmail,
      hrEmail,
      requestedBy: authUserId ? 'user' : 'system',
    });
  }

  @Post('fee-waiver-audit/verify-certificate')
  @ApiOperation({ summary: 'Upload education certificate for fee-waiver audit (manual admin review)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        certificate: { type: 'string', format: 'binary' },
        userId: { type: 'string' },
        learnerEmail: { type: 'string' },
      },
      required: ['certificate', 'learnerEmail'],
    },
  })
  @UseInterceptors(
    FileInterceptor('certificate', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async verifyFeeWaiverAuditCertificate(
    @UploadedFile() certificate: Express.Multer.File,
    @Body('userId') userId: string,
    @Body('learnerEmail') learnerEmail: string,
  ) {
    return this.authService.verifyFeeWaiverAuditCertificate({
      userId,
      learnerEmail,
      certificate,
    });
  }

  @Get('fee-waiver-audit/verify-hr')
  @ApiOperation({ summary: 'Complete HR fee-waiver job role verification from email link' })
  async verifyFeeWaiverAuditHr(@Query('token') token: string) {
    return this.authService.verifyFeeWaiverAuditHrToken(token);
  }

  @Get('student-verification/confirm')
  @ApiOperation({ summary: 'Complete student academic email verification from email link' })
  async verifyStudentAcademicEmail(@Query('token') token: string) {
    return this.authService.verifyStudentAcademicEmailToken(token);
  }

  @Get('student-verification/academic-email-status')
  @ApiOperation({ summary: 'Check whether student academic email verification is complete' })
  async getStudentAcademicEmailVerificationStatus(
    @Query('academicEmail') academicEmail?: string,
    @Query('userId') userId?: string,
  ) {
    return this.authService.getStudentAcademicEmailVerificationStatus({ academicEmail, userId });
  }

  @Get('student-verification/resume-flow')
  @ApiOperation({ summary: 'Load membership flow state to open fee-waiver modal after student email verification' })
  async getStudentFeeWaiverResumeFlow(@Query('token') token: string) {
    return this.authService.getStudentFeeWaiverResumeFlow(token);
  }

  @Post('accounting-declaration/hr-email')
  @ApiOperation({ summary: 'Send HR notification email for accounting declaration (pre-registration)' })
  async submitAccountingDeclarationHrEmail(
    @Body('nricFin') nricFin: string,
    @Body('learnerName') learnerName: string,
    @Body('hrEmail') hrEmail: string,
  ) {
    return this.authService.submitAccountingDeclarationHrEmail({ nricFin, learnerName, hrEmail });
  }

  @Post('accounting-declaration/verify-certificate')
  @ApiOperation({ summary: 'AI-verify accounting qualification certificate (pre-registration)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        certificate: { type: 'string', format: 'binary' },
        nricFin: { type: 'string' },
      },
      required: ['certificate'],
    },
  })
  @UseInterceptors(
    FileInterceptor('certificate', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  async verifyAccountingDeclarationCertificate(
    @UploadedFile() certificate: Express.Multer.File,
    @Body('nricFin') nricFin: string,
  ) {
    return this.authService.verifyAccountingDeclarationCertificate({ certificate, nricFin });
  }
}
