import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AiForumEntity } from './ai-forum.entity';
import { UserEntity } from '../user/users.entity';

@Entity('pinned_posts')
@Unique(['userId', 'postId'])
export class PinnedAiForumEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: UserEntity;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => AiForumEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'postId' })
    post!: AiForumEntity;

    @Column({ type: 'uuid' })
    postId!: string;

    @CreateDateColumn({ type: 'timestamp' })
    pinnedAt!: Date;
}

