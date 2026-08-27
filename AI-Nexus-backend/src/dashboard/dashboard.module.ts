import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { OrderEntity } from '../order/order.entity';
import { ReviewEntity } from '../review/review.entity';
import { CourseEnrollmentEntity } from '../course/course-enrollment.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { CourseSectionWatchProgressEntity } from '../course/course-section-watch-progress.entity';
import { ProgramEntity } from '../program/programs.entity';
import { CourseCertificateEntity } from '../course/course-certificate.entity';
import { CourseModule } from '../course/courses.module';
import { DashboardService } from './dashboard.service';
import { OverallGrowthService } from './overall-growth.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      CourseEntity,
      OrderEntity,
      ReviewEntity,
      CourseEnrollmentEntity,
      CourseModuleEntity,
      CourseModuleSectionEntity,
      CourseSectionWatchProgressEntity,
      ProgramEntity,
      CourseCertificateEntity,
    ]),
    CourseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, OverallGrowthService],
  exports: [DashboardService, OverallGrowthService],
})
export class DashboardModule {}
