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

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
    SsoModule,
    LlmModule,
  ],
  providers: [AuthService, EmailService],
  controllers: [AuthController],
  exports: [AuthService, EmailService],
})
export class AuthModule {}
