import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserEntity } from '../user/users.entity';
import { CompanyEnrollmentInviteEntity } from './company-enrollment-invite.entity';
import { CompanyEnrollmentService } from './company-enrollment.service';
import { CompanyEnrollmentController } from './company-enrollment.controller';
import { CompanyEnrollmentInitService } from './company-enrollment-init.service';
import { PaginationService } from '../common/pagination/pagination.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyEnrollmentInviteEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [CompanyEnrollmentController],
  providers: [CompanyEnrollmentService, CompanyEnrollmentInitService, PaginationService],
  exports: [CompanyEnrollmentService],
})
export class CompanyEnrollmentModule {}
