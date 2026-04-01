import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagService } from './tags.service';
import { TagController } from './tags.controller';
import { TagsInitService } from './tags-init.service';
import { TagEntity } from './tags.entity';
import { UserEntity } from '../user/users.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [
        TypeOrmModule.forFeature([TagEntity, UserEntity]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
    ],
    providers: [TagService, TagsInitService],
    controllers: [TagController],
    exports: [TagService],
})
export class TagModule {}

