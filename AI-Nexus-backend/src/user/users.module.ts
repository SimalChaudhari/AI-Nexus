//users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './users.service';
import { UserController } from './users.controller';
import { AdminController } from './admin.controller';
import { UserEntity } from './users.entity';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from '../service/email.service';
import { PaginationService } from '../common/pagination/pagination.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
    ],
    providers: [UserService, EmailService, PaginationService],
    controllers: [UserController, AdminController],
    exports: [UserService],
})
export class UserModule {}

