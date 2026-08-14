import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { NotificationEntity } from './notification.entity';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { UserEntity } from '../user/users.entity';
import { NotificationService } from './notification.service';
import { PushService } from './push.service';
import { NotificationController } from './notification.controller';
import { NotificationInitService } from './notification-init.service';
import { NotificationGateway } from './notification.gateway';
import { EmailService } from '../service/email.service';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, PushSubscriptionEntity, UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
    AppSettingsModule,
  ],
  providers: [NotificationService, PushService, NotificationInitService, NotificationGateway, EmailService],
  controllers: [NotificationController],
  exports: [NotificationService, PushService],
})
export class NotificationModule {}
