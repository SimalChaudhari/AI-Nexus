import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { CommentEntity } from './comments.entity';
import { UserEntity } from '../user/users.entity';

@Entity('announcements')
export class AnnouncementEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text' })
    description!: string;

    @Column({ type: 'int', default: 0 })
    viewCount!: number;

    @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'createdById' })
    createdBy!: UserEntity | null;

    @Column({ type: 'uuid', nullable: true })
    createdById!: string | null;

    @OneToMany(() => CommentEntity, (comment) => comment.announcement, { cascade: true })
    comments!: CommentEntity[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
