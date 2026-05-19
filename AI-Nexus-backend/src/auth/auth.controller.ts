// src/auth/auth.controller.ts
import { Controller, Post, Body, Res, HttpStatus, Get, Req, UseGuards, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, LoginDto, ResendVerificationDto } from '../user/users.dto';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SaveSalesforceMembershipRecordDto } from './save-salesforce-membership-record.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @ApiOperation({ summary: 'Authenticate user and return access token' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
  async logout(@Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) {
      return { message: 'Logged out successfully' };
    }
    return this.authService.logout(userId);
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
}
