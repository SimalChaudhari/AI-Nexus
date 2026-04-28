import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CartEntity } from './cart.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartInitService } from './cart-init.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartEntity, CourseEntity, CourseModuleEntity, CourseModuleSectionEntity]),
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
