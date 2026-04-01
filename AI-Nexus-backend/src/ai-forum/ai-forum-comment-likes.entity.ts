import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AiForumCommentEntity } from './ai-forum-comments.entity';
import { UserEntity } from '../user/users.entity';

@Entity('post_comment_likes')
@Unique(['userId', 'commentId'])
export class AiForumCommentLikeEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => AiForumCommentEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'commentId' })
    comment!: AiForumCommentEntity;

    @Column({ type: 'uuid' })
    commentId!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: UserEntity;

    @Column({ type: 'uuid' })
    userId!: string;
}

