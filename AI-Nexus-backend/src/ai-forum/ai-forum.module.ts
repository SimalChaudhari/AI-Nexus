import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiForumService } from './ai-forum.service';
import { AiForumController } from './ai-forum.controller';
import { AiForumInitService } from './ai-forum-init.service';
import { AiForumCommentsGateway } from './ai-forum-comments.gateway';
import { AiForumEntity } from './ai-forum.entity';
import { AiForumCommentEntity } from './ai-forum-comments.entity';
import { AiForumCommentLikeEntity } from './ai-forum-comment-likes.entity';
import { PinnedAiForumEntity } from './pinned-ai-forum.entity';
import { UserEntity } from '../user/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { OptionalJwtAuthGuard } from '../jwt/optional-jwt-auth.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([AiForumEntity, AiForumCommentEntity, AiForumCommentLikeEntity, PinnedAiForumEntity, UserEntity]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: {},
        }),
    ],
    providers: [AiForumService, AiForumInitService, AiForumCommentsGateway, OptionalJwtAuthGuard],
    controllers: [AiForumController],
    exports: [AiForumService],
})
export class AiForumModule {}

