// src/auth/auth.controller.ts
import { Controller, Post, Body, Res, HttpStatus, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, LoginDto, ResendVerificationDto } from '../user/users.dto';
import { Response, Request } from 'express';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

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
}
