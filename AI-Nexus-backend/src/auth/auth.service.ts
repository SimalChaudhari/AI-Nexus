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

@Injectable()
export class AuthService {
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

  async register(userDto: UserDto): Promise<{ message: string, user: UserEntity }> {
    try {
      // Validate required fields
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

      // Check if the email already exists
      const existingUserByEmail = await this.userRepository.findOne({
        where: { email: userDto.email },
      });

      if (existingUserByEmail) {
        throw new BadRequestException('Email already exists');
      }

      // Check if the username already exists
      const existingUserByUsername = await this.userRepository
        .createQueryBuilder('user')
        .where('LOWER(user.username) = LOWER(:username)', { username: normalizedUsername })
        .getOne();

      if (existingUserByUsername) {
        throw new BadRequestException('Username already exists');
      }

      // Hash password before saving
      const hashedPassword = await bcrypt.hash(userDto.password, 10);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Create the new user (LOCAL auth provider)
      const newUser = this.userRepository.create({
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

      await this.userRepository.save(newUser); // Save the new user

      // Send verification email
      const userName = `${newUser.firstname} ${newUser.lastname}`;
      try {
        await this.emailService.sendVerificationEmail(newUser.email, verificationToken, userName);
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
          await this.emailService.sendVerificationEmail(user.email, verificationToken, userName);
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
      await this.emailService.sendResetPasswordEmail(user.email, resetToken, userName);

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
        await this.emailService.sendVerificationEmail(user.email, verificationToken, userName);
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