import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AiForumEntity } from './ai-forum.entity';
import { UserEntity } from '../user/users.entity';

@Entity('post_comments')
export class AiForumCommentEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'text' })
    content!: string;

    @ManyToOne(() => AiForumEntity, (post) => post.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post!: AiForumEntity;

    @Column({ type: 'uuid' })
    postId!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: UserEntity;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => AiForumCommentEntity, (comment) => comment.replies, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'parentCommentId' })
    parentComment!: AiForumCommentEntity | null;

    @Column({ type: 'uuid', nullable: true })
    parentCommentId!: string | null;

    @OneToMany(() => AiForumCommentEntity, (comment) => comment.parentComment)
    replies!: AiForumCommentEntity[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

