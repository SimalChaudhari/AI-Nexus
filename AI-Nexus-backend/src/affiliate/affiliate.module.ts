import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { OrderModule } from '../order/order.module';
import { PaymentModule } from '../payment/payment.module';
import { IntlPaymentModule } from '../intl-payment/intl-payment.module';
import { UserEntity } from '../user/users.entity';
import { AffiliateClickEntity } from './affiliate-click.entity';
import { AffiliateCodeEntity } from './affiliate-code.entity';
import { AffiliateController } from './affiliate.controller';
import { AffiliateInitService } from './affiliate-init.service';
import { AffiliateSaleEntity } from './affiliate-sale.entity';
import { AffiliateService } from './affiliate.service';
import { VoucherCodeEntity } from './voucher-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AffiliateCodeEntity,
      VoucherCodeEntity,
      AffiliateClickEntity,
      AffiliateSaleEntity,
      UserEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
    forwardRef(() => PaymentModule),
    forwardRef(() => IntlPaymentModule),
    AppSettingsModule,
    OrderModule,
  ],
  controllers: [AffiliateController],
  providers: [AffiliateService, AffiliateInitService],
  exports: [AffiliateService],
})
export class AffiliateModule {}
