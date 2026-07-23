import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { UserEntity } from '../user/users.entity';
import { ProgramEntity } from '../program/programs.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseCertificateEntity } from '../course/course-certificate.entity';
import { CourseSectionWatchProgressEntity } from '../course/course-section-watch-progress.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { CourseModule } from '../course/courses.module';
import { EmailService } from '../service/email.service';
import { CorporateService } from './corporate.service';
import { CorporateController } from './corporate.controller';
import { CorporateDemoSeedService } from './corporate-demo-seed.service';
import { CorporateLearnerNudgeEntity } from './corporate-learner-nudge.entity';
import { CorporateLearnerNudgeInitService } from './corporate-learner-nudge-init.service';
import { CorporateNudgeCampaignEntity } from './corporate-nudge-campaign.entity';
import { CorporateNudgeEmailLogEntity } from './corporate-nudge-email-log.entity';
import { CorporateBulkEnrolmentUploadEntity } from './corporate-bulk-enrolment-upload.entity';
import { CorporateStaffEnrolBatchEntity } from './corporate-staff-enrol-batch.entity';
import { SsoModule } from '../auth/sso.module';
import { CompanyEnrollmentModule } from '../company-enrollment/company-enrollment.module';

@Module({
  imports: [
    CourseModule,
    SsoModule,
    CompanyEnrollmentModule,
    TypeOrmModule.forFeature([
      UserEntity,
      ProgramEntity,
      CourseEntity,
      CourseCertificateEntity,
      CourseSectionWatchProgressEntity,
      CourseModuleEntity,
      CourseModuleSectionEntity,
      CorporateLearnerNudgeEntity,
      CorporateNudgeCampaignEntity,
      CorporateNudgeEmailLogEntity,
      CorporateBulkEnrolmentUploadEntity,
      CorporateStaffEnrolBatchEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [CorporateController],
  providers: [
    CorporateService,
    CorporateDemoSeedService,
    CorporateLearnerNudgeInitService,
    EmailService,
  ],
  exports: [CorporateService],
})
export class CorporateModule {}
