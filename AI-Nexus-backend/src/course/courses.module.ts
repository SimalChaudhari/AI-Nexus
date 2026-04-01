//courses.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseService } from './courses.service';
import { CourseController } from './courses.controller';
import { CoursesInitService } from './courses-init.service';
import { CourseEntity } from './courses.entity';
import { CourseModuleEntity } from './course-module.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';
import { CourseModuleService } from './course-module.service';
import { CourseModuleSectionService } from './course-module-section.service';
import { CourseModuleInitService } from './course-module-init.service';
import { CourseModuleSectionInitService } from './course-module-section-init.service';
import { UserEntity } from '../user/users.entity';
import { CourseFavoriteEntity } from './course-favorite.entity';
import { CourseFavoriteService } from './course-favorite.service';
import { CourseSectionFavoriteEntity } from './course-section-favorite.entity';
import { CourseSectionFavoriteService } from './course-section-favorite.service';
import { CourseEnrollmentEntity } from './course-enrollment.entity';
import { CourseEnrollmentService } from './course-enrollment.service';
import { CourseEnrollmentInitService } from './course-enrollment-init.service';
import { CourseWatchProgressEntity } from './course-watch-progress.entity';
import { CourseWatchProgressService } from './course-watch-progress.service';
import { CourseWatchProgressInitService } from './course-watch-progress-init.service';
import { CourseSectionWatchProgressEntity } from './course-section-watch-progress.entity';
import { CourseSectionWatchProgressService } from './course-section-watch-progress.service';
import { CourseSectionWatchProgressInitService } from './course-section-watch-progress-init.service';
import { JwtModule } from '@nestjs/jwt';
import { LocalStorageService } from '../service/local-storage.service';
import { CourseGroupEntity } from './course-group.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([CourseEntity, CourseGroupEntity, CourseModuleEntity, CourseModuleSectionEntity, CourseWatchProgressEntity, CourseSectionWatchProgressEntity, CourseFavoriteEntity, CourseSectionFavoriteEntity, CourseEnrollmentEntity, UserEntity]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
    ],
    providers: [CourseService, CourseModuleService, CourseModuleSectionService, CourseWatchProgressService, CourseSectionWatchProgressService, CourseFavoriteService, CourseSectionFavoriteService, CourseEnrollmentService, CoursesInitService, CourseModuleInitService, CourseModuleSectionInitService, CourseWatchProgressInitService, CourseSectionWatchProgressInitService, CourseEnrollmentInitService, LocalStorageService],
    controllers: [CourseController],
    exports: [CourseService, CourseModuleService, CourseModuleSectionService, CourseWatchProgressService, CourseSectionWatchProgressService, CourseFavoriteService, CourseSectionFavoriteService, CourseEnrollmentService],
})
export class CourseModule {}

