//users.dto.ts
import { IsOptional, IsNotEmpty, IsString, IsEmail, IsEnum, IsBoolean } from 'class-validator';
import { UserRole, UserStatus } from './users.entity';

// For registration - all fields required
export class UserDto {
    @IsString()
    @IsNotEmpty()
    username!: string;

    @IsString()
    @IsNotEmpty()
    firstname!: string;

    @IsString()
    @IsNotEmpty()
    lastname!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    /** Optional for admin-created users — backend generates a temporary password and emails it if omitted. */
    @IsOptional()
    @IsString()
    password?: string;

    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;

    @IsEnum(UserStatus)
    @IsOptional()
    status?: UserStatus;
}

// For update - all fields optional
export class UpdateUserDto {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    firstname?: string;

    @IsOptional()
    @IsString()
    lastname?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsBoolean()
    isVerified?: boolean;

    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}

// For forgot password - only email required
export class ForgotPasswordDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;
}

// For reset password - token and new password required
export class ResetPasswordDto {
    @IsString()
    @IsNotEmpty()
    token!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;
}

// For login - email or username and password required
// Note: Either 'identifier' (from frontend) or 'email' (from Postman) must be provided
export class LoginDto {
    @IsString()
    @IsOptional()
    identifier?: string; // Can be email or username (from frontend)

    @IsString()
    @IsOptional()
    email?: string; // For backward compatibility with Postman

    @IsString()
    @IsNotEmpty()
    password!: string;
}

// For resend verification email - only email required
export class ResendVerificationDto {
    @IsEmail()
    @IsNotEmpty()
    email!: string;
}

// For email verification - only token required
export class VerifyEmailDto {
    @IsString()
    @IsNotEmpty()
    token!: string;
}
