import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AiForumCommentEntity } from './ai-forum-comments.entity';

@Entity('posts')
export class AiForumEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text' })
    description!: string;

    /** Optional: set when a logged-in user creates the post */
    @Column({ type: 'uuid', nullable: true })
    userId!: string | null;

    @Column({ type: 'int', default: 0 })
    viewCount!: number;

    @OneToMany(() => AiForumCommentEntity, (comment) => comment.post, { cascade: true })
    comments!: AiForumCommentEntity[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

