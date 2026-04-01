//categories.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryService } from './categories.service';
import { CategoryController } from './categories.controller';
import { CategoriesInitService } from './categories-init.service';
import { CategoryEntity } from './categories.entity';
import { UserEntity } from '../user/users.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        TypeOrmModule.forFeature([CategoryEntity, UserEntity]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
    ],
    providers: [CategoryService, CategoriesInitService],
    controllers: [CategoryController],
    exports: [CategoryService],
})
export class CategoryModule {}

