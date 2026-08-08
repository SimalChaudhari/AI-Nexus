import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IntlAuthModule } from '../intl-auth/intl-auth.module';
import { InternationalUserEntity } from '../intl-auth/international-user.entity';
import { UserEntity } from '../user/users.entity';
import { PaymentModule } from '../payment/payment.module';
import { IntlPaymentController } from './intl-payment.controller';
import { IntlPaymentInitService } from './intl-payment-init.service';
import { IntlPaymentService } from './intl-payment.service';
import { IntlFxService } from './intl-fx.service';
import { InternationalPaymentEntity } from './international-payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InternationalPaymentEntity, InternationalUserEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
    PaymentModule,
    forwardRef(() => IntlAuthModule),
  ],
  controllers: [IntlPaymentController],
  providers: [IntlPaymentService, IntlPaymentInitService, IntlFxService],
  exports: [IntlPaymentService],
})
export class IntlPaymentModule {}
