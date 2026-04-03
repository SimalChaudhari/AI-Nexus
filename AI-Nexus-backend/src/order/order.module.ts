import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderEntity } from './order.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderInitService } from './order-init.service';
import { UserEntity } from '../user/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { AppSettingsEntity } from '../app-settings/app-settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, UserEntity, AppSettingsEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [OrderController],
  providers: [OrderService, OrderInitService],
  exports: [OrderService],
})
export class OrderModule {}
