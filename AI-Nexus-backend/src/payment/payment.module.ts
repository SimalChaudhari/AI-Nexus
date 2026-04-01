import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { WooshPayService } from './wooshpay.service';
import { PaymentReferenceEntity } from './payment-reference.entity';
import { PaymentReferenceService } from './payment-reference.service';
import { PaymentReferenceInitService } from './payment-reference-init.service';
import { CourseModule } from '../course/courses.module';
import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/users.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentReferenceEntity]),
    UserModule,
    CourseModule,
    OrderModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [PaymentController],
  providers: [WooshPayService, PaymentReferenceService, PaymentReferenceInitService],
})
export class PaymentModule {}
