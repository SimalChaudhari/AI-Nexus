import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../user/users.entity';
import { IntlAuthController } from './intl-auth.controller';
import { IntlAuthInitService } from './intl-auth-init.service';
import { IntlAuthService } from './intl-auth.service';
import { IntlJwtAuthGuard } from './intl-jwt-auth.guard';
import { InternationalUserEntity } from './international-user.entity';

@Module({
  imports: [
    // UserEntity is required by SessionGuard used on admin list routes.
    TypeOrmModule.forFeature([InternationalUserEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [IntlAuthController],
  providers: [IntlAuthService, IntlAuthInitService, IntlJwtAuthGuard],
  exports: [IntlAuthService, IntlJwtAuthGuard, JwtModule],
})
export class IntlAuthModule {}
