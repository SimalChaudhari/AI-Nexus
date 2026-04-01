import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementService } from './announcements.service';
import { AnnouncementController } from './announcements.controller';
import { AnnouncementsInitService } from './announcements-init.service';
import { AnnouncementCommentsGateway } from './announcement-comments.gateway';
import { AnnouncementEntity } from './announcements.entity';
import { CommentEntity } from './comments.entity';
import { CommentLikeEntity } from './comment-likes.entity';
import { PinnedAnnouncementEntity } from './pinned-announcements.entity';
import { UserEntity } from '../user/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';
import { LocalStorageModule } from '../service/local-storage.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AnnouncementEntity, CommentEntity, CommentLikeEntity, PinnedAnnouncementEntity, UserEntity]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
        LocalStorageModule,
    ],
    providers: [AnnouncementService, AnnouncementsInitService, AnnouncementCommentsGateway, OptionalJwtAuthGuard],
    controllers: [AnnouncementController],
    exports: [AnnouncementService],
})
export class AnnouncementModule {}
