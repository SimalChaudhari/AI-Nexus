import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { WooshPayService } from './wooshpay.service';
import { PaymentEntity } from './payment.entity';
import { PaymentService } from './payment.service';
import { PaymentInitService } from './payment-init.service';
import { PaymentReferenceEntity } from './payment-reference.entity';
import { PaymentReferenceService } from './payment-reference.service';
import { PaymentReferenceInitService } from './payment-reference-init.service';
import { CourseModule } from '../course/courses.module';
import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { AffiliateModule } from '../affiliate/affiliate.module';
import { AffiliateSaleEntity } from '../affiliate/affiliate-sale.entity';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { PaginationService } from '../common/pagination/pagination.service';
import { UserEntity } from '../user/users.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentReferenceEntity,
      PaymentEntity,
      AffiliateSaleEntity,
      UserEntity,
    ]),
    UserModule,
    AuthModule,
    CourseModule,
    OrderModule,
    AppSettingsModule,
    forwardRef(() => AffiliateModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [PaymentController],
  providers: [
    WooshPayService,
    PaymentService,
    PaymentInitService,
    PaymentReferenceService,
    PaymentReferenceInitService,
    PaginationService,
  ],
  exports: [PaymentService, WooshPayService, PaymentReferenceService],
})
export class PaymentModule {}
