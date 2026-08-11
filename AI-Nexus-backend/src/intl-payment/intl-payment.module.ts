import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AffiliateModule } from '../affiliate/affiliate.module';
import { IntlAuthModule } from '../intl-auth/intl-auth.module';
import { InternationalUserEntity } from '../intl-auth/international-user.entity';
import { PaymentModule } from '../payment/payment.module';
import { UserEntity } from '../user/users.entity';
import { IntlPaymentController } from './intl-payment.controller';
import { IntlPaymentInitService } from './intl-payment-init.service';
import { IntlPaymentService } from './intl-payment.service';
import { IntlFxService } from './intl-fx.service';
import { InternationalPaymentEntity } from './international-payment.entity';
import { IntlMembershipSettingsEntity } from './intl-membership-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InternationalPaymentEntity,
      InternationalUserEntity,
      IntlMembershipSettingsEntity,
      UserEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
    PaymentModule,
    forwardRef(() => AffiliateModule),
    forwardRef(() => IntlAuthModule),
  ],
  controllers: [IntlPaymentController],
  providers: [IntlPaymentService, IntlPaymentInitService, IntlFxService],
  exports: [IntlPaymentService],
})
export class IntlPaymentModule {}
