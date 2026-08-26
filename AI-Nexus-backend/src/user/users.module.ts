//users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { AdminController } from './admin.controller';
import { UserEntity } from './users.entity';
import { UsersInitService } from './users-init.service';
import { LocalStorageModule } from '../service/local-storage.module';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from '../service/email.service';
import { PaginationService } from '../common/pagination/pagination.service';
import { AuthModule } from '../auth/auth.module';
import { SsoModule } from '../auth/sso.module';
import { CourseModule } from '../course/courses.module';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { LlmModule } from '../llm/llm.module';
import { AdminEnrolmentService } from './admin-enrolment.service';
import { EnrolmentAiModule } from './enrolment-ai.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        LocalStorageModule,
        AuthModule,
        SsoModule,
        forwardRef(() => CourseModule),
        AppSettingsModule,
        LlmModule,
        EnrolmentAiModule,
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
    ],
    providers: [UserService, UsersInitService, EmailService, PaginationService, AdminEnrolmentService],
    controllers: [UserController, AdminController],
    exports: [UserService],
})
export class UserModule {}

