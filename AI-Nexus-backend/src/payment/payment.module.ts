import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentReferenceEntity, PaymentEntity]),
    UserModule,
    AuthModule,
    CourseModule,
    OrderModule,
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
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
