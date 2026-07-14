import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { UserEntity } from '../user/users.entity';
import { ProgramEntity } from '../program/programs.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseCertificateEntity } from '../course/course-certificate.entity';
import { CourseSectionWatchProgressEntity } from '../course/course-section-watch-progress.entity';
import { CourseModule } from '../course/courses.module';
import { CorporateService } from './corporate.service';
import { CorporateController } from './corporate.controller';
import { CorporateDemoSeedService } from './corporate-demo-seed.service';

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
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [CorporateController],
  providers: [CorporateService, CorporateDemoSeedService],
  exports: [CorporateService],
})
export class CorporateModule {}
