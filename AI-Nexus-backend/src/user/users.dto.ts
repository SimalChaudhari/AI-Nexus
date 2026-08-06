//users.dto.ts
import {
    IsOptional,
    IsNotEmpty,
    IsString,
    IsEmail,
    IsEnum,
    IsBoolean,
    IsArray,
    Matches,
    IsObject,
    MaxLength,
} from 'class-validator';
import { UserRole, UserStatus } from './users.entity';

// For registration - all fields required
export class UserDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    username!: string;

    @IsString()
    @IsNotEmpty()
    firstname!: string;

    @IsString()
    @IsNotEmpty()
    lastname!: string;

    @IsEmail()
    @Matches(/^(?!\.)(?!.*\.\.)([a-z0-9._%+-]{1,64})@([a-z0-9-]+\.)+[a-z]{2,}$/i, {
        message: 'Email must be a valid real email address',
    })
    @IsNotEmpty()
    email!: string;

    @IsOptional()
    @IsString()
    persona?: string;

    @IsOptional()
    @IsString()
    aiExperienceLevel?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    aiLearningGoals?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    aiUseAreas?: string[];

    @IsOptional()
    @IsString()
    financeRole?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(48)
    contactNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    companyCode?: string;

    /** Optional for admin-created users — backend generates a temporary password and emails it if omitted. */
    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsString()
    signupAccessToken?: string;

    @IsOptional()
    @IsString()
    draftUserId?: string;

    @IsOptional()
    @IsBoolean()
    eligibilityIsSingaporePr?: boolean;

    @IsOptional()
    @IsBoolean()
    eligibilityIsIscaMember?: boolean;

    @IsOptional()
    @IsBoolean()
    eligibilityWantsMembership?: boolean;

    @IsOptional()
    @IsString()
    eligibilityType?: string;

    @IsOptional()
    @IsObject()
    eligibilitySnapshot?: Record<string, unknown>;

    /**
     * When set, register follows Salesforce create+setpassword — skip re-checking
     * usercheckforemail (that account was just created for this signup).
     */
    @IsOptional()
    @IsString()
    @MaxLength(255)
    salesforceUsername?: string;

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
    @MaxLength(50)
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
    persona?: string;

    @IsOptional()
    @IsString()
    aiExperienceLevel?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    aiLearningGoals?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    aiUseAreas?: string[];

    @IsOptional()
    @IsString()
    financeRole?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(48)
    contactNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    companyCode?: string;

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

/** Admin own-profile update — username is not bound to letters+numbers pattern. */
export class AdminUpdateProfileDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
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
    persona?: string;

    @IsOptional()
    @IsString()
    aiExperienceLevel?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    aiLearningGoals?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    aiUseAreas?: string[];

    @IsOptional()
    @IsString()
    financeRole?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(48)
    contactNumber?: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    companyCode?: string;

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

    /** When set, resolve Individual (`User`) or Corporate row for shared emails. */
    @IsString()
    @IsOptional()
    preferredRole?: string;
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
