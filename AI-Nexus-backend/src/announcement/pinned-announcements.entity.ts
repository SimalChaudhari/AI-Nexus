import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { AnnouncementEntity } from './announcements.entity';
import { UserEntity } from '../user/users.entity';

@Entity('pinned_announcements')
@Unique(['userId', 'announcementId'])
export class PinnedAnnouncementEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: UserEntity;

    @Column({ type: 'uuid' })
    userId!: string;

    @ManyToOne(() => AnnouncementEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'announcementId' })
    announcement!: AnnouncementEntity;

    @Column({ type: 'uuid' })
    announcementId!: string;

    @CreateDateColumn({ type: 'timestamp' })
    pinnedAt!: Date;
}
