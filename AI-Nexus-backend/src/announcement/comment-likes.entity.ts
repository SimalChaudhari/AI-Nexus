import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { CommentEntity } from './comments.entity';
import { UserEntity } from '../user/users.entity';

@Entity('comment_likes')
@Unique(['userId', 'commentId'])
export class CommentLikeEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => CommentEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'commentId' })
    comment!: CommentEntity;

    @Column({ type: 'uuid' })
    commentId!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: UserEntity;

    @Column({ type: 'uuid' })
    userId!: string;
}
