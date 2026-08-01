import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { IntlPathwayModuleEntity } from './intl-pathway-module.entity';
import { IntlPathwayRoleEntity } from './intl-pathway-role.entity';
import { IntlPathwayController } from './intl-pathway.controller';
import { IntlPathwayService } from './intl-pathway.service';
import { IntlPathwayInitService } from './intl-pathway-init.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntlPathwayModuleEntity,
      IntlPathwayRoleEntity,
      UserEntity,
      CourseEntity,
      CourseModuleEntity,
      CourseModuleSectionEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [IntlPathwayController],
  providers: [IntlPathwayService, IntlPathwayInitService, OptionalJwtAuthGuard],
  exports: [IntlPathwayService],
})
export class IntlPathwayModule {}
