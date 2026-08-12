// src/auth/sso.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../user/users.entity';
import { OAuthAuthService } from './oauth-auth.service';
import { OAuthAuthController } from './oauth-auth.controller';
import { MembershipApplicationController } from './membership-application.controller';
import { StudentMembershipApplicationController } from './student-membership-application.controller';
import { SsoSyncService } from './sso-sync.service';
import { SalesforceBadgeService } from './salesforce-badge.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AuthTokenService } from './auth-token.service';
import { CompanyEnrollmentModule } from '../company-enrollment/company-enrollment.module';
import { EmailService } from '../service/email.service';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
    CompanyEnrollmentModule,
    AppSettingsModule,
  ],
  providers: [
    OAuthAuthService,
    SsoSyncService,
    AuthTokenService,
    SalesforceBadgeService,
    EmailService,
  ],
  controllers: [
    OAuthAuthController,
    MembershipApplicationController,
    StudentMembershipApplicationController,
  ],
  exports: [OAuthAuthService, SalesforceBadgeService],
})
export class SsoModule {}
