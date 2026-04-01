import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CartEntity } from './cart.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartInitService } from './cart-init.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {},
    }),
  ],
  controllers: [CartController],
  providers: [CartService, CartInitService],
  exports: [CartService],
})
export class CartModule {}
