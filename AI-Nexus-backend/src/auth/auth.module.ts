// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from './../user/users.entity';
import { EmailService } from './../service/email.service';
import { SsoModule } from './sso.module';
import { LlmModule } from '../llm/llm.module';
import { LocalStorageModule } from '../service/local-storage.module';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AuthTokenService } from './auth-token.service';
import { AuthTokenInitService } from './auth-token-init.service';
import { CompanyEnrollmentModule } from '../company-enrollment/company-enrollment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
    SsoModule,
    LlmModule,
    LocalStorageModule,
    CompanyEnrollmentModule,
  ],
  providers: [AuthService, EmailService, AuthTokenService, AuthTokenInitService],
  controllers: [AuthController],
  exports: [AuthService, EmailService, AuthTokenService],
})
export class AuthModule {}
