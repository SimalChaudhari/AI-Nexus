import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserEntity } from '../user/users.entity';
import { ProgramEntity } from '../program/programs.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseCertificateEntity } from '../course/course-certificate.entity';
import { CourseSectionWatchProgressEntity } from '../course/course-section-watch-progress.entity';
import { CourseModule } from '../course/courses.module';
import { CorporateService } from './corporate.service';
import { CorporateController } from './corporate.controller';

@Module({
  imports: [
    CourseModule,
    TypeOrmModule.forFeature([
      UserEntity,
      ProgramEntity,
      CourseEntity,
      CourseCertificateEntity,
      CourseSectionWatchProgressEntity,
    ]),
  ],
  controllers: [CorporateController],
  providers: [CorporateService],
  exports: [CorporateService],
})
export class CorporateModule {}
