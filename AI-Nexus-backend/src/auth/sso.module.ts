// src/auth/sso.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../user/users.entity';
import { OAuthAuthService } from './oauth-auth.service';
import { OAuthAuthController } from './oauth-auth.controller';
import { MembershipApplicationController } from './membership-application.controller';
import { SsoSyncService } from './sso-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [OAuthAuthService, SsoSyncService],
  controllers: [OAuthAuthController, MembershipApplicationController],
  exports: [OAuthAuthService],
})
export class SsoModule {}
