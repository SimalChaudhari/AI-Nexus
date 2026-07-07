import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramService } from './programs.service';
import { ProgramController } from './programs.controller';
import { ProgramsInitService } from './programs-init.service';
import { ProgramEntity } from './programs.entity';
import { CategoryEntity } from '../category/categories.entity';
import { CourseEntity } from '../course/courses.entity';
import { UserEntity } from '../user/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { PaginationService } from '../common/pagination/pagination.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([ProgramEntity, CategoryEntity, CourseEntity, UserEntity]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
    ],
    providers: [ProgramService, ProgramsInitService, PaginationService],
    controllers: [ProgramController],
    exports: [ProgramService],
})
export class ProgramModule {}
