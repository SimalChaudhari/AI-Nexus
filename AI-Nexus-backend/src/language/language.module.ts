import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { LanguageEntity } from './language.entity';
import { UserEntity } from '../user/users.entity';
import { LanguageService } from './language.service';
import { LanguageController } from './language.controller';
import { LanguageInitService } from './language-init.service';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([LanguageEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  providers: [LanguageService, LanguageInitService, OptionalJwtAuthGuard],
  controllers: [LanguageController],
  exports: [LanguageService],
})
export class LanguageModule {}
