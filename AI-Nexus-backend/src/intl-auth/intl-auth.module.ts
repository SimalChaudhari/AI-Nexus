import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IntlAuthController } from './intl-auth.controller';
import { IntlAuthInitService } from './intl-auth-init.service';
import { IntlAuthService } from './intl-auth.service';
import { InternationalUserEntity } from './international-user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InternationalUserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [IntlAuthController],
  providers: [IntlAuthService, IntlAuthInitService],
  exports: [IntlAuthService],
})
export class IntlAuthModule {}
