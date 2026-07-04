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
import { SpotlightrService } from '../service/spotlightr.service';
import { VideoDurationService } from '../service/video-duration.service';
import { CourseGroupEntity } from './course-group.entity';
import { CourseQuestionBankEntity } from './course-question-bank.entity';
import { CourseQuestionBankService } from './course-question-bank.service';
import { CourseQuestionBankInitService } from './course-question-bank-init.service';
import { CourseQuestionBankAttemptEntity } from './course-question-bank-attempt.entity';
import { CourseQuestionBankAttemptInitService } from './course-question-bank-attempt-init.service';
import { CourseQuestionAssignmentSubmissionEntity } from './course-question-assignment-submission.entity';
import { CourseQuestionAssignmentInitService } from './course-question-assignment-init.service';
import { AssessmentEvaluationModule } from '../assessment-evaluation/assessment-evaluation.module';
import { CourseAssignmentGradingService } from './course-assignment-grading.service';
import { AssignmentGradingRouterService } from './assignment-grading-router.service';
import { SpeakerModule } from '../speaker/speaker.module';
import { LanguageModule } from '../language/language.module';
import { ReviewModule } from '../review/review.module';
import { CourseCertificateEntity } from './course-certificate.entity';
import { CourseCertificateService } from './course-certificate.service';
import { CourseQuizAssessmentProgressService } from './course-quiz-assessment-progress.service';
import { CourseCertificateInitService } from './course-certificate-init.service';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { CategoryEntity } from '../category/categories.entity';
import { CourseOptionEntity } from './course-option.entity';
import { CourseOptionInitService } from './course-option-init.service';
import { ReviewEntity } from '../review/review.entity';
@Module({
    imports: [
        SpeakerModule,
        LanguageModule,
        ReviewModule,
        AppSettingsModule,
        AssessmentEvaluationModule,
        TypeOrmModule.forFeature([CourseEntity, CourseGroupEntity, CourseModuleEntity, CourseModuleSectionEntity, CourseWatchProgressEntity, CourseSectionWatchProgressEntity, CourseFavoriteEntity, CourseSectionFavoriteEntity, CourseEnrollmentEntity, UserEntity, CourseQuestionBankEntity, CourseQuestionBankAttemptEntity, CourseQuestionAssignmentSubmissionEntity, CourseCertificateEntity, CategoryEntity, CourseOptionEntity, ReviewEntity]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
    ],
    providers: [CourseService, CourseModuleService, CourseModuleSectionService, CourseWatchProgressService, CourseSectionWatchProgressService, CourseFavoriteService, CourseSectionFavoriteService, CourseEnrollmentService, CourseQuestionBankService, CourseAssignmentGradingService, AssignmentGradingRouterService, CourseQuizAssessmentProgressService, CourseCertificateService, CoursesInitService, CourseModuleInitService, CourseModuleSectionInitService, CourseWatchProgressInitService, CourseSectionWatchProgressInitService, CourseEnrollmentInitService, CourseQuestionBankInitService, CourseQuestionBankAttemptInitService, CourseQuestionAssignmentInitService, CourseCertificateInitService, CourseOptionInitService, LocalStorageService, SpotlightrService, VideoDurationService],
    controllers: [CourseController],
    exports: [CourseService, CourseModuleService, CourseModuleSectionService, CourseWatchProgressService, CourseSectionWatchProgressService, CourseFavoriteService, CourseSectionFavoriteService, CourseEnrollmentService, CourseQuestionBankService, CourseQuizAssessmentProgressService, CourseCertificateService],
})
export class CourseModule {}

