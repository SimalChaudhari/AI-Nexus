import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { IntlAuthModule } from '../intl-auth/intl-auth.module';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { InternationalUserEntity } from '../intl-auth/international-user.entity';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { IntlPathwayCertificateEntity } from './intl-pathway-certificate.entity';
import { IntlPathwayModuleEntity } from './intl-pathway-module.entity';
import { IntlPathwayRoleEntity } from './intl-pathway-role.entity';
import { IntlPathwayController } from './intl-pathway.controller';
import { IntlPathwayInitService } from './intl-pathway-init.service';
import { IntlPathwayService } from './intl-pathway.service';
import { IntlPathwayWatchProgressEntity } from './intl-pathway-watch-progress.entity';
import { IntlPathwayWatchProgressService } from './intl-pathway-watch-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntlPathwayModuleEntity,
      IntlPathwayRoleEntity,
      IntlPathwayWatchProgressEntity,
      IntlPathwayCertificateEntity,
      InternationalUserEntity,
      UserEntity,
      CourseEntity,
      CourseModuleEntity,
      CourseModuleSectionEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
    IntlAuthModule,
    AppSettingsModule,
  ],
  controllers: [IntlPathwayController],
  providers: [
    IntlPathwayService,
    IntlPathwayInitService,
    IntlPathwayWatchProgressService,
    OptionalJwtAuthGuard,
  ],
  exports: [IntlPathwayService, IntlPathwayWatchProgressService],
})
export class IntlPathwayModule {}
